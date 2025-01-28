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

// FIX: Add user_id field in chunks
const createSchema = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    space_limit INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spaces (
    space_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_limit INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS spaces_user_idx ON spaces(user_id);

CREATE TABLE IF NOT EXISTS sources (
    source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(space_id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('webpage')),
    location TEXT NOT NULL,
    metadata JSONB NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sources_space_idx ON spaces(space_id);

CREATE TABLE IF NOT EXISTS chunks (
    chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES sources(source_id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_token_count INTEGER NOT NULL,
    embedding vector(1536)
);

CREATE INDEX IF NOT EXISTS chunks_source_idx ON chunks(source_id);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS conversations (
    conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(space_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_space_idx ON conversations(space_id);
CREATE INDEX IF NOT EXISTS conversations_status_idx ON conversations(status);

CREATE TABLE IF NOT EXISTS chat_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    tokens_used INTEGER,
    model TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at);
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
