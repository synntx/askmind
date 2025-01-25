package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/synntx/askmind/internal/db/postgres"
	"github.com/synntx/askmind/internal/handlers"
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
		requirePOST(logger),
		contentTypeJSON,
		recoverPanic(logger)))

}

func middlewareChain(h http.HandlerFunc, middlewares ...func(http.HandlerFunc) http.HandlerFunc) http.Handler {
	for _, mw := range middlewares {
		h = mw(h)
	}
	return h
}

func contentTypeJSON(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next(w, r)
	}
}

func recoverPanic(logger *zap.Logger) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					logger.Error("Panic recovered",
						zap.Any("error", err),
						zap.String("path", r.URL.Path),
					)
					http.Error(w, `{"error":"Internal server error"}`, http.StatusInternalServerError)
				}
			}()
			next(w, r)
		}
	}
}

func requirePOST(logger *zap.Logger) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				logger.Warn("Invalid method attempted",
					zap.String("method", r.Method),
					zap.String("path", r.URL.Path),
				)
				http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
				return
			}
			next(w, r)
		}
	}
}

type responseWriter struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func wrapResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{ResponseWriter: w}
}

func (rw *responseWriter) Status() int {
	return rw.status
}

func (rw *responseWriter) WriteHeader(code int) {
	if rw.wroteHeader {
		return
	}

	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
	rw.wroteHeader = true

	return
}

func LoggingMiddleware(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		fn := func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					w.WriteHeader(http.StatusInternalServerError)
					logger.Error("Panic recovered",
						zap.Any("error", err),
						zap.String("path", r.URL.Path),
					)
				}
			}()

			start := time.Now()
			wrapped := wrapResponseWriter(w)
			next.ServeHTTP(wrapped, r)

			logger.Info("Request completed",
				zap.String("path", r.URL.Path),
				zap.String("method", r.Method),
				zap.Int("status", wrapped.Status()),
				zap.Duration("took", time.Since(start)),
			)
		}

		return http.HandlerFunc(fn)
	}
}
