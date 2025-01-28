package router

import (
	"context"
	"net/http"

	"github.com/synntx/askmind/internal/db/postgres"
	"github.com/synntx/askmind/internal/handlers"
	mw "github.com/synntx/askmind/internal/middleware"
	"github.com/synntx/askmind/internal/service"
	"go.uber.org/zap"
)

type Router struct {
	dbURL  string
	pepper string
	logger *zap.Logger
}

func NewRouter(dbURL, pepper string, logger *zap.Logger) *Router {
	return &Router{
		dbURL:  dbURL,
		pepper: pepper,
		logger: logger,
	}
}

// Creates all routes and wires up dependencies
// Order of operations: DB -> Services -> Handlers -> Routes
func (r *Router) CreateRoutes(ctx context.Context) *http.ServeMux {
	// connect to db (fatal if fails - no point running without data)
	db, err := postgres.NewPostgresDB(ctx, r.dbURL, r.logger)
	if err != nil {
		r.logger.Fatal("failed to connect to database", zap.Error(err))
	}

	if err := db.InitSchema(ctx); err != nil {
		r.logger.Fatal("failed to initialize database schema", zap.Error(err))
	}
	r.logger.Info("Database schema initialized successfully.")

	// init services
	// - bcrypt handles per-user salts automatically 🧂
	// - Pepper is our secret spice added BEFORE bcrypt hashing 🌶️
	authService := service.NewAuthService(db, r.pepper, r.logger)
	userService := service.NewUserService(db, r.logger)

	// HTTP handlers 🚦
	authHandlers := handlers.NewAuthHandlers(authService, r.logger)
	userHandlers := handlers.NewUserHandlers(userService, r.logger)

	mux := http.NewServeMux()

	// ----------------- ROUTES ----------------------

	// 🩺 Health check endpoint.
	mux.Handle("/health", middlewareChain(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		}),
		mw.RecoverPanic(r.logger),
	))

	// Auth routes (public)
	// Only `POST` method allowed
	// TODO: Public access, maybe rate limit later
	mux.Handle("/auth/register", publicRoute(
		http.HandlerFunc(authHandlers.RegisterHandler),
		http.MethodPost, r.logger))

	mux.Handle("/auth/login", publicRoute(
		http.HandlerFunc(authHandlers.LoginHandler),
		http.MethodPost, r.logger))

	// Protected route
	mux.Handle("/auth/password", protectedRoute(
		http.HandlerFunc(authHandlers.UpdatePasswordHandler),
		http.MethodPut, r.logger))

	// user profile routes
	mux.Handle("/me/get", protectedRoute(
		http.HandlerFunc(userHandlers.GetUserHandler),
		http.MethodGet, r.logger))

	mux.Handle("/me/name", protectedRoute(
		http.HandlerFunc(userHandlers.UpdateNameHandler),
		http.MethodPut, r.logger))

	// TODO: Add email confirmation
	mux.Handle("/me/email", protectedRoute(
		http.HandlerFunc(userHandlers.UpdateEmailHandler),
		http.MethodPut, r.logger))

	mux.Handle("/me/delete", protectedRoute(
		http.HandlerFunc(userHandlers.DeleteUserHandler),
		http.MethodDelete, r.logger))

	return mux
}

func middlewareChain(h http.Handler, middlewares ...mw.Middleware) http.Handler {
	for _, mw := range middlewares {
		h = mw(h)
	}
	return h
}

func publicRoute(h http.Handler, method string, logger *zap.Logger) http.Handler {
	return middlewareChain(
		h,
		mw.RequireMethod(method, logger),
		mw.LoggingMiddleware(logger),
		mw.RecoverPanic(logger),
	)
}

func protectedRoute(h http.Handler, method string, logger *zap.Logger) http.Handler {
	return middlewareChain(
		h,
		mw.AuthMiddleware(logger),
		mw.RequireMethod(method, logger),
		mw.LoggingMiddleware(logger),
		mw.RecoverPanic(logger),
	)
}
