package main

import (
	"context"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/synntx/askmind/internal/llm"
	"github.com/synntx/askmind/internal/router"
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

	gemini := llm.NewGemini(client, logger, "gemini-1.5-pro")

	muxRouter := router.NewRouter(os.Getenv("DB_URI"), os.Getenv("AUTH_PEPPER"), logger, gemini)
	router := muxRouter.CreateRoutes(ctx)

	logger.Info("Listening on port 8080")
	http.ListenAndServe(":8080", router)
}
