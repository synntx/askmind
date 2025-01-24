package postgres

import (
	"context"
	"fmt"
	"sync"

	"github.com/synntx/askmind/internal/db"
)

type Postgres struct {
	// pool    *pgxpool.Pool     // Connection pool
	// logger  *zap.Logger       // Logger for database operations
	ctx       context.Context // Base context
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
		ctx:    ctx,
	}, nil
}

func (db *Postgres) Close() {
	db.closeOnce.Do(func() {
		db.pool.Close()
		db.logger.Info("PostgreSQL connection pool closed")
	})
}
