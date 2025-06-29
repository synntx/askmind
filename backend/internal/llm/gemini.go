package llm

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/google/generative-ai-go/genai"
	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/prompts"
	"github.com/synntx/askmind/internal/tools"
	"go.uber.org/zap"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

// FIX: Get MAX_TOOL_CALL_ITERATIONS from config or get from user config (setttings)
const MAX_TOOL_CALL_ITERATIONS = 15

type Gemini struct {
	Client       *genai.Client
	logger       *zap.Logger
	ModelName    string
	tools        []*genai.Tool
	toolRegistry *tools.ToolRegistry
}

// type ContentChunk struct {
// 	Content  string
// 	ToolInfo *ToolInfo
// 	Err      error
// }

// type ToolInfo struct {
// 	Name   string
// 	Args   map[string]any
// 	Result string
// 	Status Status
// }

// type Status string

// const (
// 	StatusStart      Status = "START"
// 	StatusProcessing Status = "PROCESSING"
// 	StatusEnd        Status = "END"
// )

func NewGemini(client *genai.Client, logger *zap.Logger, modelName string, tools []*genai.Tool, toolRegistry *tools.ToolRegistry) *Gemini {
	return &Gemini{
		Client:       client,
		logger:       logger,
		ModelName:    modelName,
		tools:        tools,
		toolRegistry: toolRegistry,
	}
}

// CreateGeminiClient creates a new genai client

func NewGeminiClient(ctx context.Context, apiKey string) (*genai.Client, error) {
	return genai.NewClient(ctx, option.WithAPIKey(apiKey))
}

func (g *Gemini) GetProviderName() string {
	return "gemini"
}

func (g *Gemini) GetModelName() string {
	return g.ModelName
}

func (g *Gemini) GenerateContent(ctx context.Context, input string) (string, error) {
	model := g.Client.GenerativeModel(g.ModelName)
	model.Tools = g.tools
	resp, err := model.GenerateContent(ctx, genai.Text(input))
	if err != nil {
		g.logger.Error("Failed to generate content from Gemini", zap.Error(err), zap.String("input", input))
		return "", fmt.Errorf("failed to generate content from Gemini: %w", err)
	}

	if len(resp.Candidates) == 0 {
		g.logger.Warn("No candidates returned from Gemini", zap.String("input", input))
		return "", fmt.Errorf("no response candidates from Gemini")
	}

	if len(resp.Candidates[0].Content.Parts) == 0 {
		g.logger.Warn("No content parts in the first candidate from Gemini", zap.String("input", input))
		return "", fmt.Errorf("no content parts in Gemini response")
	}

	if text, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
		return string(text), nil
	} else {
		g.logger.Warn("Unexpected response type from Gemini, not text", zap.String("input", input), zap.Any("response", resp.Candidates[0].Content.Parts[0]))
		return "", fmt.Errorf("unexpected response type from Gemini, not text")
	}
}

func (g *Gemini) GenerateEmbeddings(ctx context.Context, input string) ([]float32, error) {
	em := g.Client.EmbeddingModel("text-embedding-004")
	resp, err := em.EmbedContent(ctx, genai.Text(input))
	if err != nil {
		return nil, fmt.Errorf("failed to generate embeddings: %w", err)
	}

	if resp.Embedding == nil || len(resp.Embedding.Values) == 0 {
		return nil, fmt.Errorf("no embeddings returned")
	}

	return resp.Embedding.Values, nil
}

