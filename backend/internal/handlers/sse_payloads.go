package handlers

import (
	"time"

	"github.com/synntx/askmind/internal/models"
)

const (
	EventDeltaEncoding     = "delta_encoding"
	EventDelta             = "delta"
	EventError             = "error"
	EventCompletion        = "completion"
	PatchOpAdd             = "add"
	PatchOpAppend          = "append"
	PatchOpReplace         = "replace"
	PatchOpPatch           = "patch"
	PathMessageContentPart = "/message/content/parts/0"
	PathMessageMetadataTC  = "/message/metadata/tool_call"
	PathMessageStatus      = "/message/status"
	PathMessageEndTurn     = "/message/end_turn"
	PathMessageMetadata    = "/message/metadata"
)

type Author struct {
	Role     string         `json:"role"`
	Name     *string        `json:"name"`
	Metadata map[string]any `json:"metadata"`
}

type Content struct {
	ContentType string   `json:"content_type"`
	Parts       []string `json:"parts"`
}

type Metadata struct {
	Citations         []any          `json:"citations,omitempty"`
	ContentReferences []any          `json:"content_references,omitempty"`
	MessageType       string         `json:"message_type,omitempty"`
	ModelSlug         string         `json:"model_slug,omitempty"`
	ToolCall          []any          `json:"tool_call,omitempty"`
	FinishDetails     *FinishDetails `json:"finish_details,omitempty"`
	IsComplete        *bool          `json:"is_complete,omitempty"`
}

type FinishDetails struct {
	Type       string `json:"type"`
	StopTokens []int  `json:"stop_tokens"`
}

type Message struct {
	ID         string   `json:"id"`
	Author     Author   `json:"author"`
	CreateTime float64  `json:"create_time"`
	UpdateTime *float64 `json:"update_time"`
	Content    Content  `json:"content"`
	Status     string   `json:"status"`
	EndTurn    *bool    `json:"end_turn"`
	Weight     float64  `json:"weight"`
	Metadata   Metadata `json:"metadata"`
	Recipient  string   `json:"recipient"`
	Channel    *string  `json:"channel"`
}

type InitialMessageValue struct {
	Message        Message `json:"message"`
	ConversationID string  `json:"conversation_id"`
	Error          *string `json:"error"`
}

type DeltaPayload struct {
	Path      string `json:"p"`
	Operation string `json:"o"`
	Value     any    `json:"v"`
	Counter   int    `json:"c,omitempty"`
}

type PatchOperation struct {
	Path      string `json:"p"`
	Operation string `json:"o"`
	Value     any    `json:"v"`
}

type CompletionData struct {
	Type           string `json:"type"`
	ConversationID string `json:"conversation_id"`
}

type ErrorDetails struct {
	Type    string         `json:"type"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

func NewInitialMessagePayload(convID, assistantMessageID, model string) DeltaPayload {
	now := float64(time.Now().UnixNano()) / 1e9
	return DeltaPayload{
		Path:      "",
		Operation: PatchOpAdd,
		Value: InitialMessageValue{
			ConversationID: convID,
			Message: Message{
				ID: assistantMessageID,
				Author: Author{
					Role:     string(models.RoleAssistant),
					Metadata: make(map[string]any),
				},
				CreateTime: now,
				Content: Content{
					ContentType: "text",
					Parts:       []string{""},
				},
				Status:    "in_progress",
				Weight:    1.0,
				Recipient: "all",
				Metadata: Metadata{
					MessageType: "next",
					ModelSlug:   model,
				},
			},
		},
	}
}
