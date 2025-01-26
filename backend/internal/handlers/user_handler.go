// -------------------------------------
//    User handlers (user_handler.go)
// -------------------------------------

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/service"
	"github.com/synntx/askmind/internal/utils"
	"go.uber.org/zap"
)

type UserHandlers struct {
	userService service.UserService
	logger      *zap.Logger
}

// TODO: put constants in seprate constant file
type contextKey = string

const UserIdKey contextKey = "userId"

type UpdateUserEmailRequest struct {
	NewEmail string `json:"new_email" validate:"required,email"`
}

func NewUserHandlers(userService service.UserService, logger *zap.Logger) *UserHandlers {
	return &UserHandlers{userService: userService, logger: logger}
}

func (h *UserHandlers) GetUserHandler(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(UserIdKey).(string)
	if !ok || userId == "" {
		utils.HandleError(w, h.logger, utils.ErrUnauthorized.Wrap(
			fmt.Errorf("missing user ID in context"),
		))
		return
	}

	user, err := h.userService.GetUser(r.Context(), userId)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	h.logger.Info("user_retrieved",
		zap.String("user_id", userId),
		zap.String("event", "get_user"),
	)

	utils.SendResponse(w, http.StatusOK, user)
}

func (h *UserHandlers) UpdateNameHandler(w http.ResponseWriter, r *http.Request) {

	userId, ok := r.Context().Value(UserIdKey).(string)
	if !ok || userId == "" {
		utils.HandleError(w, h.logger, utils.ErrUnauthorized.Wrap(
			fmt.Errorf("missing user ID in context"),
		))
		return
	}

	var req models.UpdateName
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(err))
		return
	}

	if req.FirstName == nil && req.LastName == nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.WithDetails(
			utils.ValidationError{
				Field:   "names",
				Message: "At least one name field (first_name or last_name) must be provided",
			},
		))
		return
	}

	err := h.userService.UpdateName(r.Context(), userId, &req)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	h.logger.Info("user_name_updated",
		zap.String("user_id", userId),
		zap.Any("new_name", req),
		zap.String("event", "update_name"),
	)

	utils.SendNoContent(w)
}

func (h *UserHandlers) UpdateEmailHandler(w http.ResponseWriter, r *http.Request) {

	userId, ok := r.Context().Value(UserIdKey).(string)
	if !ok || userId == "" {
		utils.HandleError(w, h.logger, utils.ErrUnauthorized.Wrap(
			fmt.Errorf("missing user ID in context"),
		))
		return
	}

	var req UpdateUserEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(err))
		return
	}

	if req.NewEmail == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing email field"),
		))
		return
	}

	err := h.userService.UpdateEmail(r.Context(), userId, req.NewEmail)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	h.logger.Info("user_email_updated",
		zap.String("user_id", userId),
		zap.String("event", "update_email"),
	)

	utils.SendNoContent(w)
}

func (h *UserHandlers) DeleteUserHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userId, ok := ctx.Value(UserIdKey).(string)

	if !ok || userId == "" {
		utils.HandleError(w, h.logger, utils.ErrUnauthorized.Wrap(
			fmt.Errorf("missing user ID in context"),
		))
		return
	}

	err := h.userService.DeleteUser(ctx, userId)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	h.logger.Info(
		"user_deleted",
		zap.String("user_id", userId),
		zap.String("operation", "DeleteUserHandler"),
	)

	utils.SendNoContent(w)
}