func (g *Gemini) GenerateContentStream(ctx context.Context, history []models.ChatMessage, userMessage string) <-chan ContentChunk {
	contentStream := make(chan ContentChunk, 10)

	g.logger.Info("Starting GenerateContentStream", zap.String("initial_input", userMessage))

	go func() {
		defer func() {
			g.logger.Debug("Closing content stream")
			close(contentStream)
		}()

		model := g.Client.GenerativeModel(g.ModelName)
		model.Tools = g.tools
		// model.SystemInstruction = genai.NewUserContent(genai.Text(researchAssistantSystemPrompt))
		// model.SystemInstruction = genai.NewUserContent(genai.Text(fmt.Sprintf(prompts.RESEARCH_ASSISTANT_SYSTEM_PROMPT, time.Now().UTC().UnixMilli())))
		model.SystemInstruction = genai.NewUserContent(genai.Text(fmt.Sprintf(prompts.ASK_MIND_SYSTEM_PROMPT_WITH_TOOLS, time.Now().UTC().UnixMilli())))
		// model.SystemInstruction = genai.NewUserContent(genai.Text(fmt.Sprintf(prompts.THINK_TAG_INSTRUCTION, time.Now().UTC().UnixMilli())))

		model.SafetySettings = []*genai.SafetySetting{
			{
				Category:  genai.HarmCategoryHateSpeech,
				Threshold: genai.HarmBlockNone,
			},
			{
				Category:  genai.HarmCategorySexuallyExplicit,
				Threshold: genai.HarmBlockNone,
			},
			{
				Category:  genai.HarmCategoryDangerousContent,
				Threshold: genai.HarmBlockNone,
			},
		}

		cs := model.StartChat()
		g.logger.Debug("Converting history",
			zap.Int("history_length", len(history)),
			zap.Any("history", history),
		)

		cs.History = g.convertToGenaiContent(history)

		g.logger.Debug("Converted genai history",
			zap.Int("genai_history_length", len(cs.History)),
			zap.Any("genai_history", cs.History),
		)
		partsToSendToGemini := []genai.Part{genai.Text(userMessage)}

		for i := range MAX_TOOL_CALL_ITERATIONS {
			g.logger.Info("Starting LLM turn iteration", zap.Int("iteration", i), zap.Any("parts_sent_to_gemini", partsToSendToGemini))

			stream := cs.SendMessageStream(ctx, partsToSendToGemini...)
			var functionCalls []genai.FunctionCall

			g.logger.Debug("Calling stream.Next() in loop")

			for {
				resp, err := stream.Next()
				if err == iterator.Done || err == io.EOF {
					g.logger.Info("Gemini stream finished normally for this turn", zap.Int("iteration", i))
					break
				}
				if err != nil {
					g.logger.Error("Error from Gemini stream Next()", zap.Error(err), zap.Int("iteration", i))

					var googleErr *googleapi.Error
					if errors.As(err, &googleErr) {
						g.logger.Error("Google API Error details from Gemini stream Next()",
							zap.Error(err),
							zap.Int("code", googleErr.Code),
							zap.String("message", googleErr.Message),
							zap.Any("details", googleErr.Details),
							zap.Int("iteration", i),
						)
						if googleErr.Code == 429 {
							contentStream <- ContentChunk{Err: fmt.Errorf("rate_limit_exceeded: %w", err)}
						} else if googleErr.Code >= 400 && googleErr.Code < 500 {
							contentStream <- ContentChunk{Err: fmt.Errorf("client_error: %w", err)}
						} else if googleErr.Code >= 500 {
							contentStream <- ContentChunk{Err: fmt.Errorf("server_error: %w", err)}
						} else {
							contentStream <- ContentChunk{Err: fmt.Errorf("generation_error: %w", err)}
						}

					} else {
						contentStream <- ContentChunk{Err: fmt.Errorf("generation_error: %w", err)}
					}
					return
				}

				if resp == nil || len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
					g.logger.Warn("Unexpected empty response or candidates from Gemini stream chunk", zap.Int("iteration", i))
					continue
				}

				for _, part := range resp.Candidates[0].Content.Parts {
					switch p := part.(type) {
					case genai.Text:
						chunk := string(p)
						g.logger.Debug("Received text chunk from Gemini", zap.String("chunk", chunk), zap.Int("iteration", i))
						select {
						case contentStream <- ContentChunk{Content: chunk}:
							g.logger.Debug("Sent text chunk to channel", zap.Int("iteration", i))
						case <-ctx.Done():
							g.logger.Warn("Context cancelled while trying to send text chunk", zap.Error(ctx.Err()), zap.Int("iteration", i))
							contentStream <- ContentChunk{Err: ctx.Err()}
							return
						}
					case genai.FunctionCall:
						g.logger.Info("Received function call from Gemini", zap.String("name", p.Name), zap.Any("args", p.Args), zap.Int("iteration", i))
						functionCalls = append(functionCalls, p)
						contentStream <- ContentChunk{ToolInfo: &ToolInfo{
							Name:   p.Name,
							Args:   p.Args,
							Result: "",
							Status: StatusStart,
						}}
					default:
						g.logger.Warn("Unexpected part type in streamed response chunk from Gemini", zap.Any("part", part), zap.Int("iteration", i))
					}
				}
			}

			if len(functionCalls) == 0 {
				g.logger.Info("LLM interaction complete (no function calls in final response)", zap.Int("iteration", i))
				return
			}

			var functionResponses []genai.Part
			// var toolInfo *ToolInfo

			// for _, fc := range functionCalls {
			// 	g.logger.Info("Attempting to execute tool", zap.String("name", fc.Name), zap.Any("args", fc.Args), zap.Int("iteration", i))

			// 	contentStream <- ContentChunk{ToolInfo: &ToolInfo{
			// 		Name:   fc.Name,
			// 		Args:   fc.Args,
			// 		Result: "",
			// 		Status: StatusProcessing,
			// 	}}

			// 	tool, ok := g.toolRegistry.GetTool(fc.Name)
			// 	if !ok {
			// 		g.logger.Error("Tool not found in registry after receiving function call", zap.String("tool", fc.Name), zap.Int("iteration", i))
			// 		// If tool is not found, this is a non-recoverable error for this tool call sequence.
			// 		// Send an error chunk and terminate the interaction.
			// 		contentStream <- ContentChunk{Err: fmt.Errorf("tool_not_found: tool '%s' not found in registry", fc.Name)}
			// 		return // Exit on tool not found
			// 	}

			// 	args := make(map[string]any)
			// 	if fc.Args != nil {
			// 		maps.Copy(args, fc.Args)
			// 	}

			// 	g.logger.Debug("Executing tool function", zap.String("name", fc.Name), zap.Any("args", args), zap.Int("iteration", i))

			// 	var toolResult string
			// 	result, err := tool.Execute(ctx, args)
			// 	if err != nil {
			// 		g.logger.Error("Error executing tool", zap.Error(err), zap.String("tool", fc.Name), zap.Any("args", args), zap.Int("iteration", i))
			// 		// Format the error message to send back to the model and user stream
			// 		toolResult = fmt.Sprintf("Tool execution failed: %v", err)
			// 		// IMPORTANT: Do NOT return here. Continue to send the error result back to the model.
			// 	} else {
			// 		toolResult = result
			// 	}

			// 	// Prepare tool info for the user stream (always send StatusEnd with result/error)
			// 	toolInfo = &ToolInfo{
			// 		Name:   fc.Name,
			// 		Args:   args,
			// 		Result: toolResult,
			// 		Status: StatusEnd,
			// 	}

			// 	// Prepare function response payload for the model (always send result or error message)
			// 	functionResponsePayload := map[string]any{"content": toolResult}

			// 	g.logger.Debug("Tool execution complete (or failed)", zap.String("tool", fc.Name), zap.String("result_preview", toolResult[:min(len(toolResult), 100)]+"..."), zap.Int("iteration", i))

			// 	// Send tool result/error info to the user stream
			// 	select {
			// 	case contentStream <- ContentChunk{ToolInfo: toolInfo}:
			// 		g.logger.Debug("Sent tool result/error chunk to channel", zap.Int("iteration", i))
			// 	case <-ctx.Done():
			// 		g.logger.Warn("Context cancelled while trying to send tool result/error chunk", zap.Error(ctx.Err()), zap.Int("iteration", i))
			// 		contentStream <- ContentChunk{Err: ctx.Err()}
			// 		return // Exit if context cancelled
			// 	}

			// 	// Add the function response (containing result or error message) to the batch for the next model call
			// 	functionResponses = append(functionResponses, genai.FunctionResponse{
			// 		Name:     fc.Name,
			// 		Response: functionResponsePayload,
			// 	})

			// 	g.logger.Debug("Added function response (with result or error) to batch", zap.String("tool", fc.Name), zap.Int("iteration", i))
			// } // End of loop over function calls

			partsToSendToGemini = g.executeToolsInParallel(ctx, contentStream, functionCalls)

			// Continue the outer loop for the next turn with the function responses
			// partsToSendToGemini = functionResponses
			g.logger.Debug("Prepared batch of function responses for next turn", zap.Int("num_responses", len(functionResponses)), zap.Int("iteration", i))
		}

		g.logger.Error("Max tool call iterations reached", zap.Int("limit", MAX_TOOL_CALL_ITERATIONS))
		contentStream <- ContentChunk{Err: fmt.Errorf("max_tool_iterations_reached: exceeded %d iterations", MAX_TOOL_CALL_ITERATIONS)}
	}()

	return contentStream
}

