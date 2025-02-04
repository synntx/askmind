package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/synntx/askmind/internal/llm"
	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/service"
	"github.com/synntx/askmind/internal/utils"
	"go.uber.org/zap"
)

type MessageHandler struct {
	ms     service.MessageService
	llm    llm.LLM
	logger *zap.Logger
}

func NewMessageHandler(ms service.MessageService, logger *zap.Logger, llm llm.LLM) *MessageHandler {
	return &MessageHandler{
		ms:     ms,
		llm:    llm,
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

func (h *MessageHandler) CompletionHandler(w http.ResponseWriter, r *http.Request) {
	convIdStr := r.FormValue("conv_id")
	if convIdStr == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter conv_id"),
		).WithDetails(utils.ValidationError{
			Field:   "conv_id",
			Message: "conv_id is required",
		}))
		return
	}

	userMessage := r.FormValue("user_message")
	if userMessage == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter user_message"),
		).WithDetails(utils.ValidationError{
			Field:   "user_message",
			Message: "user_message is required",
		}))
		return
	}

	model := r.FormValue("model")
	if model == "" {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("missing required parameter model"),
		).WithDetails(utils.ValidationError{
			Field:   "model",
			Message: "model is required",
		}))
		return
	}

	convId, err := uuid.Parse(convIdStr)
	if err != nil {
		utils.HandleError(w, h.logger, utils.ErrValidation.Wrap(
			fmt.Errorf("failed to parse conv_id"),
		).WithDetails(utils.ValidationError{
			Field:   "conv_id",
			Message: "invalid conv_id",
		}))
		return
	}

	userMsg := &models.CreateMessageRequest{
		ConversationId: convId,
		Role:           models.RoleUser,
		Content:        userMessage,
		Model:          model,
	}

	if err = h.ms.CreateMessage(r.Context(), userMsg); err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	resp, err := h.llm.GenerateContentStream(r.Context(), userMessage)
	if err != nil {
		h.logger.Error("error creating stream content: ", zap.String("Error", err.Error()))
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	rc := http.NewResponseController(w)
	err = rc.Flush()
	if err != nil {
		h.logger.Error("error flushing headers: ", zap.String("Error", err.Error()))
		return
	}

	var completeRespStr string
	for chunk := range resp {
		select {
		case <-r.Context().Done():
			h.logger.Info("stream cancelled by client", zap.String("conv_id", convIdStr))
			return // Exit if context is cancelled
		default:
			// SSE format: data: <payload>\n\n
			sseData := fmt.Sprintf("data: %s\n\n", chunk)
			completeRespStr += chunk

			fmt.Println(sseData)
			fmt.Println()
			_, err = fmt.Fprint(w, sseData)
			if err != nil {
				h.logger.Error("error writing SSE data: ", zap.String("Error", err.Error()))
				return
			}

			err = rc.Flush()
			if err != nil {
				h.logger.Error("error flushing data: ", zap.String("Error", err.Error()))
				return
			}
		}
	}
	_, err = fmt.Fprint(w, "event: complete\ndata: [DONE]\n\n")
	if err != nil {
		h.logger.Error("error writing end of stream event: ", zap.String("Error", err.Error()))
		return
	}
	err = rc.Flush()
	if err != nil {
		h.logger.Error("error flushing end of stream event: ", zap.String("Error", err.Error()))
		return
	}

	assistantMessage := &models.CreateMessageRequest{
		ConversationId: convId,
		Role:           models.RoleAssistant,
		Content:        completeRespStr,
		Model:          model,
	}

	if err = h.ms.CreateMessage(r.Context(), assistantMessage); err != nil {
		utils.HandleError(w, h.logger, err)
		return
	}

	h.logger.Info("stream completed successfully for conv_id", zap.String("conv_id", convIdStr))
}
