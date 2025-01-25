package utils

import (
	"encoding/json"
	"net/http"
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

func SendError(w http.ResponseWriter, status int, errorCode string, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{
		Status:  status,
		Message: message,
		Code:    errorCode,
	})
}

func SendNoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}
