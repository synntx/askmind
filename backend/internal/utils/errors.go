package utils

import (
	"errors"
	"fmt"
	"net/http"

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
