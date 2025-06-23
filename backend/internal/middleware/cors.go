package middleware

import (
	"net/http"
	"slices"
	"strconv"
	"strings"

	"go.uber.org/zap"
)

type CORSConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	AllowCredentials bool
	MaxAge           int
}

func NewCORSConfig() *CORSConfig {
	return &CORSConfig{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Content-Length", "Accept-Encoding", "Authorization", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300,
	}
}

func CORSWithConfig(config *CORSConfig, logger *zap.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			allowedOrigin := "*"
			if len(config.AllowedOrigins) > 0 && config.AllowedOrigins[0] != "*" {
				if slices.Contains(config.AllowedOrigins, origin) {
					allowedOrigin = origin
				}
				// for _, allowed := range config.AllowedOrigins {
				// 	if allowed == origin {
				// 		allowedOrigin = origin
				// 		break
				// 	}
				// }
			}

			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", strings.Join(config.AllowedMethods, ", "))
			w.Header().Set("Access-Control-Allow-Headers", strings.Join(config.AllowedHeaders, ", "))

			if config.AllowCredentials {
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			if config.MaxAge > 0 {
				w.Header().Set("Access-Control-Max-Age", strconv.Itoa(config.MaxAge))
			}

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				logger.Debug("Handled CORS preflight request",
					zap.String("path", r.URL.Path),
					zap.String("origin", origin),
					zap.String("allowed_origin", allowedOrigin),
				)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
