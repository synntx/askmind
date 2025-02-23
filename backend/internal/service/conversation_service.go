package service

import (
	"context"

	"github.com/synntx/askmind/internal/db"
	"github.com/synntx/askmind/internal/models"
	"go.uber.org/zap"
)

type ConversationService interface {
	CreateConversation(ctx context.Context, conv *models.Conversation) (*models.Conversation, error)
	GetConversation(ctx context.Context, convId string) (*models.Conversation, error)
	UpdateConversationTitle(ctx context.Context, convId string, title string) error
	UpdateConversationStatus(ctx context.Context, convId string, status models.ConversationStatus) error
	DeleteConversation(ctx context.Context, convId string) error
	ListConversationsForSpace(ctx context.Context, spaceId string) ([]models.Conversation, error)
	ListActiveConversationsForUser(ctx context.Context, userId string) ([]models.Conversation, error)
}

type conversationService struct {
	db     db.DB
	logger *zap.Logger
}

func NewConversationService(db db.DB, logger *zap.Logger) *conversationService {
	return &conversationService{
		db:     db,
		logger: logger,
	}
}

func (c *conversationService) CreateConversation(ctx context.Context, conv *models.Conversation) (*models.Conversation, error) {
	return c.db.CreateConversation(ctx, conv)
}

func (c *conversationService) GetConversation(ctx context.Context, convId string) (*models.Conversation, error) {
	return c.db.GetConversation(ctx, convId)
}

func (c *conversationService) UpdateConversationTitle(ctx context.Context, convId string, title string) error {
	return c.db.UpdateConversationTitle(ctx, convId, title)
}

func (c *conversationService) UpdateConversationStatus(ctx context.Context, convId string, status models.ConversationStatus) error {
	return c.db.UpdateConversationStatus(ctx, convId, status)
}

func (c *conversationService) DeleteConversation(ctx context.Context, convId string) error {
	return c.db.DeleteConversation(ctx, convId)
}

func (c *conversationService) ListConversationsForSpace(ctx context.Context, spaceId string) ([]models.Conversation, error) {
	return c.db.ListConversationsForSpace(ctx, spaceId)
}

func (c *conversationService) ListActiveConversationsForUser(ctx context.Context, userId string) ([]models.Conversation, error) {
	return c.db.ListActiveConversationsForUser(ctx, userId)
}
