package main

import (
	"context"
	"net/http"
	"os"

	"github.com/synntx/askmind/internal/db/postgres"
	"github.com/synntx/askmind/internal/handlers"
	"github.com/synntx/askmind/internal/middleware"
	"github.com/synntx/askmind/internal/service"
	"go.uber.org/zap"
)

func main() {

	logger, _ := zap.NewProduction()
	defer logger.Sync()

	dbURL := os.Getenv("DATABASE_URL")
	pepper := os.Getenv("AUTH_PEPPER")

	ctx := context.Background()

	db, _ := postgres.NewPostgresDB(ctx, dbURL, logger)

	authService := service.NewAuthService(db, pepper, logger)

	authHandlers := handlers.NewAuthHandlers(authService, logger)

	mux := http.NewServeMux()

	mux.Handle("/auth/register", middlewareChain(
		authHandlers.RegisterHandler,
		middleware.RequirePOST(logger),
		middleware.ContentTypeJSON,
		middleware.RecoverPanic(logger)))

}

func middlewareChain(h http.HandlerFunc, middlewares ...func(http.HandlerFunc) http.HandlerFunc) http.Handler {
	for _, mw := range middlewares {
		h = mw(h)
	}
	return h
}
