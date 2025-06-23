package handlers

import (
	"context"
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
	convIDStr := convID.String()
	assistantMessageID := uuid.New().String()

	if err := csh.sendInitialEvents(streamer, convIDStr, assistantMessageID, model); err != nil {
		csh.logger.Error("Failed to send initial SSE events", zap.Error(err), zap.String("conv_id", convIDStr))
		return err
	}

	convMessages, err := csh.ms.GetConversationMessages(ctx, convIDStr)
	if err != nil {
		csh.logger.Error("Failed to get conversation messages", zap.Error(err), zap.String("conv_id", convIDStr))
		details := map[string]any{"conversation_id": convIDStr}
		csh.sendStreamError(streamer, "history_fetch_failed", "Could not retrieve conversation history.", details)
		return err
	}

	fullResponse, err := csh.processLLMStream(ctx, streamer, convMessages, userMessage)
	if err != nil {
		csh.logger.Error("Error during LLM stream processing", zap.Error(err), zap.String("conv_id", convIDStr))
		return err
	}

	if err := csh.sendFinalEvents(streamer, convIDStr); err != nil {
		return err
	}

	if err := csh.saveAssistantMessage(convID, fullResponse, model); err != nil {
		details := map[string]any{"conversation_id": convIDStr, "save_failed": true}
		csh.sendStreamError(streamer, "save_error", "Response was generated but could not be saved.", details)
		return nil
	}

	csh.logger.Info("Stream completed successfully", zap.String("conv_id", convIDStr))
	return nil
}

func (csh *CompletionStreamHandler) sendInitialEvents(streamer *SSEStreamer, convID, assistantMsgID, model string) error {
	if err := streamer.Send(EventDeltaEncoding, `"v1"`); err != nil {
		return err
	}
	initialPayload := NewInitialMessagePayload(convID, assistantMsgID, model)
	return streamer.Send(EventDelta, initialPayload)
}

func (csh *CompletionStreamHandler) processLLMStream(ctx context.Context, streamer *SSEStreamer, history []models.ChatMessage, userMessage string) (string, error) {
	respStream := csh.llm.GenerateContentStream(ctx, history, userMessage)
	var responseBuilder strings.Builder

	for {
		select {
		case <-ctx.Done():
			csh.logger.Warn("Context cancelled by client", zap.Error(ctx.Err()))
			details := map[string]any{"reason": "client_disconnected"}
			csh.sendStreamError(streamer, "stream_cancelled", "Stream cancelled by client.", details)
			return responseBuilder.String(), ctx.Err()
		case chunk, ok := <-respStream:
			if !ok {
				return responseBuilder.String(), nil
			}
			if chunk.Err != nil {
				csh.handleLLMError(streamer, chunk.Err)
				return responseBuilder.String(), chunk.Err
			}

			if chunk.Content != "" {
				responseBuilder.WriteString(chunk.Content)
				contentDelta := DeltaPayload{
					Path:      PathMessageContentPart,
					Operation: PatchOpAppend,
					Value:     chunk.Content,
				}
				if err := streamer.Send(EventDelta, contentDelta); err != nil {
					return responseBuilder.String(), err
				}
			}

			if chunk.ToolInfo != nil && chunk.ToolInfo.Status == llm.StatusEnd {
				toolDelta := DeltaPayload{
					Path:      PathMessageMetadataTC,
					Operation: PatchOpAppend,
					Value: map[string]any{
						"name":   chunk.ToolInfo.Name,
						"result": chunk.ToolInfo.Result,
						"status": chunk.ToolInfo.Status,
					},
				}
				if err := streamer.Send(EventDelta, toolDelta); err != nil {
					return responseBuilder.String(), err
				}
			}
		}
	}
}

func (csh *CompletionStreamHandler) sendFinalEvents(streamer *SSEStreamer, convIDStr string) error {
	isComplete := true
	finalPatches := DeltaPayload{
		Path:      "",
		Operation: PatchOpPatch,
		Value: []PatchOperation{
			{Path: PathMessageStatus, Operation: PatchOpReplace, Value: "finished_successfully"},
			{Path: PathMessageEndTurn, Operation: PatchOpReplace, Value: true},
			{Path: PathMessageMetadata, Operation: PatchOpAppend, Value: map[string]any{
				"finish_details": FinishDetails{Type: "stop", StopTokens: []int{200002}},
				"is_complete":    &isComplete,
			}},
		},
	}
	if err := streamer.Send(EventDelta, finalPatches); err != nil {
		return err
	}

	completionData := CompletionData{Type: "message_stream_complete", ConversationID: convIDStr}
	return streamer.Send(EventCompletion, completionData)
}

func (csh *CompletionStreamHandler) saveAssistantMessage(convID uuid.UUID, content, model string) error {
	if content == "" {
		csh.logger.Warn("Skipping save for empty assistant message", zap.String("conv_id", convID.String()))
		return nil
	}
	assistantMessage := &models.CreateMessageRequest{
		ConversationId: convID,
		Role:           models.RoleAssistant,
		Content:        content,
		Model:          model,
	}
	saveCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := csh.ms.CreateMessage(saveCtx, assistantMessage); err != nil {
		csh.logger.Error("Failed to save assistant message", zap.Error(err), zap.String("conv_id", convID.String()))
		return err
	}
	return nil
}

func (csh *CompletionStreamHandler) handleLLMError(streamer *SSEStreamer, llmErr error) {
	csh.logger.Error("LLM stream returned an error", zap.Error(llmErr))
	errorType := "generation_error"
	errorMessage := "The model failed to generate a response."
	if strings.Contains(llmErr.Error(), "rate_limit_exceeded") {
		errorType = "rate_limit_exceeded"
		errorMessage = "Rate limit exceeded. Please try again in a moment."
	}
	details := map[string]any{"original_error": llmErr.Error()}
	csh.sendStreamError(streamer, errorType, errorMessage, details)
}

func (csh *CompletionStreamHandler) sendStreamError(streamer *SSEStreamer, errType, message string, details map[string]any) {
	payload := ErrorDetails{
		Type:    errType,
		Message: message,
		Details: details,
	}
	if err := streamer.Send(EventError, payload); err != nil {
		csh.logger.Error("Failed to send stream error to client", zap.Error(err))
	}
}
