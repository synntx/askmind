package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/synntx/askmind/internal/db"
	"github.com/synntx/askmind/internal/models"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailExists        = errors.New("email already registered")
)

type AuthService interface {
	Register(ctx context.Context, user *models.User) error
	Login(ctx context.Context, email, password string) (*models.User, error)
	UpdatePassword(ctx context.Context, userId, oldPassword, newPassword string) error
}

type authService struct {
	db     db.DB
	pepper string
	logger *zap.Logger
}

func NewAuthService(db db.DB, pepper string, logger *zap.Logger) *authService {
	return &authService{
		db:     db,
		pepper: pepper,
		logger: logger,
	}
}

func (a *authService) Register(ctx context.Context, user *models.User) error {
	existing, _ := a.db.GetUserByEmail(ctx, user.Email)
	if existing != nil {
		return ErrEmailExists
	}

	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(user.Password+a.pepper),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return fmt.Errorf("password hashing failed: %w", err)
	}
	user.Password = string(hashedPassword)

	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now

	return a.db.CreateUser(ctx, user)
}

func (a *authService) Login(ctx context.Context, email, password string) (*models.User, error) {
	user, err := a.db.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	err = bcrypt.CompareHashAndPassword(
		[]byte(user.Password),
		[]byte(password+a.pepper),
	)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	return user, nil
}

func (a *authService) UpdatePassword(ctx context.Context, userId, oldPassword, newPassword string) error {
	user, err := a.db.GetUser(ctx, userId)
	if err != nil {
		return ErrInvalidCredentials
	}

	err = bcrypt.CompareHashAndPassword(
		[]byte(user.Password),
		[]byte(oldPassword+a.pepper),
	)
	if err != nil {
		return ErrInvalidCredentials
	}

	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(newPassword+a.pepper),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return fmt.Errorf("password hashing failed: %w", err)
	}

	return a.db.UpdatePassword(ctx, userId, string(hashedPassword))
}
