package utils

import (
	"fmt"
	"net/http"

	"github.com/google/uuid"
)

type CompletionRequestParams struct {
	ConvID       uuid.UUID
	SpaceID      uuid.UUID
	UserMessage  string
	Model        string
	Provider     string
	SystemPrompt string
	IsNewConv    bool
}

func ExtractCompletionRequestParams(r *http.Request) (*CompletionRequestParams, error) {
	convIDStr := r.FormValue("conv_id")
	if convIDStr == "" {
		return nil, ErrValidation.Wrap(
			fmt.Errorf("missing required parameter conv_id"),
		).WithDetails(ValidationError{
			Field:   "conv_id",
			Message: "conv_id is required",
		})
	}

	spaceIDStr := r.FormValue("space_id")
	if spaceIDStr == "" {
		return nil, ErrValidation.Wrap(
			fmt.Errorf("missing required parameter space_id"),
		).WithDetails(ValidationError{
			Field:   "space_id",
			Message: "space_id is required",
		})
	}

	userMessage := r.FormValue("user_message")
	if userMessage == "" {
		return nil, ErrValidation.Wrap(
			fmt.Errorf("missing required parameter user_message"),
		).WithDetails(ValidationError{
			Field:   "user_message",
			Message: "user_message is required",
		})
	}

	model := r.FormValue("model")
	if model == "" {
		return nil, ErrValidation.Wrap(
			fmt.Errorf("missing required parameter model"),
		).WithDetails(ValidationError{
			Field:   "model",
			Message: "model is required",
		})
	}

	provider := r.FormValue("provider")
	if provider == "" {
		return nil, ErrValidation.Wrap(
			fmt.Errorf("missing required parameter provider"),
		).WithDetails(ValidationError{
			Field:   "provider",
			Message: "provider is required",
		})
	}

	var convID uuid.UUID
	var isNewConv bool

	if convIDStr == "new" {
		isNewConv = true
	} else {
		parsedConvID, err := uuid.Parse(convIDStr)
		if err != nil {
			return nil, ErrValidation.Wrap(
				fmt.Errorf("failed to parse conv_id"),
			).WithDetails(ValidationError{
				Field:   "conv_id",
				Message: "invalid conv_id",
			})
		}
		convID = parsedConvID
		isNewConv = false
	}

	spaceID, err := uuid.Parse(spaceIDStr)
	if err != nil {
		return nil, ErrValidation.Wrap(
			fmt.Errorf("failed to parse space_id"),
		).WithDetails(ValidationError{
			Field:   "space_id",
			Message: "invalid space_id",
		})
	}

	systemPrompt := r.FormValue("system_prompt")
	if systemPrompt == "" {
		systemPrompt = "general"
	}

	return &CompletionRequestParams{
		ConvID:       convID,
		SpaceID:      spaceID,
		UserMessage:  userMessage,
		Model:        model,
		Provider:     provider,
		SystemPrompt: systemPrompt,
		IsNewConv:    isNewConv,
	}, nil
}
