package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/generative-ai-go/genai"
	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/prompts"
	"github.com/synntx/askmind/internal/tools"
	"go.uber.org/zap"
)

type Ollama struct {
	baseURL      string
	logger       *zap.Logger
	modelName    string
	httpClient   *http.Client
	tools        []OllamaTool
	toolRegistry *tools.ToolRegistry
}

// Ollama API types
type OllamaMessage struct {
	Role      string           `json:"role"`
	Content   string           `json:"content"`
	ToolCalls []OllamaToolCall `json:"tool_calls,omitempty"`
}

type OllamaToolCall struct {
	Function OllamaFunctionCall `json:"function"`
}

type OllamaFunctionCall struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

type OllamaTool struct {
	Type     string             `json:"type"`
	Function OllamaToolFunction `json:"function"`
}

type OllamaToolFunction struct {
	Name        string               `json:"name"`
	Description string               `json:"description"`
	Parameters  OllamaToolParameters `json:"parameters"`
}

type OllamaToolParameters struct {
	Type       string                             `json:"type"`
	Properties map[string]OllamaParameterProperty `json:"properties"`
	Required   []string                           `json:"required"`
}

type OllamaParameterProperty struct {
	Type        string   `json:"type"`
	Description string   `json:"description"`
	Enum        []string `json:"enum,omitempty"`
}

type OllamaChatRequest struct {
	Model    string          `json:"model"`
	Messages []OllamaMessage `json:"messages"`
	Tools    []OllamaTool    `json:"tools,omitempty"`
	Stream   bool            `json:"stream"`
	Options  OllamaOptions   `json:"options,omitempty"`
}

type OllamaOptions struct {
	Temperature float32 `json:"temperature,omitempty"`
	NumPredict  int     `json:"num_predict,omitempty"`
}

type OllamaChatResponse struct {
	Model           string        `json:"model"`
	CreatedAt       time.Time     `json:"created_at"`
	Message         OllamaMessage `json:"message"`
	Done            bool          `json:"done"`
	TotalDuration   int64         `json:"total_duration,omitempty"`
	LoadDuration    int64         `json:"load_duration,omitempty"`
	PromptEvalCount int           `json:"prompt_eval_count,omitempty"`
	EvalCount       int           `json:"eval_count,omitempty"`
	EvalDuration    int64         `json:"eval_duration,omitempty"`
}

type OllamaEmbeddingRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
}

type OllamaEmbeddingResponse struct {
	Embedding []float32 `json:"embedding"`
}

func NewOllama(baseURL string, logger *zap.Logger, modelName string, toolRegistry *tools.ToolRegistry) *Ollama {
	if baseURL == "" {
		baseURL = "http://localhost:11434" // Default Ollama URL
	}

	ollama := &Ollama{
		baseURL:      baseURL,
		logger:       logger,
		modelName:    modelName,
		httpClient:   &http.Client{Timeout: 5 * time.Minute}, // Longer timeout for local models
		toolRegistry: toolRegistry,
	}

	if toolRegistry != nil {
		ollama.tools = ollama.convertToOllamaTools()
	}

	return ollama
}

func (o *Ollama) GetProviderName() string {
	return "ollama"
}

func (o *Ollama) GetModelName() string {
	return o.modelName
}

func (o *Ollama) GenerateContent(ctx context.Context, input string) (string, error) {
	messages := []OllamaMessage{
		{
			Role:    string(models.RoleUser),
			Content: input,
		},
	}

	request := OllamaChatRequest{
		Model:    o.modelName,
		Messages: messages,
		Stream:   false,
		Tools:    o.tools,
	}

	resp, err := o.makeRequest(ctx, request)
	if err != nil {
		return "", err
	}

	return resp.Message.Content, nil
}

func (o *Ollama) GenerateEmbeddings(ctx context.Context, input string) ([]float32, error) {
	// Check if model supports embeddings
	embeddingModels := []string{"nomic-embed-text", "mxbai-embed-large", "all-minilm"}
	modelName := o.modelName

	// Check if current model is an embedding model
	isEmbeddingModel := false
	for _, em := range embeddingModels {
		if strings.Contains(o.modelName, em) {
			isEmbeddingModel = true
			break
		}
	}

	// If not, try to use a default embedding model
	if !isEmbeddingModel {
		modelName = "nomic-embed-text" // Default embedding model
		o.logger.Info("Using default embedding model", zap.String("model", modelName))
	}

	request := OllamaEmbeddingRequest{
		Model:  modelName,
		Prompt: input,
	}

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/api/embeddings", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := o.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ollama API error (status %d): %s", resp.StatusCode, string(body))
	}

	var embResp OllamaEmbeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&embResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return embResp.Embedding, nil
}

