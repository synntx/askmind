package service

import (
	"context"
	"fmt"

	"github.com/synntx/askmind/internal/models"
)

type UserService interface {
	GetUser(ctx context.Context, userId string) (*models.User, error)
	UpdateName(ctx context.Context, userId string, name *models.UpdateName) error
	UpdateEmail(ctx context.Context, userId, email string) error
	DeleteUser(ctx context.Context, userId string) error
}

func (a *authService) GetUser(ctx context.Context, userId string) (*models.User, error) {
	return a.db.GetUser(ctx, userId)
}

func (a *authService) UpdateName(ctx context.Context, userId string, name *models.UpdateName) error {
	// NOTE: validate user name if required
	return a.db.UpdateName(ctx, userId, name)
}

func (a *authService) UpdateEmail(ctx context.Context, userId, email string) error {
	// NOTE: validate email if required
	return a.db.UpdateEmail(ctx, userId, email)
}

func (a *authService) DeleteUser(ctx context.Context, userId string) error {
	// NOTE: --- business logic here ---
	err := a.db.DeleteUser(ctx, userId)
	if err != nil {
		return fmt.Errorf("service error deleting user: %w", err)
	}
	return nil
}
