package router

import (
	"context"
	"net/http"

	"github.com/synntx/askmind/internal/db/postgres"
	"github.com/synntx/askmind/internal/handlers"
	"github.com/synntx/askmind/internal/llm"
	mw "github.com/synntx/askmind/internal/middleware"
	"github.com/synntx/askmind/internal/service"
	"go.uber.org/zap"
)

type Router struct {
	dbURL      string
	pepper     string
	logger     *zap.Logger
	llmFactory llm.LLMFactory
}

func NewRouter(dbURL, pepper string, logger *zap.Logger, llmFactory llm.LLMFactory) *Router {
	return &Router{
		dbURL:      dbURL,
		pepper:     pepper,
		logger:     logger,
		llmFactory: llmFactory,
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
	spaceService := service.NewSpaceService(db, r.logger)
	convService := service.NewConversationService(db, r.logger)
	msgService := service.NewMessageService(db, r.logger)

	// HTTP handlers 🚦
	authHandlers := handlers.NewAuthHandlers(authService, r.logger)
	userHandlers := handlers.NewUserHandlers(userService, r.logger)
	spaceHandlers := handlers.NewSpaceHandler(spaceService, r.logger)
	convHandlers := handlers.NewConversationService(convService, r.logger)
	msgHandlers := handlers.NewMessageHandler(msgService, r.logger, r.llmFactory)

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

	// SPACE ROUTES
	mux.Handle("/space", protectedRoute(
		http.HandlerFunc(spaceHandlers.CreateSpaceHandler),
		http.MethodPost, r.logger))

	mux.Handle("/space/get", protectedRoute(
		http.HandlerFunc(spaceHandlers.GetSpaceHandler),
		http.MethodGet, r.logger))

	mux.Handle("/space/list", protectedRoute(
		http.HandlerFunc(spaceHandlers.ListSpacesForUserHandler),
		http.MethodGet, r.logger))

	mux.Handle("/space/update", protectedRoute(
		http.HandlerFunc(spaceHandlers.UpdateSpaceHandler),
		http.MethodPut, r.logger))

	mux.Handle("/space/delete", protectedRoute(
		http.HandlerFunc(spaceHandlers.DeleteSpaceHandler),
		http.MethodDelete, r.logger))

	// Conversation Routes
	mux.Handle("/c/create", protectedRoute(
		http.HandlerFunc(convHandlers.CreateConversationHandler),
		http.MethodPost,
		r.logger))

	mux.Handle("/c/get", protectedRoute(
		http.HandlerFunc(convHandlers.GetConversationHandler),
		http.MethodGet,
		r.logger))

	mux.Handle("/c/update/title", protectedRoute(
		http.HandlerFunc(convHandlers.UpdateConversationTitleHandler),
		http.MethodPut,
		r.logger))

	mux.Handle("/c/update/status", protectedRoute(
		http.HandlerFunc(convHandlers.UpdateConversationStatusHandler),
		http.MethodPut,
		r.logger))

	mux.Handle("/c/delete", protectedRoute(
		http.HandlerFunc(convHandlers.DeleteConversationHandler),
		http.MethodDelete,
		r.logger))

	mux.Handle("/c/list/space", protectedRoute(
		http.HandlerFunc(convHandlers.ListConversationsForSpaceHandler),
		http.MethodGet,
		r.logger))

	mux.Handle("/c/list/user", protectedRoute(
		http.HandlerFunc(convHandlers.ListActiveConversationsForUserHandler),
		http.MethodGet,
		r.logger))

	// Message Routes
	mux.Handle("/msg/create", protectedRoute(
		http.HandlerFunc(msgHandlers.CreateMessageHandler),
		http.MethodPost,
		r.logger))

	mux.Handle("/msg/create/messages", protectedRoute(
		http.HandlerFunc(msgHandlers.CreateMessagesHandler),
		http.MethodPost,
		r.logger))

	mux.Handle("/msg/get", protectedRoute(
		http.HandlerFunc(msgHandlers.GetMessageHandler),
		http.MethodGet,
		r.logger))

	mux.Handle("/msg/get/msgs", protectedRoute(
		http.HandlerFunc(msgHandlers.GetConvUserMessageHandler),
		http.MethodGet,
		r.logger))

	mux.Handle("/msg/get/all-msgs", protectedRoute(
		http.HandlerFunc(msgHandlers.GetConvMessageHandler),
		http.MethodGet,
		r.logger))

	corsConfig := mw.NewCORSConfig()
	corsConfig.AllowedOrigins = []string{"http://localhost:3000", "http://172.22.181.121:3000"}

	mux.Handle("/c/completion", middlewareChain(
		http.HandlerFunc(msgHandlers.CompletionHandler),
		mw.AuthMiddleware(r.logger),
		mw.RequireMethod(http.MethodPost, r.logger),
		mw.RecoverPanic(r.logger),
		mw.CORSWithConfig(corsConfig, r.logger),
	))

	return mux
}

func middlewareChain(h http.Handler, middlewares ...mw.Middleware) http.Handler {
	for _, mw := range middlewares {
		h = mw(h)
	}
	return h
}

func publicRoute(h http.Handler, method string, logger *zap.Logger) http.Handler {
	corsConfig := mw.NewCORSConfig()
	corsConfig.AllowedOrigins = []string{"http://localhost:3000", "http://172.22.181.121:3000"}

	return middlewareChain(
		h,
		mw.RequireMethod(method, logger),
		mw.LoggingMiddleware(logger),
		mw.RecoverPanic(logger),
		mw.CORSWithConfig(corsConfig, logger),
	)
}

func protectedRoute(h http.Handler, method string, logger *zap.Logger) http.Handler {
	corsConfig := mw.NewCORSConfig()
	corsConfig.AllowedOrigins = []string{"http://localhost:3000", "http://172.22.181.121:3000"}

	return middlewareChain(
		h,
		mw.AuthMiddleware(logger),
		mw.RequireMethod(method, logger),
		mw.LoggingMiddleware(logger),
		mw.RecoverPanic(logger),
		mw.CORSWithConfig(corsConfig, logger),
	)
}
