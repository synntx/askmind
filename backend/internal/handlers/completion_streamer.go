package handlers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/synntx/askmind/internal/llm"
	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/service"
	"go.uber.org/zap"
)

type CompletionStreamHandler struct {
	ms     service.MessageService
	llm    llm.LLM
	logger *zap.Logger
}

func NewCompletionStreamHandler(ms service.MessageService, logger *zap.Logger, llm llm.LLM) *CompletionStreamHandler {
	return &CompletionStreamHandler{
		ms:     ms,
		llm:    llm,
		logger: logger,
	}
}

func (csh *CompletionStreamHandler) HandleCompletionStream(
	ctx context.Context,
	convID uuid.UUID,
	userMessage string,
	model string,
	streamer *SSEStreamer,
) error {
	// NOTE: 1. Create User Message (already done in handler in the original code, keep it there for now or move here)

	// 2. Generate Assistant Message ID and Initial SSE Events
	assistantMessageID := uuid.New().String()
	fmt.Printf("Assistant message ID: %s\n", assistantMessageID)

	// Send delta_encoding event
	if err := streamer.SendEvent("delta_encoding", "\"v1\""); err != nil {
		return err
	}

	initialMessage := map[string]any{
		"p": "",
		"o": "add",
		"v": map[string]any{
			"message": map[string]any{
				"id": assistantMessageID,
				"author": map[string]any{
					"role":     "assistant",
					"name":     nil,
					"metadata": map[string]any{},
				},
				"create_time": float64(time.Now().Unix()) + float64(time.Now().Nanosecond())/1e9,
				"update_time": nil,
				"content": map[string]any{
					"content_type": "text",
					"parts":        []string{""},
				},
				"status":   "in_progress",
				"end_turn": nil,
				"weight":   1.0,
				"metadata": map[string]any{
					"citations":          []any{},
					"content_references": []any{},
					"message_type":       "next",
					"model_slug":         model,
					"tool_call":          []any{},
				},
				"recipient": "all",
				"channel":   nil,
			},
			"conversation_id": convID.String(),
			"error":           nil,
		},
		"c": 0,
	}
	if err := streamer.SendDeltaEvent(initialMessage); err != nil {
		return err
	}

	resp := csh.llm.GenerateContentStream(ctx, userMessage)

	var completeRespStr string
	for chunk := range resp {
		if chunk.Err != nil {
			csh.logger.Error("Error in LLM stream", zap.Error(chunk.Err))
			csh.handleLLMStreamError(ctx, streamer, convID.String(), model, chunk.Err)
			return nil
		}

		if chunk.ToolInfo != nil {
			csh.logger.Debug("Tool result", zap.Any("result", chunk.ToolInfo))
			deltaEvent := map[string]any{
				"p": "/message/metadata/tool_call",
				"o": "append",
				"v": map[string]any{
					"name":   chunk.ToolInfo.Name,
					"result": chunk.ToolInfo.Result,
				},
			}

			if err := streamer.SendDeltaEvent(deltaEvent); err != nil {
				csh.handleStreamingError(streamer, convID.String())
				return nil
			}

		} else {
			select {
			case <-ctx.Done():
				if ctx.Err() == context.DeadlineExceeded {
					csh.handleTimeoutError(streamer, convID.String())
				} else {
					csh.logger.Info("stream cancelled by client", zap.String("conv_id", convID.String()))
				}
				return ctx.Err()
			default:
				completeRespStr += chunk.Content

				deltaEvent := map[string]any{
					"p": "/message/content/parts/0",
					"o": "append",
					"v": chunk.Content,
				}
				if err := streamer.SendDeltaEvent(deltaEvent); err != nil {
					csh.handleStreamingError(streamer, convID.String())
					return nil
				}
			}

		}
	}

	finalDelta := map[string]any{
		"p": "",
		"o": "patch",
		"v": []map[string]any{
			{
				"p": "/message/status",
				"o": "replace",
				"v": "finished_successfully",
			},
			{
				"p": "/message/end_turn",
				"o": "replace",
				"v": true,
			},
			{
				"p": "/message/metadata",
				"o": "append",
				"v": map[string]any{
					"finish_details": map[string]any{
						"type":        "stop",
						"stop_tokens": []int{200002}, // TODO: stop token, adjust as needed for model
					},
					"is_complete": true,
				},
			},
		},
	}
	if err := streamer.SendDeltaEvent(finalDelta); err != nil {
		return err
	}

	completionData := map[string]any{
		"type":            "message_stream_complete",
		"conversation_id": convID.String(),
	}
	if err := streamer.SendCompletionEvent(completionData); err != nil {
		return err
	}

	// 5. Save Assistant Message to DB
	assistantMessage := &models.CreateMessageRequest{
		ConversationId: convID,
		Role:           models.RoleAssistant,
		Content:        completeRespStr,
		Model:          model,
	}
	if err := csh.ms.CreateMessage(context.Background(), assistantMessage); err != nil {
		csh.handleSaveError(streamer, convID.String())
		return nil
	}

	csh.logger.Info("stream completed successfully for conv_id", zap.String("conv_id", convID.String()))
	return nil
}

