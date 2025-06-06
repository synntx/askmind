package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/synntx/askmind/internal/llm"
	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/service"
	"github.com/synntx/askmind/internal/utils"
	"go.uber.org/zap"
)

type MessageHandler struct {
	ms                      service.MessageService
	llm                     llm.LLM
	logger                  *zap.Logger
	completionStreamHandler *CompletionStreamHandler
}

func NewMessageHandler(ms service.MessageService, logger *zap.Logger, llm llm.LLM) *MessageHandler {
	completionStreamHandler := NewCompletionStreamHandler(ms, logger, llm)
	return &MessageHandler{
		ms:                      ms,
		llm:                     llm,
		logger:                  logger,
		completionStreamHandler: completionStreamHandler,
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

func (h *MessageHandler) CompletionHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()

	params, err := utils.ExtractCompletionRequestParams(r)
	if err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	userMsg := &models.CreateMessageRequest{
		ConversationId: params.ConvID,
		Role:           models.RoleUser,
		Content:        params.UserMessage,
		Model:          params.Model,
	}

	if err = h.ms.CreateMessage(ctx, userMsg); err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	streamer, err := NewSSEStreamer(w, h.logger)
	if err != nil {
		utils.HandleError(w, h.logger, utils.ErrSSEStreamInitFailed.Wrap(err))
		return
	}

	err = h.completionStreamHandler.HandleCompletionStream(ctx, params.ConvID, params.UserMessage, params.Model, streamer)
	if err != nil && err != context.Canceled && err != context.DeadlineExceeded {
		// note: If HandleCompletionStream returns an error (that's not context cancellation/timeout), it means something went wrong internally in streaming logic,
		// but error event to client should already be sent within HandleCompletionStream.
		h.logger.Error("error handling completion stream", zap.Error(err), zap.String("conv_id", params.ConvID.String()))
	}
}
