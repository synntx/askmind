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
	logger, err := zap.NewProduction()
	if err != nil {
		panic("failed to create logger: " + err.Error())
	}
	defer logger.Sync()

	// Load the env
	err = godotenv.Load()
	if err != nil {
		logger.Error("Error loading .env file", zap.Error(err))
	}

	requiredEnvVars := []string{"GEMINI_API_KEY", "DB_URI", "AUTH_PEPPER"}
	for _, envVar := range requiredEnvVars {
		if os.Getenv(envVar) == "" {
			logger.Fatal("Missing required environment variable", zap.String("envVar", envVar))
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	client, err := llm.NewGeminiClient(ctx, os.Getenv("GEMINI_API_KEY"))
	if err != nil {
		panic("failed to create gemini client: " + err.Error())
	}

	toolRegistry := tools.NewToolRegistry()
	webSearchToolInstance := tools.NewWebSearchTool()
	reddit := tools.NewRedditSubredditScraperTool()
	youtube, err := tools.NewYouTubeSearchTool()
	if err != nil {
		log.Fatalf("Error creating YouTube tool: %v", err)
	}
	research, err := tools.NewResearchTool(webSearchToolInstance, youtube)
	if err != nil {
		log.Fatalf("Error creating YouTube tool: %v", err)
	}

	image := tools.NewImageSearchTool()
	page := tools.NewWebPageStructureAnalyzerTool()

	toolRegistry.Register(webSearchToolInstance)
	toolRegistry.Register(reddit)
	toolRegistry.Register(youtube)
	toolRegistry.Register(research)
	toolRegistry.Register(image)
	toolRegistry.Register(page)
	genaiTools := toolRegistry.ConvertToGenaiTools()

	// gemini-2.5-pro-exp-03-25
	// gemini-2.0-flash-lite
	// gemini-2.5-flash-preview-04-17
	LLM_MODEL := "gemini-2.5-flash-preview-04-17"

	gemini := llm.NewGemini(client, logger, LLM_MODEL, genaiTools, toolRegistry)

	muxRouter := router.NewRouter(os.Getenv("DB_URI"), os.Getenv("AUTH_PEPPER"), logger, gemini)
	router := muxRouter.CreateRoutes(ctx)

	logger.Info("Listening on port 8080")
	http.ListenAndServe(":8080", router)
}
