package service

import (
	"context"

	"github.com/synntx/askmind/internal/db"
	"github.com/synntx/askmind/internal/models"
	"go.uber.org/zap"
)

type SpaceService interface {
	CreateSpace(ctx context.Context, space *models.CreateSpace) error
	GetSpace(ctx context.Context, spaceId string) (*models.Space, error)
	UpdateSpace(ctx context.Context, space *models.UpdateSpace) error
	DeleteSpace(ctx context.Context, spaceId string) error
	ListSpacesForUser(ctx context.Context, userId string) ([]models.Space, error)
}

type spaceService struct {
	db     db.DB
	logger *zap.Logger
}

func NewSpaceService(db db.DB, logger *zap.Logger) *spaceService {
	return &spaceService{
		db:     db,
		logger: logger,
	}
}

func (s *spaceService) CreateSpace(ctx context.Context, space *models.CreateSpace) error {
	return s.db.CreateSpace(ctx, space)
}

func (s *spaceService) GetSpace(ctx context.Context, spaceId string) (*models.Space, error) {
	return s.db.GetSpace(ctx, spaceId)
}

func (s *spaceService) UpdateSpace(ctx context.Context, space *models.UpdateSpace) error {
	return s.db.UpdateSpace(ctx, space)
}

func (s *spaceService) DeleteSpace(ctx context.Context, spaceId string) error {
	return s.db.DeleteSpace(ctx, spaceId)
}

func (s *spaceService) ListSpacesForUser(ctx context.Context, userId string) ([]models.Space, error) {
	return s.db.ListSpacesForUser(ctx, userId)
}
