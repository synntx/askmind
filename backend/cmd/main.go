package main

import (
	"context"
	"net/http"
	"os"

	"github.com/synntx/askmind/internal/router"
	"go.uber.org/zap"
)

func main() {

	logger, err := zap.NewProduction()
	if err != nil {
		panic("failed to create logger: " + err.Error())
	}
	defer logger.Sync()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	muxRouter := router.NewRouter(os.Getenv("DATABASE_URL"), os.Getenv("AUTH_PEPPER"), logger)
	router := muxRouter.CreateRoutes(ctx)

	logger.Info("Listening on port 8080")
	http.ListenAndServe(":8080", router)
}
