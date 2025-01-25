package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/synntx/askmind/internal/models"
)

func (db *Postgres) CreateSource(ctx context.Context, source *models.Source) error {
	sql := `
	INSERT INTO sources (
		source_id, space_id, source_type,
		location, metadata, text,
		created_at, updated_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := db.pool.Exec(ctx, sql,
		source.SourceId,
		source.SpaceId,
		source.SourceType,
		source.Location,
		source.Metadata,
		source.Text,
		source.CreatedAt,
		source.UpdatedAt,
	)
	return err
}

func (db *Postgres) CreateChunks(ctx context.Context, chunks []models.Chunk) error {
	batch := &pgx.Batch{}
	for _, chunk := range chunks {
		batch.Queue(
			`INSERT INTO chunks
			(chunk_id, source_id, text, chunk_index, chunk_token_count)
			VALUES ($1, $2, $3, $4, $5)`,
			chunk.ChunkId,
			chunk.SourceId,
			chunk.Text,
			chunk.ChunkIndex,
			chunk.ChunkTokenCount,
		)
	}

	br := db.pool.SendBatch(ctx, batch)
	defer br.Close()
	_, err := br.Exec()
	return err
}

func (db *Postgres) GetSource(ctx context.Context, sourceId string) (*models.Source, error) {
	return nil, nil
}
func (db *Postgres) UpdateSource(ctx context.Context, source *models.Source) error {
	return nil
}
func (db *Postgres) DeleteSource(ctx context.Context, sourceId string) error {
	return nil
}
func (db *Postgres) ListSourcesForSpace(ctx context.Context, spaceId string) ([]models.Source, error) {
	return nil, nil
}

func (db *Postgres) CreateChunk(ctx context.Context, chunk *models.Chunk) error {
	return nil
}
func (db *Postgres) GetChunk(ctx context.Context, chunkId string) (*models.Chunk, error) {
	return nil, nil
}
func (db *Postgres) GetChunks(ctx context.Context, chunkIds []string) ([]models.Chunk, error) {
	return nil, nil
}
func (db *Postgres) DeleteChunk(ctx context.Context, chunkId string) error {
	return nil
}
func (db *Postgres) DeleteChunks(ctx context.Context, chunkIds []string) error {
	return nil
}
