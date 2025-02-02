package service

import (
	"context"

	"github.com/synntx/askmind/internal/db"
	"github.com/synntx/askmind/internal/models"
	"go.uber.org/zap"
)

type MessageService interface {
	CreateMessage(ctx context.Context, msg *models.CreateMessageRequest) error
	CreateMessages(ctx context.Context, msgs []models.CreateMessageRequest) error
	GetMessage(ctx context.Context, messageId string) (*models.ChatMessage, error)
	GetConversationMessages(ctx context.Context, convId string) ([]models.ChatMessage, error)
	GetConversationUserMessages(ctx context.Context, convId string) ([]models.ChatMessage, error)
}

type messageService struct {
	db     db.DB
	logger *zap.Logger
}

func NewMessageService(db db.DB, logger *zap.Logger) *messageService {
	return &messageService{
		db:     db,
		logger: logger,
	}
}

func (ms *messageService) CreateMessage(ctx context.Context, msg *models.CreateMessageRequest) error {
	return ms.db.CreateMessage(ctx, msg)
}

func (ms *messageService) CreateMessages(ctx context.Context, msgs []models.CreateMessageRequest) error {
	return ms.db.CreateMessages(ctx, msgs)
}

func (ms *messageService) GetMessage(ctx context.Context, messageId string) (*models.ChatMessage, error) {
	return ms.db.GetMessage(ctx, messageId)
}

func (ms *messageService) GetConversationMessages(ctx context.Context, convId string) ([]models.ChatMessage, error) {
	return ms.db.GetConversationMessages(ctx, convId)
}

func (ms *messageService) GetConversationUserMessages(ctx context.Context, convId string) ([]models.ChatMessage, error) {
	return ms.db.GetConversationUserMessages(ctx, convId)
}
