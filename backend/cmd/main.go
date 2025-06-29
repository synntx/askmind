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

	requiredEnvVars := []string{"DB_URI", "AUTH_PEPPER"}

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

	// image := tools.NewImageSearchTool()
	page := tools.NewWebPageStructureAnalyzerTool()
	image_extractor := tools.NewWebImageExtractorTool()

	toolRegistry.Register(webSearchToolInstance)
	toolRegistry.Register(reddit)
	toolRegistry.Register(youtube)
	toolRegistry.Register(research)
	// toolRegistry.Register(image)
	toolRegistry.Register(page)
	toolRegistry.Register(image_extractor)

	toolRegistry.Register(notionTool)

	apiKeys := map[llm.ProviderType]string{
		llm.ProviderGemini: os.Getenv("GEMINI_API_KEY"),
		llm.ProviderGroq:   os.Getenv("GROQ_API_KEY"),
	}

	baseUrls := map[llm.ProviderType]string{
		llm.ProviderOllama: os.Getenv("OLLAMA_BASE_URL"),
	}

	llmFactory := llm.NewDefaultLLMFactory(logger, toolRegistry, apiKeys, baseUrls)

	muxRouter := router.NewRouter(os.Getenv("DB_URI"), os.Getenv("AUTH_PEPPER"), logger, llmFactory)
	router := muxRouter.CreateRoutes(ctx)

	logger.Info("Listening on port 8080")
	http.ListenAndServe(":8080", router)
}
