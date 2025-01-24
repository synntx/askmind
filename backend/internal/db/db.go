package db

import (
	"context"

	"github.com/synntx/askmind/internal/models"
)

type DB interface {
	// User operations
	CreateUser(ctx context.Context, user *models.User) error
	GetUser(ctx context.Context, userId string) (*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
	DeleteUser(ctx context.Context, userId string) error

	// Space operations
	CreateSpace(ctx context.Context, space *models.Space) error
	GetSpace(ctx context.Context, spaceId string) (*models.Space, error)
	UpdateSpace(ctx context.Context, space *models.Space) error
	DeleteSpace(ctx context.Context, spaceId string) error
	ListSpacesForUser(ctx context.Context, userId string) ([]models.Space, error)

	// Source operations
	CreateSource(ctx context.Context, source *models.Source) error
	GetSource(ctx context.Context, sourceId string) (*models.Source, error)
	UpdateSource(ctx context.Context, source *models.Source) error
	DeleteSource(ctx context.Context, sourceId string) error
	ListSourcesForSpace(ctx context.Context, spaceId string) ([]models.Source, error)

	// Source operations
	CreateChunk(ctx context.Context, chunk *models.Chunk) error
	CreateChunks(ctx context.Context, chunk []models.Chunk) error
	GetChunk(ctx context.Context, chunkId string) (*models.Chunk, error)
	GetChunks(ctx context.Context, chunkIds []string) ([]models.Chunk, error)
	DeleteChunk(ctx context.Context, chunkId string) error
	DeleteChunks(ctx context.Context, chunkIds []string) error

	GetUserSpaceCount(ctx context.Context, userId string) (int, error)
	GetSpaceSourceCount(ctx context.Context, spaceId string) (int, error)
	CheckUserSpaceLimit(ctx context.Context, userId string) (bool, error)    // Returns true if user is within space limit
	CheckSpaceSourceLimit(ctx context.Context, spaceId string) (bool, error) // Returns true if space is within source limit
}
