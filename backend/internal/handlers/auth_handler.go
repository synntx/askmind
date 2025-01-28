package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/service"
	"github.com/synntx/askmind/internal/utils"
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
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("Invalid request body"),
		))
		return
	}

	switch {
	case req.Email == "":
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("Email is required"),
		))
		return
	case req.Password == "":
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("Password is required"),
		))
	case req.FirstName == "":
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("FirstName is required"),
		))
	case req.LastName == "":
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("LastName is required"),
		))
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
			utils.HandleError(w, h.logger, utils.ErrEmailExists.Wrap(
				fmt.Errorf("Email Already registered"),
			))
		default:
			utils.HandleError(w, h.logger, utils.ErrInternal.Wrap(err))
		}
		return
	}

	h.logger.Info("User registered successfully",
		zap.String("email", user.Email),
		zap.String("event", "register"),
	)

	utils.SendResponse(w, http.StatusCreated, user)
}

func (h *AuthHandlers) LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("Invalid request body"),
		))
		return
	}

	user, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidCredentials):
			utils.HandleError(w, h.logger, utils.ErrInvalidCredentials.Wrap(
				fmt.Errorf("Invalid email or password"),
			))
		default:
			utils.HandleError(w, h.logger, utils.ErrInternal.Wrap(err))
		}
		return
	}

	token, err := utils.GenerateToken(user.UserId.String(), time.Now().Add(time.Hour*24*30))
	response := AuthResponse{User: user, Token: token}

	h.logger.Info("User logged in successfully",
		zap.String("email", user.Email),
		zap.String("event", "login"),
	)

	utils.SendResponse(w, http.StatusOK, response)
}

func (h *AuthHandlers) UpdatePasswordHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(utils.ClaimsKey).(*utils.Claims)
	if !ok || claims == nil {
		utils.HandleError(w, h.logger, utils.ErrUnauthorized.Wrap(
			fmt.Errorf("missing Claims in context"),
		))
		return
	}

	var req UpdatePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("Invalid request body"),
		))
		return
	}

	if err := h.authService.UpdatePassword(r.Context(), claims.UserId, req.OldPassword, req.NewPassword); err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidCredentials):
			utils.HandleError(w, h.logger, utils.ErrInvalidCredentials.Wrap(
				fmt.Errorf("Invalid email or password"),
			))
		default:
			utils.HandleError(w, h.logger, utils.ErrInternal.Wrap(err))
		}
		return
	}
}
