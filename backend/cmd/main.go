package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/synntx/askmind/internal/llm"
	"github.com/synntx/askmind/internal/router"
	"github.com/synntx/askmind/internal/tools"
	"go.uber.org/zap"
)

func main() {
	logger, err := zap.NewDevelopment()
	if err != nil {
		panic("failed to create logger: " + err.Error())
	}
	defer logger.Sync()

	// Load the env
	err = godotenv.Load()
	if err != nil {
		logger.Error("Error loading .env file", zap.Error(err))
	}

	providerType := llm.ProviderType(os.Getenv("LLM_PROVIDER"))
	if providerType == "" {
		providerType = llm.ProviderGemini
	}

	requiredEnvVars := []string{"DB_URI", "AUTH_PEPPER"}

	// Add provider-specific API key requirement
	switch providerType {
	case llm.ProviderGemini:
		requiredEnvVars = append(requiredEnvVars, "GEMINI_API_KEY")
	case llm.ProviderGroq:
		requiredEnvVars = append(requiredEnvVars, "GROQ_API_KEY")
	case llm.ProviderOllama:
		// Ollama doesn't require an API key
	}

	for _, envVar := range requiredEnvVars {
		if os.Getenv(envVar) == "" {
			logger.Fatal("Missing required environment variable", zap.String("envVar", envVar))
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Create tool registry
	toolRegistry := tools.NewToolRegistry()
	webSearchToolInstance := tools.NewWebSearchTool()
	reddit := tools.NewRedditSubredditScraperTool()
	youtube, err := tools.NewYouTubeSearchTool()
	if err != nil {
		log.Fatalf("Error creating YouTube tool: %v", err)
	}
	research, err := tools.NewResearchTool(webSearchToolInstance, youtube)
	if err != nil {
		log.Fatalf("Error creating Research tool: %v", err)
	}

	notionClient, err := tools.NewNotionClient()
	if err != nil {
		log.Fatalf("Error creating Notion client: %v", err)
	}
	notionTool := tools.NewNotionTool(notionClient)

	image := tools.NewImageSearchTool()
	page := tools.NewWebPageStructureAnalyzerTool()
	image_extractor := tools.NewWebImageExtractorTool()

	toolRegistry.Register(webSearchToolInstance)
	toolRegistry.Register(reddit)
	toolRegistry.Register(youtube)
	toolRegistry.Register(research)
	toolRegistry.Register(image)
	toolRegistry.Register(page)
	toolRegistry.Register(image_extractor)

	toolRegistry.Register(notionTool)

	// Get model from env or use defaults
	model := os.Getenv("LLM_MODEL")
	if model == "" {
		switch providerType {
		case llm.ProviderGemini:
			model = "gemini-2.0-flash"
		case llm.ProviderGroq:
			model = "mistral-saba-24b"
			// model = "meta-llama/llama-4-scout-17b-16e-instruct"
		case llm.ProviderOllama:
			model = "llama3.2"
		}
	}

	// Get API key based on provider
	var apiKey string
	switch providerType {
	case llm.ProviderGemini:
		apiKey = os.Getenv("GEMINI_API_KEY")
	case llm.ProviderGroq:
		apiKey = os.Getenv("GROQ_API_KEY")
	case llm.ProviderOllama:
		// No API key needed for Ollama
		apiKey = ""
	}

	// Get base URL for Ollama
	baseURL := os.Getenv("OLLAMA_BASE_URL")
	if baseURL == "" && providerType == llm.ProviderOllama {
		baseURL = "http://localhost:11434" // Default Ollama URL
	}

	// Create LLM provider
	llmProvider, err := llm.NewLLMProvider(ctx, llm.ProviderConfig{
		Type:         providerType,
		APIKey:       apiKey,
		Model:        model,
		ToolRegistry: toolRegistry,
		BaseURL:      baseURL,
	}, logger)
	if err != nil {
		logger.Fatal("Failed to create LLM provider",
			zap.Error(err),
			zap.String("provider", string(providerType)),
			zap.String("model", model))
	}

	logger.Info("LLM provider initialized",
		zap.String("provider", llmProvider.GetProviderName()),
		zap.String("model", llmProvider.GetModelName()))

	// Add other LLM providers here which don't have embedding models
	if providerType == llm.ProviderOllama {
		geminiKey := os.Getenv("GEMINI_API_KEY")
		if geminiKey != "" {
			geminiClient, err := llm.NewGeminiClient(ctx, geminiKey)
			if err == nil {
				embeddingProvider := llm.NewGemini(geminiClient, logger, "text-embedding-004", nil, nil)
				llmProvider = llm.NewEmbeddingFallbackLLM(llmProvider, embeddingProvider)
				logger.Info("Using Gemini for embeddings fallback with Ollama")
			}
		} else {
			logger.Warn("No Gemini API key found for embeddings fallback. Ollama will attempt to use local embedding models.")
		}
	}

	muxRouter := router.NewRouter(os.Getenv("DB_URI"), os.Getenv("AUTH_PEPPER"), logger, llmProvider)
	router := muxRouter.CreateRoutes(ctx)

	logger.Info("Listening on port 8080")
	http.ListenAndServe(":8080", router)
}
