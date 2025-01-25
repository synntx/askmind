// -------------------------------------
//    User handlers (user_handler.go)
// -------------------------------------

package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/synntx/askmind/internal/db/postgres"
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
		utils.SendError(w,
			utils.Unauthorized.HTTPStatus(),
			string(utils.Unauthorized),
			utils.Unauthorized.Message())
		return
	}

	user, err := h.userService.GetUser(r.Context(), userId)
	if err != nil {
		h.handleServiceError(w, err,
			"UpdateNameHandler -> h.userService.GetUserHandler : user not found",
			"User not found", userId)
		return
	}

	h.logger.With(
		zap.String("userId", user.UserId),
		zap.String("event", "get_user"),
	).Info("User retrieved successfully")

	utils.SendResponse(w, http.StatusOK, user)
}

func (h *UserHandlers) UpdateNameHandler(w http.ResponseWriter, r *http.Request) {

	userId, ok := r.Context().Value(UserIdKey).(string)
	if !ok || userId == "" {
		utils.SendError(w,
			utils.Unauthorized.HTTPStatus(),
			string(utils.Unauthorized),
			utils.Unauthorized.Message())
		return
	}

	var req models.UpdateName
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendError(w,
			utils.InvalidRequest.HTTPStatus(),
			string(utils.InvalidRequest),
			utils.InvalidRequest.Message())
		return
	}

	if req.FirstName == nil && req.LastName == nil {
		http.Error(w, "Provide either firstname or last name to update", http.StatusBadRequest)
		utils.SendError(w,
			utils.MissingField.HTTPStatus(),
			string(utils.MissingField),
			"provide either firstname or lastname")
		return
	}

	err := h.userService.UpdateName(r.Context(), userId, &req)
	if err != nil {
		h.handleServiceError(w, err,
			"user_handler -> UpdateNameHandler -> h.userService.UpdateName : update name failed",
			"unable to update name", userId)
		return
	}

	h.logger.With(
		zap.String("userId", userId),
		zap.String("event", "update_name"),
	).Info("User name updated successfully")

	utils.SendNoContent(w)
}

func (h *UserHandlers) UpdateEmailHandler(w http.ResponseWriter, r *http.Request) {

	userId, ok := r.Context().Value(UserIdKey).(string)
	if !ok || userId == "" {
		utils.SendError(w,
			utils.Unauthorized.HTTPStatus(),
			string(utils.Unauthorized),
			utils.Unauthorized.Message())
		return
	}

	var req UpdateUserEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendError(w,
			utils.InvalidRequest.HTTPStatus(),
			string(utils.InvalidRequest),
			utils.InvalidRequest.Message())
		return
	}

	if req.NewEmail == "" {
		utils.SendError(w,
			utils.MissingField.HTTPStatus(),
			string(utils.MissingField),
			utils.MissingField.Message())
		return
	}

	err := h.userService.UpdateEmail(r.Context(), userId, req.NewEmail)
	if err != nil {

		h.logger.With(
			zap.String("userId", userId),
			zap.String("event", "update_email"),
		).Sugar().Errorf("update email failed %v", err)

		h.handleServiceError(w, err,
			"user_handler -> UpdateNameHandler -> h.userService.UpdateEmail:  Update email failed",
			"unable to update email", userId)
		return
	}

	h.logger.With(
		zap.String("userId", userId),
		zap.String("event", "update_email"),
	).Info("User email updated successfully")

	utils.SendNoContent(w)
}

func (h *UserHandlers) DeleteUserHandler(w http.ResponseWriter, r *http.Request) {

	userId, ok := r.Context().Value(UserIdKey).(string)
	if !ok || userId == "" {
		utils.SendError(w,
			utils.Unauthorized.HTTPStatus(),
			string(utils.Unauthorized),
			utils.Unauthorized.Message())
		return
	}

	err := h.userService.DeleteUser(r.Context(), userId)
	if err != nil {
		h.handleServiceError(w, err,
			"user_handler -> UpdateNameHandler -> h.userService.UpdateEmail : Delete user failed",
			"Unable to delete user", userId)
		return
	}

	h.logger.With(
		zap.String("userId", userId),
		zap.String("event", "delete_user"),
	).Info("User deleted successfully")

	utils.SendNoContent(w)
}

func (h *UserHandlers) handleServiceError(w http.ResponseWriter, err error, internalMsg, message string, userId ...string) {
	var pgErr *pgconn.PgError
	switch {
	case errors.Is(err, postgres.ErrUserNotFound):
		utils.SendError(w, utils.UserNotFound.HTTPStatus(), string(utils.UserNotFound), utils.UserNotFound.Message())
	case errors.As(err, &pgErr):
		if len(userId) > 0 {
			h.logger.Error("Database error",
				zap.String("user_id", userId[0]),
				zap.String("sql_state", pgErr.SQLState()),
				zap.Error(err),
			)
		} else {
			h.logger.Error("Database error",
				zap.String("sql_state", pgErr.SQLState()),
				zap.Error(err),
			)
		}
		utils.SendError(w, utils.DatabaseError.HTTPStatus(), string(utils.DatabaseError), utils.DatabaseError.Message())
	default:
		logger := h.logger
		if len(userId) > 0 {
			logger = logger.With(zap.String("userId", userId[0]))
		}
		logger.Sugar().Errorf("%s : %v", internalMsg, err)

		utils.SendError(w,
			utils.InternalServerError.HTTPStatus(),
			string(utils.InternalServerError),
			message)
	}
}
