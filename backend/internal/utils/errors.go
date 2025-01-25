package utils

import (
	"net/http"
)

type Code string

const (
	// Authentication
	Unauthorized       Code = "unauthorized"
	InvalidCredentials Code = "invalid_credentials"

	// Validation
	InvalidUUID    Code = "invalid_uuid"
	MissingField   Code = "missing_field"
	InvalidRequest Code = "invalid_request"

	// Resources
	UserNotFound Code = "user_not_found"

	// System
	InternalServerError Code = "internal_error"
	DatabaseError       Code = "database_error"

	// Others
	UpdateEmailFailed Code = "update_email_failed"
)

func (c Code) HTTPStatus() int {
	switch c {
	case Unauthorized, InvalidCredentials:
		return http.StatusUnauthorized
	case InvalidUUID, MissingField, InvalidRequest:
		return http.StatusBadRequest
	case UserNotFound:
		return http.StatusNotFound
	default:
		return http.StatusInternalServerError
	}
}

func (c Code) Message() string {
	switch c {
	case Unauthorized:
		return "unauthorized"
	case InvalidCredentials:
		return "invalid credentials"
	case InvalidUUID, MissingField, InvalidRequest:
		return "invalid request"
	case UserNotFound:
		return "user not found"
	default:
		return "internal server error"
	}
}
