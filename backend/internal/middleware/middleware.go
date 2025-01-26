package middleware

import (
	"go.uber.org/zap"
	"net/http"
	"time"
)

func ContentTypeJSON(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next(w, r)
	}
}

func RecoverPanic(logger *zap.Logger) func(http.HandlerFunc) http.HandlerFunc {
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

func RequirePOST(logger *zap.Logger) func(http.HandlerFunc) http.HandlerFunc {
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
