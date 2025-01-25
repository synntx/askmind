package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/service"
	"go.uber.org/zap"
)

type AuthHandlers struct {
	authService service.AuthService
	logger      *zap.Logger
}

func NewAuthHandlers(authService service.AuthService, logger *zap.Logger) *AuthHandlers {
	return &AuthHandlers{authService: authService, logger: logger}
}

type RegisterRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UpdatePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

type AuthResponse struct {
	User  *models.User `json:"user"`
	Token string       `json:"token,omitempty"`
}

func (h *AuthHandlers) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.FirstName == "" || req.LastName == "" {
		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}

	user := &models.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Password:  req.Password,
	}

	if err := h.authService.Register(r.Context(), user); err != nil {
		switch {
		case errors.Is(err, service.ErrEmailExists):
			http.Error(w, "Email already registered", http.StatusConflict)
		default:
			http.Error(w, "Registration failed", http.StatusInternalServerError)
		}
		return
	}

	h.logger.With(
		zap.String("email", user.Email),
		zap.String("event", "register"),
	).Info("User registered successfully")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(AuthResponse{User: user})
}

func (h *AuthHandlers) LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	user, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidCredentials):
			http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		default:
			http.Error(w, "Login failed", http.StatusInternalServerError)
		}
		return
	}

	// TODO: generate a JWT token
	// token, err := GenerateJWT(user)
	// response := AuthResponse{User: user, Token: token}

	h.logger.With(
		zap.String("email", user.Email),
		zap.String("event", "login"),
	).Info("User logged in successfully")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{User: user})
}

func (h *AuthHandlers) UpdatePasswordHandler(w http.ResponseWriter, r *http.Request) {
	var req UpdatePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// WARN: Get the user Id from the cookies / use middleware
	h.authService.UpdatePassword(r.Context(), "", req.OldPassword, req.NewPassword)

	// 1. Parse the request body
	// 2. Validate the request body
	// 3. Update the password
}
