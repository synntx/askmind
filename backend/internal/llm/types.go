package llm

import (
	"context"

	"github.com/synntx/askmind/internal/models"
)

type LLM interface {
	// Core methods
	GenerateContent(ctx context.Context, input string) (string, error)
	GenerateContentStream(ctx context.Context, history []models.ChatMessage, userMessage string) <-chan ContentChunk
	GenerateEmbeddings(ctx context.Context, input string) ([]float32, error)

	// Provider info
	GetProviderName() string
	GetModelName() string
}

// // Provider-agnostic types
// type ChatMessage struct {
// 	Role    string
// 	Content string
// }

type ContentChunk struct {
	Content  string
	ToolInfo *ToolInfo
	Err      error
}

type ToolInfo struct {
	Name   string
	Args   map[string]any
	Result string
	Status Status
}

type Status string

const (
	StatusStart      Status = "START"
	StatusProcessing Status = "PROCESSING"
	StatusEnd        Status = "END"
)

// const (
// 	RoleUser      = "user"
// 	RoleAssistant = "assistant"
// 	RoleSystem    = "system"
// 	RoleTool      = "tool"
// )