func (g *Gemini) convertToGenaiContent(history []models.ChatMessage) []*genai.Content {
	var contents []*genai.Content

	// First pass: convert and filter
	for _, msg := range history {
		// Skip empty messages
		if strings.TrimSpace(msg.Content) == "" {
			g.logger.Debug("Skipping empty message",
				zap.String("role", string(msg.Role)),
				zap.String("message_id", msg.MessageId.String()))
			continue
		}

		var role string
		switch msg.Role {
		case models.RoleUser:
			role = "user"
		case models.RoleAssistant:
			role = "model"
		case models.RoleSystem:
			// Gemini doesn't support system role in history
			g.logger.Debug("Skipping system message in history")
			continue
		case models.RoleTool:
			// Tool responses need special handling
			g.logger.Debug("Skipping tool message in history")
			continue
		default:
			g.logger.Warn("Unknown role in history", zap.String("role", string(msg.Role)))
			continue
		}

		contents = append(contents, &genai.Content{
			Role:  role,
			Parts: []genai.Part{genai.Text(msg.Content)},
		})
	}

	// Second pass: ensure alternating roles
	if len(contents) == 0 {
		return contents
	}

	cleaned := []*genai.Content{}
	var lastRole string

	for i, content := range contents {
		// For the first message, ensure it's from user
		if i == 0 && content.Role != "user" {
			g.logger.Debug("First message is not from user, skipping")
			continue
		}

		// Check for consecutive same roles
		if content.Role == lastRole {
			g.logger.Debug("Consecutive same role detected, skipping",
				zap.String("role", content.Role),
				zap.Int("index", i))
			continue
		}

		cleaned = append(cleaned, content)
		lastRole = content.Role
	}

	// Final validation: ensure it ends with model if we're about to add a user message
	if len(cleaned) > 0 && cleaned[len(cleaned)-1].Role == "user" {
		g.logger.Debug("History ends with user message, removing it since we're adding a new user message")
		cleaned = cleaned[:len(cleaned)-1]
	}

	g.logger.Info("Cleaned history",
		zap.Int("original_count", len(history)),
		zap.Int("filtered_count", len(contents)),
		zap.Int("final_count", len(cleaned)))

	return cleaned
}