// --- Error Handling Helper Functions ---

func (csh *CompletionStreamHandler) handleLLMStreamError(ctx context.Context, streamer *SSEStreamer, convIDStr string, model string, llmErr error) {
	csh.logger.Error("error creating stream content: ", zap.String("Error", llmErr.Error()))

	errorDetails := map[string]any{
		"conv_id": convIDStr,
		"model":   model,
	}

	errorType := "generation_failed"
	errorMessage := "Failed to generate response"

	if strings.Contains(llmErr.Error(), "rate_limit_exceeded") {
		errorType = "rate_limit_exceeded"
		errorMessage = "Rate limit exceeded. Please try again in a moment."
		errorDetails["recovery_suggestions"] = []string{
			"Wait a few seconds before trying again",
			"You may have sent too many requests in a short time",
			"Consider using a different model if available",
		}
	} else if strings.Contains(llmErr.Error(), "empty_response") {
		errorType = "empty_response"
		errorMessage = "The model returned an empty response."
	}

	assistantErrorMessage := &models.CreateMessageRequest{
		ConversationId: uuid.MustParse(convIDStr), // Using MustParse as convIDStr is already validated
		Role:           models.RoleError,
		Content:        errorMessage,
		Model:          model,
	}
	// use context.background if needed
	if err := csh.ms.CreateMessage(ctx, assistantErrorMessage); err != nil {
		csh.logger.Error("error saving assistant message: ", zap.String("Error", err.Error()))
		errorDetails["save_failed"] = true
		errorDetails["recovery_suggestions"] = []string{
			"Your response was generated but couldn't be saved",
			"You may need to refresh the page to see recent messages",
		}
		streamer.SendErrorEvent("save_error", "Response was generated but could not be saved", errorDetails)
		return
	}

	streamer.SendErrorEvent(errorType, errorMessage, errorDetails)
}

func (csh *CompletionStreamHandler) handleTimeoutError(streamer *SSEStreamer, convIDStr string) {
	csh.logger.Info("request timed out", zap.String("conv_id", convIDStr))
	errorDetails := map[string]any{
		"conv_id": convIDStr,
		"timeout": true,
		"recovery_suggestions": []string{
			"The model took too long to respond",
			"Try asking a shorter or simpler question",
		},
	}
	streamer.SendErrorEvent("timeout", "Response generation timed out", errorDetails)
}

func (csh *CompletionStreamHandler) handleStreamingError(streamer *SSEStreamer, convIDStr string) {
	csh.logger.Error("error processing chunk during streaming", zap.String("conv_id", convIDStr))
	errorDetails := map[string]any{
		"conv_id":   convIDStr,
		"streaming": true,
	}
	streamer.SendErrorEvent("stream_error", "Error during response streaming", errorDetails)
}

func (csh *CompletionStreamHandler) handleSaveError(streamer *SSEStreamer, convIDStr string) {
	csh.logger.Error("error saving assistant message after completion", zap.String("conv_id", convIDStr))
	errorDetails := map[string]any{
		"conv_id":     convIDStr,
		"save_failed": true,
		"recovery_suggestions": []string{
			"Your response was generated but couldn't be saved",
			"You may need to refresh the page to see recent messages",
		},
	}
	streamer.SendErrorEvent("save_error", "Response was generated but could not be saved", errorDetails)
}
