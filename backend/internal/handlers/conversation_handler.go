package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/service"
	"github.com/synntx/askmind/internal/utils"
	"go.uber.org/zap"
)

type ConversationHandler struct {
	cs     service.ConversationService
	logger *zap.Logger
}

func NewConversationService(cservice service.ConversationService, logger *zap.Logger) *ConversationHandler {
	return &ConversationHandler{
		cs:     cservice,
		logger: logger,
	}
}

// Routes :
// 1. /c/create
// 2. /c/get?conv_id=asd;isdh
// 3. /c/update/title?title=fhsfh&conv_id=shfliadshi
// 4. /c/update/status?status=sfhsj&conv_id=sdfhish
// 5. /c/delete?conv_id=sdfhish
// 6. /c/list/space?space_id=sdfh;oij
// 7. /c/list/user

func (h *ConversationHandler) CreateConversationHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(utils.ClaimsKey).(*utils.Claims)
	if !ok || claims == nil {
		utils.HandleError(w, h.logger, utils.ErrUnauthorized.Wrap(
			fmt.Errorf("missing Claims in context"),
		))
		return
	}

	var req models.CreateConversationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(err))
		return
	}

	userId, err := uuid.Parse(claims.UserId)
	if err != nil {
		utils.HandleError(w, h.logger, utils.ErrUnauthorized.Wrap(err))
		return
	}

	if req.SpaceId == uuid.Nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required field space_id"),
		).WithDetails(utils.ValidationError{
			Field:   "space_id",
			Message: "space_id is required and must be a valid UUID",
		}))
		return
	}

	if req.Title == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required field title"),
		).WithDetails(utils.ValidationError{
			Field:   "title",
			Message: "'title' is required",
		}))
		return
	}

	conv := models.Conversation{
		SpaceId: req.SpaceId,
		UserId:  userId,
		Title:   req.Title,
		Status:  models.ConversationStatusActive,
	}

	conversation, err := h.cs.CreateConversation(r.Context(), &conv)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendResponse(w, http.StatusOK, conversation)
}

func (h *ConversationHandler) GetConversationHandler(w http.ResponseWriter, r *http.Request) {
	convId := r.FormValue("conv_id")
	if convId == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter conv_id"),
		).WithDetails(utils.ValidationError{
			Field:   "conv_id",
			Message: "'conv_id' is required",
		}))
		return
	}

	conv, err := h.cs.GetConversation(r.Context(), convId)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendResponse(w, http.StatusOK, conv)
}

func (h *ConversationHandler) UpdateConversationTitleHandler(w http.ResponseWriter, r *http.Request) {
	convId := r.FormValue("conv_id")
	if convId == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter 'conv_id'"),
		).WithDetails(utils.ValidationError{
			Field:   "conv_id",
			Message: "'conv_id' is required",
		}))
		return
	}

	title := r.FormValue("title")
	if title == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter 'title'"),
		).WithDetails(utils.ValidationError{
			Field:   "title",
			Message: "'title' is required",
		}))
		return
	}

	err := h.cs.UpdateConversationTitle(r.Context(), convId, title)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendNoContent(w)
}

func (h *ConversationHandler) UpdateConversationStatusHandler(w http.ResponseWriter, r *http.Request) {
	convId := r.FormValue("conv_id")
	if convId == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter 'conv_id'"),
		).WithDetails(utils.ValidationError{
			Field:   "conv_id",
			Message: "'conv_id' is required",
		}))
		return
	}

	statusVal := r.FormValue("status")
	if statusVal == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter 'status'"),
		).WithDetails(utils.ValidationError{
			Field:   "status",
			Message: "'status' is required",
		}))
		return
	}

	status, ok := IsValidConversationStatus(statusVal)
	if !ok {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("invalid conversation status"),
		).WithDetails(utils.ValidationError{
			Field:   "status",
			Message: `invalid status type, status can only be "active" or "archived"`,
		}))
		return

	}

	err := h.cs.UpdateConversationStatus(r.Context(), convId, status)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendNoContent(w)
}

func (h *ConversationHandler) DeleteConversationHandler(w http.ResponseWriter, r *http.Request) {
	convId := r.FormValue("conv_id")
	if convId == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter conv_id"),
		).WithDetails(utils.ValidationError{
			Field:   "conv_id",
			Message: "'conv_id' is required",
		}))
		return
	}

	err := h.cs.DeleteConversation(r.Context(), convId)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendNoContent(w)
}

func (h *ConversationHandler) ListConversationsForSpaceHandler(w http.ResponseWriter, r *http.Request) {
	spaceId := r.FormValue("space_id")
	if spaceId == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter space_id"),
		).WithDetails(utils.ValidationError{
			Field:   "space_id",
			Message: "space_id is required",
		}))
		return
	}

	convList, err := h.cs.ListConversationsForSpace(r.Context(), spaceId)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendResponse(w, http.StatusOK, convList)
}

func (h *ConversationHandler) ListActiveConversationsForUserHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(utils.ClaimsKey).(*utils.Claims)
	if !ok || claims == nil {
		utils.HandleError(w, h.logger, utils.ErrUnauthorized.Wrap(
			fmt.Errorf("missing Claims in context"),
		))
		return
	}

	activeConvList, err := h.cs.ListActiveConversationsForUser(r.Context(), claims.UserId)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendResponse(w, http.StatusOK, activeConvList)
}

func IsValidConversationStatus(status string) (models.ConversationStatus, bool) {
	switch status {
	case "active":
		return models.ConversationStatusActive, true
	case "archived":
		return models.ConversationStatusArchived, true
	default:
		return "", false
	}
}
