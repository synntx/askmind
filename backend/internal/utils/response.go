package utils

import (
	"encoding/json"
	"errors"
	"net/http"

	"go.uber.org/zap"
)

type SuccessResponse struct {
	Status int         `json:"status"`
	Data   interface{} `json:"data"`
	Meta   interface{} `json:"meta,omitempty"`
}

type ErrorResponse struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

func SendResponse(w http.ResponseWriter, status int, data interface{}, meta ...interface{}) {
	response := SuccessResponse{
		Status: status,
		Data:   data,
	}

	if len(meta) > 0 {
		response.Meta = meta[0]
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(response)
}

func HandleError(w http.ResponseWriter, logger *zap.Logger, err error) {
	var appErr AppError
	if !errors.As(err, &appErr) {
		appErr = ErrInternal
	}

	response := map[string]any{
		"error": map[string]any{
			"code":    appErr.Code,
			"message": appErr.Message,
		},
	}

	if len(appErr.Details) > 0 {
		response["error"].(map[string]any)["details"] = appErr.Details
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.HTTPStatus)
	json.NewEncoder(w).Encode(response)

	logger.Error("Request error",
		zap.Error(err),
		zap.Any("validation_errors", appErr.Details),
	)
}

func SendNoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}
