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

type SpaceHandler struct {
	spaceService service.SpaceService
	logger       *zap.Logger
}

func NewSpaceHandler(space service.SpaceService, logger *zap.Logger) *SpaceHandler {
	return &SpaceHandler{spaceService: space, logger: logger}
}

func (h *SpaceHandler) CreateSpaceHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(utils.ClaimsKey).(*utils.Claims)
	if !ok || claims == nil {
		utils.HandleError(w, h.logger, utils.ErrUnauthorized.Wrap(
			fmt.Errorf("missing Claims in context"),
		))
		return
	}

	var req models.CreateSpace
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(err))
		return
	}

	// NOTE: Check if the user has exceeded the max allowed source limit

	if req.Title == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("title is empty"),
		).WithDetails(utils.ValidationError{
			Field:   "title",
			Message: "Title is required field and can not be empty",
		}))
		return
	}

	if req.Description == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("description is empty"),
		).WithDetails(utils.ValidationError{
			Field:   "description",
			Message: "description is required field and can not be empty",
		}))
		return
	}

	userId, err := uuid.Parse(claims.UserId)
	if err != nil {
		utils.HandleError(w, h.logger, utils.ErrUnauthorized.Wrap(
			fmt.Errorf("failed to parse userId"),
		).WithDetails(utils.ValidationError{
			Field:   "user_id",
			Message: "UserId is required and must be valid",
		}))
		return
	}

	req.UserId = userId
	// FIX: GET THE SOURCE LIMIT FROM CONFIG OR ENV
	// req.SourceLimit = 50

	err = h.spaceService.CreateSpace(r.Context(), &req)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	h.logger.Info("space created",
		zap.String("title", req.Title),
		zap.String("event", "space_created"),
	)

	w.WriteHeader(http.StatusCreated)
}

func (h *SpaceHandler) GetSpaceHandler(w http.ResponseWriter, r *http.Request) {
	spaceId := r.FormValue("space_id")
	if spaceId == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("space_id can not be empty"),
		))
		return
	}

	space, err := h.spaceService.GetSpace(r.Context(), spaceId)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendResponse(w, http.StatusCreated, space)
}

func (h *SpaceHandler) ListSpacesForUserHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(utils.ClaimsKey).(*utils.Claims)
	if !ok || claims == nil {
		utils.HandleError(w, h.logger, utils.ErrUnauthorized.Wrap(
			fmt.Errorf("missing Claims in context"),
		))
		return
	}

	spaces, err := h.spaceService.ListSpacesForUser(r.Context(), claims.UserId)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendResponse(w, http.StatusOK, spaces)
}

func (h *SpaceHandler) UpdateSpaceHandler(w http.ResponseWriter, r *http.Request) {
	spaceId := r.FormValue("space_id")
	if spaceId == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("space_id can not be empty"),
		))
		return
	}

	var req models.UpdateSpace
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(err))
		return
	}

	if req.Description == nil && req.Title == nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required fields"),
		).WithDetails(utils.ValidationError{
			Field:   "title,description",
			Message: "Please provide either a new title or description for the update",
		}))
		return
	}

	req.SpaceId = spaceId

	if err := h.spaceService.UpdateSpace(r.Context(), &req); err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendNoContent(w)
}

func (h *SpaceHandler) DeleteSpaceHandler(w http.ResponseWriter, r *http.Request) {
	spaceId := r.FormValue("space_id")
	if spaceId == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("space_id can not be empty"),
		))
		return
	}

	if err := h.spaceService.DeleteSpace(r.Context(), spaceId); err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendNoContent(w)
}
