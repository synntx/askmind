package models

import (
	"time"

	"github.com/google/uuid"
)

type JSONB map[string]interface{}

type User struct {
	UserId     uuid.UUID `json:"user_id"`
	FirstName  string    `json:"first_name"`
	LastName   string    `json:"last_name"`
	Email      string    `json:"email"`
	Password   string    `json:"-"`
	SpaceLimit int       `json:"space_limit"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Space struct {
	SpaceId     uuid.UUID `json:"space_id"`
	UserId      uuid.UUID `json:"user_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	SourceLimit int       `json:"source_limit"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type SourceType string

const (
	SourceTypeWebPage SourceType = "webpage"
)

type Source struct {
	SourceId   uuid.UUID  `json:"source_id"`
	SpaceId    uuid.UUID  `json:"space_id"`
	SourceType SourceType `json:"source_type"`
	Location   string     `json:"location"`
	Metadata   JSONB      `json:"metadata"`
	Text       string     `json:"text"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type WebPageMetadata struct {
	PageTitle       string    `json:"page_title"`
	WebsiteName     string    `json:"website_name"`
	MetaDescription string    `json:"meta_description"`
	FaviconURL      string    `json:"favicon_url"`
	ScrapedAt       time.Time `json:"scraped_at"`
}

type Chunk struct {
	ChunkId         uuid.UUID `json:"chunk_id"`
	SourceId        uuid.UUID `json:"source_id"`
	UserId          uuid.UUID `json:"user_id"`
	Text            string    `json:"text"`
	ChunkIndex      int32     `json:"chunk_index"`
	ChunkTokenCount int32     `json:"chunk_token_count"`
	Embedding       []float32 `json:"embedding,omitempty"`
}

type ConversationStatus string

const (
	ConversationStatusActive   ConversationStatus = "active"
	ConversationStatusArchived ConversationStatus = "archived"
)

type Conversation struct {
	ConversationId uuid.UUID          `json:"conversation_id"`
	SpaceId        uuid.UUID          `json:"space_id"`
	UserId         uuid.UUID          `json:"user_id"`
	Title          string             `json:"title"`
	Status         ConversationStatus `json:"status"`
	CreatedAt      time.Time          `json:"created_at"`
	UpdatedAt      time.Time          `json:"updated_at"`
}

type Role string

const (
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
	RoleSystem    Role = "system"
)

type ChatMessage struct {
	MessageId      uuid.UUID `json:"message_id"`
	ConversationId uuid.UUID `json:"conversation_id"`
	Role           Role      `json:"role"`
	Content        string    `json:"content"`
	TokensUsed     *int      `json:"tokens_used"`
	Model          string    `json:"model,omitempty"`
	Metadata       JSONB     `json:"metadata"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type MessageReference struct {
	ReferenceId    uuid.UUID `json:"reference_id"`
	MessageId      uuid.UUID `json:"message_id"`
	ChunkId        uuid.UUID `json:"chunk_id"`
	RelevanceScore float64   `json:"relevance_score"`
	CreatedAt      time.Time `json:"created_at"`
}

type UpdateName struct {
	FirstName *string `json:"first_name,omitempty"`
	LastName  *string `json:"last_name,omitempty"`
}

type UpdateSpace struct {
	SpaceId     string  `json:"space_id"` // required
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
}

type CreateSpace struct {
	UserId      uuid.UUID `json:"user_id"`
	SourceLimit int       `json:"source_limit"`
	Title       string    `json:"title,omitempty"`
	Description string    `json:"description,omitempty"`
}

type ChunkFilters struct {
	UserID   *string `json:"userId,omitempty"`
	SpaceID  *string `json:"spaceId,omitempty"`
	SourceID *string `json:"sourceId,omitempty"`
}

type CreateConversationRequest struct {
	SpaceId uuid.UUID `json:"space_id"`
	Title   string    `json:"title"`
}
