package service

import (
	"context"

	"github.com/synntx/askmind/internal/db"
	"github.com/synntx/askmind/internal/models"
)

type AuthService interface {
	Register(ctx context.Context, user *models.User) error
	Login(ctx context.Context, email, password string) (*models.User, error)
	GetUser(ctx context.Context, userId string) (*models.User, error)
}

type authService struct {
	db db.DB
}

func NewAuthService(db db.DB) *authService {
	return &authService{db: db}
}

func (a *authService) Register(ctx context.Context, user *models.User) error {
	return nil
}

func (a *authService) Login(ctx context.Context, email, password string) (*models.User, error) {
	return nil, nil
}

func (a *authService) GetUser(ctx context.Context, userId string) (*models.User, error) {
	return nil, nil
}
