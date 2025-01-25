package postgres

import (
	"context"
	"fmt"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type Postgres struct {
	pool      *pgxpool.Pool
	logger    *zap.Logger
	closeOnce sync.Once
}

func NewPostgresDB(ctx context.Context, connString string, logger *zap.Logger) (*Postgres, error) {
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("error parsing connection string: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("error creating connection pool: %w", err)
	}

	err = pool.Ping(ctx)
	if err != nil {
		return nil, fmt.Errorf("error pinging database: %w", err)
	}

	return &Postgres{
		pool:   pool,
		logger: logger,
	}, nil
}

func (db *Postgres) Close() {
	db.closeOnce.Do(func() {
		db.pool.Close()
		db.logger.Info("PostgreSQL connection pool closed")
	})
}

const createSchema = `
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    space_limit INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS spaces (
    space_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_limit INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS spaces_user_idx ON spaces(user_id);

CREATE TABLE IF NOT EXISTS sources (
    source_id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(space_id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    location TEXT NOT NULL,
    metadata TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS sources_space_idx ON sources(space_id);

CREATE TABLE IF NOT EXISTS chunks (
    chunk_id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES sources(source_id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_token_count INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS chunks_source_idx ON chunks(source_id);
`

func (db *Postgres) InitSchema(ctx context.Context) error {
	_, err := db.pool.Exec(ctx, createSchema)
	return err
}

// Helper functions
func (db *Postgres) GetUserSpaceCount(ctx context.Context, userId string) (int, error) {
	var count int
	err := db.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM spaces WHERE user_id = $1",
		userId,
	).Scan(&count)
	return count, err
}

func (db *Postgres) CheckUserSpaceLimit(ctx context.Context, userId string) (bool, error) {
	user, err := db.GetUser(ctx, userId)
	if err != nil {
		return false, err
	}

	count, err := db.GetUserSpaceCount(ctx, userId)
	if err != nil {
		return false, err
	}

	return count < user.SpaceLimit, nil
}

func (db *Postgres) GetSpaceSourceCount(ctx context.Context, spaceId string) (int, error) {
	return 0, nil
}
func (db *Postgres) CheckSpaceSourceLimit(ctx context.Context, spaceId string) (bool, error) {
	return true, nil
}
