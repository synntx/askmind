package db

import (
	"context"

	"github.com/synntx/askmind/internal/models"
)

type DB interface {
	// User operations
	CreateUser(ctx context.Context, user *models.User) error
	GetUser(ctx context.Context, userId string) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	UpdateName(ctx context.Context, userId string, name *models.UpdateName) error
	UpdateEmail(ctx context.Context, userId string, email string) error
	UpdatePassword(ctx context.Context, userId string, password string) error
	DeleteUser(ctx context.Context, userId string) error

	// Space operations
	CreateSpace(ctx context.Context, space *models.CreateSpace) error
	GetSpace(ctx context.Context, spaceId string) (*models.Space, error)
	UpdateSpace(ctx context.Context, space *models.UpdateSpace) error
	DeleteSpace(ctx context.Context, spaceId string) error
	ListSpacesForUser(ctx context.Context, userId string) ([]models.Space, error)

	// Source operations
	CreateSource(ctx context.Context, source *models.Source) error
	GetSource(ctx context.Context, sourceId string) (*models.Source, error)
	DeleteSource(ctx context.Context, sourceId string) error
	ListSourcesForSpace(ctx context.Context, spaceId string) ([]models.Source, error)

	// Source chunk operations
	CreateChunks(ctx context.Context, userId string, spaceId string, sourceId string, chunks []models.Chunk) error
	// Vector search operations
	FindSimilarChunks(ctx context.Context, embedding []float32, limit int, filters models.ChunkFilters) ([]models.Chunk, error)

	// Conversation operations
	CreateConversation(ctx context.Context, conv *models.Conversation) error
	GetConversation(ctx context.Context, convId string) (*models.Conversation, error)
	UpdateConversationTitle(ctx context.Context, convId string, title string) error
	UpdateConversationStatus(ctx context.Context, convId string, status models.ConversationStatus) error
	DeleteConversation(ctx context.Context, convId string) error
	ListConversationsForSpace(ctx context.Context, spaceId string) ([]models.Conversation, error)
	ListActiveConversationsForUser(ctx context.Context, userId string) ([]models.Conversation, error)

	// Chat message operations
	CreateMessage(ctx context.Context, msg *models.ChatMessage) error
	CreateMessages(ctx context.Context, msgs []models.ChatMessage) error
	GetMessage(ctx context.Context, messageId string) (*models.ChatMessage, error)
	GetConversationMessages(ctx context.Context, convId string) ([]models.ChatMessage, error)
	GetConversationUserMessages(ctx context.Context, convId string) ([]models.ChatMessage, error) // Only user & assistant messages

	// Limit checks
	GetUserSpaceCount(ctx context.Context, userId string) (int, error)
	GetSpaceSourceCount(ctx context.Context, spaceId string) (int, error)
	CheckUserSpaceLimit(ctx context.Context, userId string) (bool, error)    // Returns true if user is within space limit
	CheckSpaceSourceLimit(ctx context.Context, spaceId string) (bool, error) // Returns true if space is within source limit
}
