package llm

import (
	"context"
	"errors"
	"fmt"
	"io"
	"maps"

	"github.com/google/generative-ai-go/genai"
	"github.com/synntx/askmind/internal/tools"
	"go.uber.org/zap"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

const MAX_TOOL_CALL_ITERATIONS = 5

type Gemini struct {
	Client       *genai.Client
	logger       *zap.Logger
	ModelName    string
	tools        []*genai.Tool
	toolRegistry *tools.ToolRegistry
}

type ContentChunk struct {
	Content  string
	ToolInfo *ToolInfo
	Err      error
}

type ToolInfo struct {
	Name   string
	Args   map[string]any
	Result string
}

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

func (g *Gemini) GenerateEmbeddings(ctx context.Context, input string) (*genai.EmbedContentResponse, error) {
	em := g.Client.EmbeddingModel("text-embedding-004")
	return em.EmbedContent(ctx, genai.Text(input))
}

func (g *Gemini) GenerateContentStream(ctx context.Context, input string) <-chan ContentChunk {
	contentStream := make(chan ContentChunk, 10)

	go func() {
		defer close(contentStream)

		model := g.Client.GenerativeModel(g.ModelName)
		model.Tools = g.tools

		cs := model.StartChat()
		// stream := model.GenerateContentStream(ctx, genai.Text(input))
		// stream := cs.SendMessageStream(ctx, genai.Text(input))
		partsToSendToGemini := []genai.Part{genai.Text(input)}

		for range MAX_TOOL_CALL_ITERATIONS {
			stream := cs.SendMessageStream(ctx, partsToSendToGemini...)
			var pendingFunctionCall *genai.FunctionCall
			var sawFunc bool

			for {
				resp, err := stream.Next()
				if err == iterator.Done || err == io.EOF {
					g.logger.Info("Gemini stream finished normally")
					break
				}
				if err != nil {
					fmt.Println("Error while generating content: ", err)
					var googleErr *googleapi.Error
					if errors.As(err, &googleErr) && googleErr.Code == 429 {
						g.logger.Error("Rate limit (429) error from Gemini stream Next()", zap.Error(err))
						contentStream <- ContentChunk{Err: fmt.Errorf("rate_limit_exceeded: %w", err)}

					} else {
						g.logger.Error("Error from Gemini stream Next()", zap.Error(err))
						contentStream <- ContentChunk{Err: fmt.Errorf("generation_error: %w", err)}
					}
					return
				}

				// Not so severe
				if resp == nil || len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
					g.logger.Warn("Unexpected empty response or candidates from Gemini stream")
					// errChan <- fmt.Errorf("empty_response: unexpected empty response from model")
					continue // ignore
				}

				for _, part := range resp.Candidates[0].Content.Parts {
					switch p := part.(type) {
					case genai.Text:
						chunk := string(p)
						g.logger.Debug("Received text chunk from Gemini", zap.String("chunk", chunk))
						select {
						case contentStream <- ContentChunk{Content: chunk}:
						case <-ctx.Done():
							contentStream <- ContentChunk{Err: ctx.Err()}
							return
						}
					case genai.FunctionCall:
						fmt.Printf("Received function call: Name=%s, Args=%v\n", p.Name, p.Args)
						pendingFunctionCall = &p
						sawFunc = true

					default:
						g.logger.Warn("Unexpected part type in streamed response from Gemini, not text", zap.Any("part", part))
						contentStream <- ContentChunk{Err: fmt.Errorf("invalid_response: expected text but got different type")}
						return
					}
					if sawFunc {
						// stop reading more chunks once we see the function call
						break
					}
				}
			}

			if !sawFunc {
				return
			}

			if pendingFunctionCall != nil {
				fc := *pendingFunctionCall

				tool, ok := g.toolRegistry.GetTool(fc.Name)
				if !ok {
					g.logger.Warn("Tool not found in registry", zap.String("tool", fc.Name))
					contentStream <- ContentChunk{Err: fmt.Errorf("tool_not_found: tool not found in registry")}
					return
				}

				args := make(map[string]any)
				if fc.Args != nil {
					maps.Copy(args, fc.Args)
				}

				result, err := tool.Execute(ctx, args)
				if err != nil {
					g.logger.Error("Error executing tool", zap.Error(err))
					contentStream <- ContentChunk{Err: fmt.Errorf("tool_error: %w", err)}
					return
				}

				g.logger.Debug("Tool result", zap.String("result", result))

				select {
				case contentStream <- ContentChunk{ToolInfo: &ToolInfo{Name: fc.Name, Args: args, Result: result}}:
				case <-ctx.Done():
					contentStream <- ContentChunk{Err: ctx.Err()}
					return
				}

				functionResponsePayload := map[string]any{"content": result}

				partsToSendToGemini = []genai.Part{
					genai.FunctionResponse{
						Name:     fc.Name,
						Response: functionResponsePayload,
					},
				}

			} else {
				g.logger.Info("LLM interaction complete (no pending tool call).")
				return
			}
		}

		g.logger.Error("Max tool call iterations reached", zap.Int("limit", MAX_TOOL_CALL_ITERATIONS))
		contentStream <- ContentChunk{Err: fmt.Errorf("max_tool_iterations_reached")}

	}()

	return contentStream
}
