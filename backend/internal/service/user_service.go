package service

import (
	"context"
	"fmt"

	"github.com/synntx/askmind/internal/db"
	"github.com/synntx/askmind/internal/models"
	"go.uber.org/zap"
)

type UserService interface {
	GetUser(ctx context.Context, userId string) (*models.User, error)
	UpdateName(ctx context.Context, userId string, name *models.UpdateName) error
	UpdateEmail(ctx context.Context, userId, email string) error
	DeleteUser(ctx context.Context, userId string) error
}

type userService struct {
	db     db.DB
	logger *zap.Logger
}

func NewUserService(db db.DB, logger *zap.Logger) *userService {
	return &userService{
		db:     db,
		logger: logger,
	}
}

func (a *userService) GetUser(ctx context.Context, userId string) (*models.User, error) {
	user, err := a.db.GetUser(ctx, userId)
	if err != nil {
		return nil, fmt.Errorf("get user failed: %w", err)
	}
	return user, nil
}

func (a *userService) UpdateName(ctx context.Context, userId string, name *models.UpdateName) error {
	if err := a.db.UpdateName(ctx, userId, name); err != nil {
		return fmt.Errorf("update name failed: %w", err)
	}
	return nil
}

func (a *userService) UpdateEmail(ctx context.Context, userId, email string) error {
	if err := a.db.UpdateEmail(ctx, userId, email); err != nil {
		return fmt.Errorf("update email failed: %w", err)
	}
	return nil
}

func (a *userService) DeleteUser(ctx context.Context, userId string) error {
	const operation = "authService.DeleteUser"
	err := a.db.DeleteUser(ctx, userId)
	if err != nil {
		return fmt.Errorf("%s: %w", operation, err)
	}
	return nil
}
