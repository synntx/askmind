package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/synntx/askmind/internal/utils"
	"go.uber.org/zap"
)

type Middleware func(http.Handler) http.Handler

func RecoverPanic(logger *zap.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					logger.Error("Panic recovered",
						zap.Any("error", err),
						zap.String("path", r.URL.Path),
					)
					utils.HandleError(w, logger, utils.ErrInternal.Wrap(fmt.Errorf("%v", err)))
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

func RequireMethod(method string, logger *zap.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != method {
				logger.Warn("Invalid method",
					zap.String("method", r.Method),
					zap.String("path", r.URL.Path),
				)
				http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
				return
			}
			next.ServeHTTP(w, r)
		})
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
}

func LoggingMiddleware(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		fn := func(w http.ResponseWriter, r *http.Request) {
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

func AuthMiddleware(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		fn := func(w http.ResponseWriter, r *http.Request) {
			tokenHeader := r.Header.Get("Authorization")
			if tokenHeader == "" {
				logger.Warn("missing authorization header")
				utils.HandleError(w, logger, utils.ErrUnauthorized.Wrap(fmt.Errorf("missing token")))
				return
			}

			token, err := ExtractToken(tokenHeader)
			if err != nil {
				logger.Error("failed to extract token",
					zap.Error(err),
					zap.String("header_value", maskSensitive(tokenHeader)),
				)

				utils.HandleError(w, logger, utils.ErrUnauthorized.Wrap(err))
				return
			}

			claims, err := utils.VerifyToken(token)
			if err != nil {
				logger.Error("invalid token",
					zap.Error(err),
					zap.String("token_prefix", tokenPrefix(token)),
				)
				utils.HandleError(w, logger, utils.ErrUnauthorized.Wrap(err))
				return
			}

			if claims.ExpiresAt.Before(time.Now()) {
				logger.Warn("expired token",
					zap.Time("expires_at", claims.ExpiresAt.Time),
					zap.Time("current_time", time.Now()),
				)
				utils.HandleError(w, logger, utils.ErrUnauthorized.Wrap(fmt.Errorf("token expired")))
				return
			}

			ctx := context.WithValue(r.Context(), utils.ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		}
		return http.HandlerFunc(fn)
	}
}

func ExtractToken(token string) (string, error) {
	parts := strings.Split(token, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", fmt.Errorf("invalid token format")
	}
	return parts[1], nil
}

func maskSensitive(token string) string {
	if len(token) < 8 {
		return "*****"
	}
	return token[:4] + "****" + token[len(token)-4:]
}

func tokenPrefix(token string) string {
	if len(token) < 8 {
		return "*****"
	}
	return token[:4] + "****"
}
