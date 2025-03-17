package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type AppError struct {
	Code       string
	Message    string
	HTTPStatus int
	Cause      error
	Details    []ValidationError `json:"details,omitempty"`
}

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e AppError) WithDetails(details ...ValidationError) AppError {
	return AppError{
		Code:       e.Code,
		Message:    e.Message,
		HTTPStatus: e.HTTPStatus,
		Cause:      e.Cause,
		Details:    details,
	}
}

func (e AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %v", e.Code, e.Cause)
	}
	return e.Code
}

func (e AppError) Wrap(err error) AppError {
	return AppError{
		Code:       e.Code,
		Message:    e.Message,
		HTTPStatus: e.HTTPStatus,
		Cause:      fmt.Errorf("%w: %v", e, err),
	}
}

func (e AppError) Unwrap() error {
	return e.Cause
}

var (
	// auth
	ErrUnauthorized       = AppError{Code: "unauthorized", Message: "Authentication required", HTTPStatus: http.StatusUnauthorized}
	ErrEmailExists        = AppError{Code: "email_already_exists", Message: "Email Already exists", HTTPStatus: http.StatusConflict}
	ErrInvalidCredentials = AppError{Code: "invalid_credentials", Message: "Invalid Credentials", HTTPStatus: http.StatusUnauthorized}

	// validation
	ErrValidation = AppError{Code: "validation_failed", Message: "Invalid input", HTTPStatus: http.StatusBadRequest}

	// database
	ErrNotFound            = AppError{Code: "record_not_found", Message: "Record not found", HTTPStatus: http.StatusNotFound}
	ErrUserNotFound        = AppError{Code: "user_not_found", Message: "User not found", HTTPStatus: http.StatusNotFound}
	ErrUniqueConflict      = AppError{Code: "conflict", Message: "Resource already exists", HTTPStatus: http.StatusConflict} // 23505
	ErrDatabase            = AppError{Code: "database_error", Message: "Database operation failed", HTTPStatus: http.StatusInternalServerError}
	ErrNotNullViolation    = AppError{Code: "not_null_violation", Message: "A required field is missing", HTTPStatus: http.StatusBadRequest}            // 23502
	ErrForeignKeyViolation = AppError{Code: "foreign_key_violation", Message: "Invalid reference to another record", HTTPStatus: http.StatusBadRequest} // 23503

	// LLM Specific Errors
	ErrPromptTooLong         = AppError{Code: "prompt_too_long", Message: "Prompt exceeds maximum length", HTTPStatus: http.StatusBadRequest}
	ErrInvalidPrompt         = AppError{Code: "invalid_prompt", Message: "Invalid prompt format or content", HTTPStatus: http.StatusBadRequest}
	ErrLLMServiceUnavailable = AppError{Code: "llm_service_unavailable", Message: "LLM service is currently unavailable", HTTPStatus: http.StatusServiceUnavailable}
	ErrLLMGenerationFailed   = AppError{Code: "llm_generation_failed", Message: "Failed to generate text from LLM", HTTPStatus: http.StatusInternalServerError}
	ErrRateLimited           = AppError{Code: "rate_limited", Message: "Too many requests, please try again later", HTTPStatus: http.StatusTooManyRequests}
	ErrContextWindowExceeded = AppError{Code: "context_window_exceeded", Message: "The combined prompt and response exceeds the context window", HTTPStatus: http.StatusBadRequest} // Important for conversational agents
	ErrInvalidModel          = AppError{Code: "invalid_model", Message: "The specified LLM model is invalid or unavailable", HTTPStatus: http.StatusBadRequest}

	ErrSSEStreamInitFailed = AppError{Code: "sse_stream_init_failed", Message: "Failed to initialize SSE stream", HTTPStatus: http.StatusInternalServerError}
	ErrSSEEventSendFailed  = AppError{Code: "sse_event_send_failed", Message: "Failed to send SSE event", HTTPStatus: http.StatusInternalServerError}

	// System
	ErrInternal = AppError{Code: "internal_error", Message: "Something went wrong", HTTPStatus: http.StatusInternalServerError}
)

func HandlePgError(err error, context string) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23502":
			return ErrNotNullViolation.Wrap(fmt.Errorf("%s: missing required field: %w", context, err))
		case "23503":
			return ErrForeignKeyViolation.Wrap(fmt.Errorf("%s: foreign key violation: %w", context, err))
		case "23505":
			return ErrUniqueConflict.Wrap(fmt.Errorf("%s: unique constraint violated: %w", context, err))
		case "22P02":
			return ErrValidation.Wrap(fmt.Errorf("%s: Invalid UUID format: %w", context, err)).WithDetails(ValidationError{
				Field:   context,
				Message: "Invalid UUID format",
			})
		default:
			return ErrDatabase.Wrap(fmt.Errorf("%s: %w", context, err))
		}
	} else if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound.Wrap(fmt.Errorf("%s: not found", context))
	}
	return ErrDatabase.Wrap(err)
}

func SendErrorEvent(w http.ResponseWriter, rc *http.ResponseController, errorType string, errorMessage string, details map[string]any) error {
	errorEvent := map[string]any{
		"p": "",
		"o": "patch",
		"v": []map[string]any{
			{
				"p": "/error",
				"o": "replace",
				"v": map[string]any{
					"type":      errorType,
					"message":   errorMessage,
					"details":   details,
					"timestamp": float64(time.Now().Unix()) + float64(time.Now().Nanosecond())/1e9,
				},
			},
			{
				"p": "/message/status",
				"o": "replace",
				"v": "finished_with_error",
			},
		},
	}

	errorJSON, err := json.Marshal(errorEvent)
	if err != nil {
		return err
	}

	eventStr := fmt.Sprintf("event: delta\ndata: %s\n\n", string(errorJSON))
	_, err = fmt.Fprint(w, eventStr)
	if err != nil {
		return err
	}

	return rc.Flush()
}