func (g *Gemini) executeToolsInParallel(ctx context.Context, contentStream chan ContentChunk, functionCalls []genai.FunctionCall) []genai.Part {
	var wg sync.WaitGroup
	resultChan := make(chan struct {
		response genai.Part
		index    int
		err      error
	}, len(functionCalls))

	for i, call := range functionCalls {
		wg.Add(1)
		go func(fc genai.FunctionCall, idx int) {
			defer wg.Done()

			select {
			case contentStream <- ContentChunk{ToolInfo: &ToolInfo{
				Name:   fc.Name,
				Args:   fc.Args,
				Result: "",
				Status: StatusProcessing,
			}}:
			case <-ctx.Done():
				return
			}

			toolCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
			defer cancel()

			tool, ok := g.toolRegistry.GetTool(fc.Name)
			if !ok {
				select {
				case contentStream <- ContentChunk{ToolInfo: &ToolInfo{
					Name:   fc.Name,
					Args:   fc.Args,
					Result: fmt.Sprintf("Tool '%s' not found", fc.Name),
					Status: StatusEnd,
				}}:
				case <-ctx.Done():
				}
				resultChan <- struct {
					response genai.Part
					index    int
					err      error
				}{
					index: idx,
					err:   fmt.Errorf("tool not found: %s", fc.Name),
				}
				return
			}

			result, err := tool.Execute(toolCtx, fc.Args)

			select {
			case contentStream <- ContentChunk{ToolInfo: &ToolInfo{
				Name:   fc.Name,
				Args:   fc.Args,
				Result: result,
				Status: StatusEnd,
			}}:
			case <-ctx.Done():
				return
			}

			resultChan <- struct {
				response genai.Part
				index    int
				err      error
			}{
				response: genai.FunctionResponse{
					Name:     fc.Name,
					Response: map[string]any{"content": result},
				},
				index: idx,
				err:   err,
			}
		}(call, i)
	}

	go func() {
		wg.Wait()
		close(resultChan)
	}()

	responses := make([]genai.Part, len(functionCalls))
	errors := make([]error, 0)
	for result := range resultChan {
		if result.err != nil {
			errors = append(errors, result.err)
			continue
		}
		responses[result.index] = result.response
	}

	return responses
}
