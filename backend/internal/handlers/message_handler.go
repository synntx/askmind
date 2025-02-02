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

type MessageHandler struct {
	ms     service.MessageService
	logger *zap.Logger
}

func NewMessageHandler(ms service.MessageService, logger *zap.Logger) *MessageHandler {
	return &MessageHandler{
		ms:     ms,
		logger: logger,
	}
}

// Routes: (prefix : `/msg`)
// 1. /msg/create - POST
// 2. /msg/create/messages - POST
// 3. /msg/get - GET
// 5. /msg/get/msgs - GET (GetConversationUserMessages)
// 4. /msg/get/all-msgs - GET (GetConversationMessages)

func (h *MessageHandler) CreateMessageHandler(w http.ResponseWriter, r *http.Request) {
	var msgReq models.CreateMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&msgReq); err != nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(err))
		return
	}

	// TODO: Validate msgReq fields

	if err := h.ms.CreateMessage(r.Context(), &msgReq); err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *MessageHandler) CreateMessagesHandler(w http.ResponseWriter, r *http.Request) {
	var msgsReq []models.CreateMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&msgsReq); err != nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(err))
		return
	}

	// TODO: Validate msgsReq fields

	if err := h.ms.CreateMessages(r.Context(), msgsReq); err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *MessageHandler) GetMessageHandler(w http.ResponseWriter, r *http.Request) {
	msgId := r.FormValue("msg_id")
	if msgId == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter msg_id"),
		).WithDetails(utils.ValidationError{
			Field:   "msg_id",
			Message: "msg_id is required",
		}))
		return
	}

	msg, err := h.ms.GetMessage(r.Context(), msgId)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendResponse(w, http.StatusOK, msg)
}

func (h *MessageHandler) GetConvMessageHandler(w http.ResponseWriter, r *http.Request) {
	convId := r.FormValue("conv_id")
	if convId == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter conv_id"),
		).WithDetails(utils.ValidationError{
			Field:   "conv_id",
			Message: "conv_id is required",
		}))
		return
	}

	msgs, err := h.ms.GetConversationMessages(r.Context(), convId)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendResponse(w, http.StatusOK, msgs)
}

func (h *MessageHandler) GetConvUserMessageHandler(w http.ResponseWriter, r *http.Request) {
	convId := r.FormValue("conv_id")
	if convId == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter conv_id"),
		).WithDetails(utils.ValidationError{
			Field:   "conv_id",
			Message: "conv_id is required",
		}))
		return
	}

	msgs, err := h.ms.GetConversationUserMessages(r.Context(), convId)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	utils.SendResponse(w, http.StatusOK, msgs)
}
