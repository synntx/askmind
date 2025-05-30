// llm/factory.go
package llm

import (
	"context"
	"fmt"

	"github.com/synntx/askmind/internal/tools"
	"go.uber.org/zap"
)

type ProviderType string

const (
	ProviderGemini ProviderType = "gemini"
	ProviderGroq   ProviderType = "groq"
	ProviderOllama ProviderType = "ollama"
)

type ProviderConfig struct {
	Type         ProviderType
	APIKey       string
	Model        string
	ToolRegistry *tools.ToolRegistry
	BaseURL      string
}

func NewLLMProvider(ctx context.Context, config ProviderConfig, logger *zap.Logger) (LLM, error) {
	switch config.Type {
	case ProviderGemini:
		client, err := NewGeminiClient(ctx, config.APIKey)
		if err != nil {
			return nil, fmt.Errorf("failed to create gemini client: %w", err)
		}
		genaiTools := config.ToolRegistry.ConvertToGenaiTools()
		return NewGemini(client, logger, config.Model, genaiTools, config.ToolRegistry), nil

	case ProviderGroq:
		return NewGroq(config.APIKey, logger, config.Model, config.ToolRegistry), nil

	case ProviderOllama:
		return NewOllama(config.BaseURL, logger, config.Model, config.ToolRegistry), nil

	default:
		return nil, fmt.Errorf("unsupported provider: %s", config.Type)
	}
}
