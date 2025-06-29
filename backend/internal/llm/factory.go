package llm

import (
	"context"
	"fmt"
	"os"

	"github.com/synntx/askmind/internal/tools"
	"go.uber.org/zap"
)

type ProviderType string

const (
	ProviderGemini ProviderType = "gemini"
	ProviderGroq   ProviderType = "groq"
	ProviderOllama ProviderType = "ollama"
)

// LLMFactory defines an interface for creating LLM instances.
type LLMFactory interface {
	CreateLLM(ctx context.Context, providerType ProviderType, model string) (LLM, error)
}

// DefaultLLMFactory implements the LLMFactory interface.
type DefaultLLMFactory struct {
	logger       *zap.Logger
	toolRegistry *tools.ToolRegistry
	apiKeys      map[ProviderType]string
	baseUrls     map[ProviderType]string
}

// NewDefaultLLMFactory creates a new instance of DefaultLLMFactory.
// It takes a map of API keys and base URLs for different providers,
// allowing the factory to manage credentials and endpoints.
func NewDefaultLLMFactory(
	logger *zap.Logger,
	toolRegistry *tools.ToolRegistry,
	apiKeys map[ProviderType]string,
	baseUrls map[ProviderType]string,
) *DefaultLLMFactory {
	return &DefaultLLMFactory{
		logger:       logger,
		toolRegistry: toolRegistry,
		apiKeys:      apiKeys,
		baseUrls:     baseUrls,
	}
}

// CreateLLM creates an LLM instance based on the provided providerType and model.
func (f *DefaultLLMFactory) CreateLLM(ctx context.Context, providerType ProviderType, model string) (LLM, error) {
	apiKey := f.apiKeys[providerType]
	baseURL := f.baseUrls[providerType]

	switch providerType {
	case ProviderGemini:
		if apiKey == "" {
			apiKey = os.Getenv("GEMINI_API_KEY")
		}
		if apiKey == "" {
			return nil, fmt.Errorf("missing GEMINI_API_KEY for Gemini provider")
		}
		client, err := NewGeminiClient(ctx, apiKey)
		if err != nil {
			return nil, fmt.Errorf("failed to create gemini client: %w", err)
		}
		genaiTools := f.toolRegistry.ConvertToGenaiTools()
		return NewGemini(client, f.logger, model, genaiTools, f.toolRegistry), nil

	case ProviderGroq:
		if apiKey == "" {
			apiKey = os.Getenv("GROQ_API_KEY")
		}
		if apiKey == "" {
			return nil, fmt.Errorf("missing GROQ_API_KEY for Groq provider")
		}
		return NewGroq(apiKey, f.logger, model, f.toolRegistry), nil

	case ProviderOllama:
		if baseURL == "" {
			baseURL = os.Getenv("OLLAMA_BASE_URL")
			if baseURL == "" {
				baseURL = "http://localhost:11434" // TODO: put that in config
			}
		}
		ollamaLLM := NewOllama(baseURL, f.logger, model, f.toolRegistry)

		// Check for Gemini API key for embeddings fallback if Ollama is used
		geminiKey := os.Getenv("GEMINI_API_KEY")
		if geminiKey != "" {
			geminiClient, err := NewGeminiClient(ctx, geminiKey)
			if err == nil {
				embeddingProvider := NewGemini(geminiClient, f.logger, "text-embedding-004", nil, nil)
				return NewEmbeddingFallbackLLM(ollamaLLM, embeddingProvider), nil
			}
			f.logger.Warn("Failed to create Gemini client for embeddings fallback, continuing with Ollama only", zap.Error(err))
		} else {
			f.logger.Warn("No Gemini API key found for embeddings fallback with Ollama. Ollama will attempt to use local embedding models.")
		}
		return ollamaLLM, nil

	default:
		return nil, fmt.Errorf("unsupported provider: %s", providerType)
	}
}
