package handlers

import (
	"net/http"

	"github.com/synntx/askmind/internal/service"
)

type AuthHandlers struct {
	authService service.AuthService
}

func NewAuthHandlers(authService service.AuthService) *AuthHandlers {
	return &AuthHandlers{authService: authService}
}

func (h *AuthHandlers) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	// ... parse request
	// user := ...
	// err := h.authService.Register(r.Context(), user)
	// ... handle response
}

func (h *AuthHandlers) LoginHandler(w http.ResponseWriter, r *http.Request) {
	// ... parse request
	// user := ...
	// err := h.authService.Login(r.Context(), user)
	// ... handle response
}
