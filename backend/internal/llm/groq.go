package llm

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/prompts"
	"github.com/synntx/askmind/internal/tools"
	"go.uber.org/zap"
)

const (
	groqAPIURL = "https://api.groq.com/openai/v1"
)

type Groq struct {
	apiKey       string
	logger       *zap.Logger
	modelName    string
	httpClient   *http.Client
	tools        []GroqTool
	toolRegistry *tools.ToolRegistry
}

// Groq API types
type GroqMessage struct {
	Role       models.Role    `json:"role"`
	Content    string         `json:"content"`
	ToolCalls  []GroqToolCall `json:"tool_calls,omitempty"`
	ToolCallID string         `json:"tool_call_id,omitempty"`
}

type GroqToolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

type GroqTool struct {
	Type     string                 `json:"type"`
	Function GroqFunctionDefinition `json:"function"`
}

type GroqFunctionDefinition struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

type GroqChatRequest struct {
	Model          string        `json:"model"`
	Messages       []GroqMessage `json:"messages"`
	Tools          []GroqTool    `json:"tools,omitempty"`
	ToolChoice     string        `json:"tool_choice,omitempty"`
	Temperature    float32       `json:"temperature,omitempty"`
	MaxTokens      int           `json:"max_tokens,omitempty"`
	Stream         bool          `json:"stream,omitempty"`
	ResponseFormat interface{}   `json:"response_format,omitempty"`
}

type GroqChatResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index        int         `json:"index"`
		Message      GroqMessage `json:"message"`
		Delta        GroqMessage `json:"delta,omitempty"`
		FinishReason string      `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

func NewGroq(apiKey string, logger *zap.Logger, modelName string, toolRegistry *tools.ToolRegistry) *Groq {
	groq := &Groq{
		apiKey:       apiKey,
		logger:       logger,
		modelName:    modelName,
		httpClient:   &http.Client{},
		toolRegistry: toolRegistry,
	}

	if toolRegistry != nil {
		groq.tools = groq.convertToGroqTools()
	}

	return groq
}

func (g *Groq) GetProviderName() string {
	return "groq"
}

func (g *Groq) GetModelName() string {
	return g.modelName
}

func (g *Groq) GenerateContent(ctx context.Context, input string) (string, error) {
	messages := []GroqMessage{
		{
			Role:    models.RoleUser,
			Content: input,
		},
	}

	request := GroqChatRequest{
		Model:    g.modelName,
		Messages: messages,
		Tools:    g.tools,
	}

	resp, err := g.makeRequest(ctx, request)
	if err != nil {
		return "", err
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response from Groq")
	}

	return resp.Choices[0].Message.Content, nil
}

func (g *Groq) GenerateEmbeddings(ctx context.Context, input string) ([]float32, error) {
	// Groq doesn't support embeddings directly, so we'll return an error
	// You could integrate with another embedding service here
	return nil, fmt.Errorf("groq does not support embeddings generation")
}

func (g *Groq) GenerateContentStream(ctx context.Context, history []models.ChatMessage, userMessage string) <-chan ContentChunk {
	contentStream := make(chan ContentChunk, 10)

	go func() {
		defer close(contentStream)

		// Convert history to Groq format
		messages := g.convertToGroqMessages(history)

		// Add system prompt
		systemPrompt := fmt.Sprintf(prompts.THINK_TAG_INSTRUCTION, 0)
		messages = append([]GroqMessage{
			{
				Role:    (models.RoleSystem),
				Content: systemPrompt,
			},
		}, messages...)

		// Add user message
		messages = append(messages, GroqMessage{
			Role:    (models.RoleUser),
			Content: userMessage,
		})

		// Tool calling loop
		for i := 0; i < MAX_TOOL_CALL_ITERATIONS; i++ {
			g.logger.Info("Starting Groq turn iteration", zap.Int("iteration", i))

			request := GroqChatRequest{
				Model:    g.modelName,
				Messages: messages,
				Tools:    g.tools,
				Stream:   true,
			}

			stream, err := g.makeStreamRequest(ctx, request)
			if err != nil {
				contentStream <- ContentChunk{Err: fmt.Errorf("groq stream error: %w", err)}
				return
			}

			var toolCalls []GroqToolCall
			var currentContent strings.Builder

			// Read stream
			scanner := bufio.NewScanner(stream)
			for scanner.Scan() {
				line := scanner.Text()
				if !strings.HasPrefix(line, "data: ") {
					continue
				}

				data := strings.TrimPrefix(line, "data: ")
				if data == "[DONE]" {
					break
				}

				var chunk GroqChatResponse
				if err := json.Unmarshal([]byte(data), &chunk); err != nil {
					g.logger.Error("Failed to parse Groq stream chunk", zap.Error(err))
					continue
				}

				if len(chunk.Choices) > 0 {
					delta := chunk.Choices[0].Delta

					// Handle content
					if delta.Content != "" {
						currentContent.WriteString(delta.Content)
						contentStream <- ContentChunk{Content: delta.Content}
					}

					// Handle tool calls
					if len(delta.ToolCalls) > 0 {
						toolCalls = append(toolCalls, delta.ToolCalls...)
						for _, tc := range delta.ToolCalls {
							contentStream <- ContentChunk{
								ToolInfo: &ToolInfo{
									Name:   tc.Function.Name,
									Status: StatusStart,
								},
							}
						}
					}
				}
			}

			stream.Close()

			// If no tool calls, we're done
			if len(toolCalls) == 0 {
				g.logger.Info("Groq interaction complete (no tool calls)", zap.Int("iteration", i))
				return
			}

			// Add assistant message with tool calls
			messages = append(messages, GroqMessage{
				Role:      (models.RoleAssistant),
				Content:   currentContent.String(),
				ToolCalls: toolCalls,
			})

			// Execute tools
			for _, tc := range toolCalls {
				g.logger.Info("Executing tool", zap.String("name", tc.Function.Name))

				contentStream <- ContentChunk{
					ToolInfo: &ToolInfo{
						Name:   tc.Function.Name,
						Status: StatusProcessing,
					},
				}

				// Parse arguments
				var args map[string]any
				if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
					g.logger.Error("Failed to parse tool arguments", zap.Error(err))
					contentStream <- ContentChunk{Err: fmt.Errorf("failed to parse tool arguments: %w", err)}
					return
				}

				// Execute tool
				tool, ok := g.toolRegistry.GetTool(tc.Function.Name)
				if !ok {
					g.logger.Error("Tool not found", zap.String("tool", tc.Function.Name))
					contentStream <- ContentChunk{Err: fmt.Errorf("tool not found: %s", tc.Function.Name)}
					return
				}

				result, err := tool.Execute(ctx, args)
				if err != nil {
					g.logger.Error("Tool execution failed", zap.Error(err))
					result = fmt.Sprintf("Error: %v", err)
				}

				// Send tool result
				contentStream <- ContentChunk{
					ToolInfo: &ToolInfo{
						Name:   tc.Function.Name,
						Args:   args,
						Result: result,
						Status: StatusEnd,
					},
				}

				// Add tool response message
				messages = append(messages, GroqMessage{
					Role:       models.RoleTool,
					Content:    result,
					ToolCallID: tc.ID,
				})
			}
		}

		g.logger.Error("Max tool iterations reached")
		contentStream <- ContentChunk{Err: fmt.Errorf("max tool iterations reached")}
	}()

	// log the content stream so i can debug
	g.logger.Info("Content stream started")

	return contentStream
}

func (g *Groq) makeRequest(ctx context.Context, request GroqChatRequest) (*GroqChatResponse, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", groqAPIURL+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+g.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("groq API error (status %d): %s", resp.StatusCode, string(body))
	}

	var groqResp GroqChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&groqResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &groqResp, nil
}

func (g *Groq) makeStreamRequest(ctx context.Context, request GroqChatRequest) (io.ReadCloser, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", groqAPIURL+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+g.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("groq API error (status %d): %s", resp.StatusCode, string(body))
	}

	return resp.Body, nil
}

func (g *Groq) convertToGroqMessages(history []models.ChatMessage) []GroqMessage {
	messages := make([]GroqMessage, len(history))
	for i, msg := range history {
		messages[i] = GroqMessage{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}
	return messages
}

func (g *Groq) convertToGroqTools() []GroqTool {
	var groqTools []GroqTool

	for _, tool := range g.toolRegistry.GetAllTools() {
		properties := make(map[string]interface{})
		required := []string{}

		for _, param := range tool.Parameters() {
			paramSchema := map[string]interface{}{
				"type":        g.convertTypeToGroq(param.Type),
				"description": param.Description,
			}

			if len(param.Enum) > 0 {
				paramSchema["enum"] = param.Enum
			}

			properties[param.Name] = paramSchema

			if param.Required {
				required = append(required, param.Name)
			}
		}

		groqTools = append(groqTools, GroqTool{
			Type: "function",
			Function: GroqFunctionDefinition{
				Name:        tool.Name(),
				Description: tool.Description(),
				Parameters: map[string]interface{}{
					"type":       "object",
					"properties": properties,
					"required":   required,
				},
			},
		})
	}
	return groqTools
}

func (g *Groq) convertTypeToGroq(genaiType genai.Type) string {
	switch genaiType {
	case genai.TypeString:
		return "string"
	case genai.TypeNumber:
		return "number"
	case genai.TypeInteger:
		return "integer"
	case genai.TypeBoolean:
		return "boolean"
	case genai.TypeArray:
		return "array"
	case genai.TypeObject:
		return "object"
	default:
		return "string"
	}
}