func (o *Ollama) GenerateContentStream(ctx context.Context, history []models.ChatMessage, userMessage string) <-chan ContentChunk {
	contentStream := make(chan ContentChunk, 10)

	go func() {
		defer close(contentStream)

		// Convert history to Ollama format
		messages := o.convertToOllamaMessages(history)

		// Add system prompt
		systemPrompt := fmt.Sprintf(prompts.THINK_TAG_INSTRUCTION, time.Now().UTC().UnixMilli())
		messages = append([]OllamaMessage{
			{
				Role:    string(models.RoleSystem),
				Content: systemPrompt,
			},
		}, messages...)

		// Add user message
		messages = append(messages, OllamaMessage{
			Role:    string(models.RoleUser),
			Content: userMessage,
		})

		// Tool calling loop
		for i := 0; i < MAX_TOOL_CALL_ITERATIONS; i++ {
			o.logger.Info("Starting Ollama turn iteration", zap.Int("iteration", i))

			request := OllamaChatRequest{
				Model:    o.modelName,
				Messages: messages,
				Tools:    o.tools,
				Stream:   true,
				Options: OllamaOptions{
					Temperature: 0.7,
				},
			}

			stream, err := o.makeStreamRequest(ctx, request)
			if err != nil {
				contentStream <- ContentChunk{Err: fmt.Errorf("ollama stream error: %w", err)}
				return
			}

			var currentMessage OllamaMessage
			var toolCalls []OllamaToolCall

			// Read stream
			decoder := json.NewDecoder(stream)
			for {
				var chunk OllamaChatResponse
				if err := decoder.Decode(&chunk); err != nil {
					if err == io.EOF {
						break
					}
					o.logger.Error("Failed to decode Ollama stream chunk", zap.Error(err))
					contentStream <- ContentChunk{Err: fmt.Errorf("decode error: %w", err)}
					stream.Close()
					return
				}

				// Handle content
				if chunk.Message.Content != "" {
					currentMessage.Content += chunk.Message.Content
					contentStream <- ContentChunk{Content: chunk.Message.Content}
				}

				// Handle tool calls
				if len(chunk.Message.ToolCalls) > 0 {
					toolCalls = append(toolCalls, chunk.Message.ToolCalls...)
					for _, tc := range chunk.Message.ToolCalls {
						contentStream <- ContentChunk{
							ToolInfo: &ToolInfo{
								Name:   tc.Function.Name,
								Status: StatusStart,
							},
						}
					}
				}

				if chunk.Done {
					break
				}
			}

			stream.Close()

			// If no tool calls, we're done
			if len(toolCalls) == 0 {
				o.logger.Info("Ollama interaction complete (no tool calls)", zap.Int("iteration", i))
				return
			}

			// Add assistant message
			currentMessage.Role = string(models.RoleAssistant)
			currentMessage.ToolCalls = toolCalls
			messages = append(messages, currentMessage)

			// Execute tools
			for _, tc := range toolCalls {
				o.logger.Info("Executing tool", zap.String("name", tc.Function.Name))

				contentStream <- ContentChunk{
					ToolInfo: &ToolInfo{
						Name:   tc.Function.Name,
						Status: StatusProcessing,
					},
				}

				// Execute tool
				tool, ok := o.toolRegistry.GetTool(tc.Function.Name)
				if !ok {
					o.logger.Error("Tool not found", zap.String("tool", tc.Function.Name))
					contentStream <- ContentChunk{Err: fmt.Errorf("tool not found: %s", tc.Function.Name)}
					return
				}

				result, err := tool.Execute(ctx, tc.Function.Arguments)
				if err != nil {
					o.logger.Error("Tool execution failed", zap.Error(err))
					result = fmt.Sprintf("Error: %v", err)
				}

				// Send tool result
				contentStream <- ContentChunk{
					ToolInfo: &ToolInfo{
						Name:   tc.Function.Name,
						Args:   tc.Function.Arguments,
						Result: result,
						Status: StatusEnd,
					},
				}

				// Add tool response message
				messages = append(messages, OllamaMessage{
					Role:    models.RoleTool,
					Content: fmt.Sprintf("Tool '%s' result: %s", tc.Function.Name, result),
				})
			}
		}

		o.logger.Error("Max tool iterations reached")
		contentStream <- ContentChunk{Err: fmt.Errorf("max tool iterations reached")}
	}()

	return contentStream
}

func (o *Ollama) makeRequest(ctx context.Context, request OllamaChatRequest) (*OllamaChatResponse, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/api/chat", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := o.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ollama API error (status %d): %s", resp.StatusCode, string(body))
	}

	var ollamaResp OllamaChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &ollamaResp, nil
}

func (o *Ollama) makeStreamRequest(ctx context.Context, request OllamaChatRequest) (io.ReadCloser, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/api/chat", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := o.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("ollama API error (status %d): %s", resp.StatusCode, string(body))
	}

	return resp.Body, nil
}

func (o *Ollama) convertToOllamaMessages(history []models.ChatMessage) []OllamaMessage {
	messages := make([]OllamaMessage, len(history))
	for i, msg := range history {
		messages[i] = OllamaMessage{
			Role:    string(msg.Role),
			Content: msg.Content,
		}
	}
	return messages
}

func (o *Ollama) convertToOllamaTools() []OllamaTool {
	var ollamaTools []OllamaTool

	for _, tool := range o.toolRegistry.GetAllTools() {
		properties := make(map[string]OllamaParameterProperty)
		required := []string{}

		for _, param := range tool.Parameters() {
			prop := OllamaParameterProperty{
				Type:        o.convertTypeToOllama(param.Type),
				Description: param.Description,
			}

			if len(param.Enum) > 0 {
				prop.Enum = param.Enum
			}

			properties[param.Name] = prop

			if param.Required {
				required = append(required, param.Name)
			}
		}

		ollamaTools = append(ollamaTools, OllamaTool{
			Type: "function",
			Function: OllamaToolFunction{
				Name:        tool.Name(),
				Description: tool.Description(),
				Parameters: OllamaToolParameters{
					Type:       "object",
					Properties: properties,
					Required:   required,
				},
			},
		})
	}

	return ollamaTools
}

func (o *Ollama) convertTypeToOllama(genaiType genai.Type) string {
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
