package utils

import (
	"fmt"
	"net/http"
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
	ErrUnauthorized = AppError{Code: "unauthorized", Message: "Authentication required", HTTPStatus: http.StatusUnauthorized}

	// validation
	ErrValidation = AppError{Code: "validation_failed", Message: "Invalid input", HTTPStatus: http.StatusBadRequest}

	// database
	ErrUserNotFound   = AppError{Code: "user_not_found", Message: "User not found", HTTPStatus: http.StatusNotFound}
	ErrUniqueConflict = AppError{Code: "conflict", Message: "Resource already exists", HTTPStatus: http.StatusConflict}
	ErrDatabase       = AppError{Code: "database_error", Message: "Database operation failed", HTTPStatus: http.StatusInternalServerError}

	// System
	ErrInternal = AppError{Code: "internal_error", Message: "Something went wrong", HTTPStatus: http.StatusInternalServerError}
)
