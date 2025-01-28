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
	sql := `SELECT * FROM sources WHERE source_id = $1`
	var source models.Source
	err := db.pool.QueryRow(ctx, sql, sourceId).Scan(&source)
	return &source, err
}

func (db *Postgres) UpdateSource(ctx context.Context, source *models.Source) error {
	sql := `UPDATE sources
	SET source_type = $2,location = $3,metadata = $4,
	text = $5,updated_at = NOW() WHERE source_id = $1`
	_, err := db.pool.Exec(ctx, sql, source.SourceId, source.SourceType, source.Location, source.Metadata, source.Text)
	return err
}

func (db *Postgres) DeleteSource(ctx context.Context, sourceId string) error {
	sql := `DELETE FROM sources WHERE source_id = $1`
	_, err := db.pool.Exec(ctx, sql, sourceId)
	return err
}

func (db *Postgres) ListSourcesForSpace(ctx context.Context, spaceId string) ([]models.Source, error) {
	sql := `SELECT * FROM sources WHERE space_id = $1`
	rows, err := db.pool.Query(ctx, sql, spaceId)
	var sources []models.Source

	for rows.Next() {
		var source models.Source
		err := rows.Scan(&source)
		if err != nil {
			return nil, err
		}
		sources = append(sources, source)
	}
	return sources, err
}

func (db *Postgres) FindSimilarChunks(ctx context.Context, userId string, embedding []float32, limit int) ([]models.Chunk, error) {
	return nil, nil
}
func (db *Postgres) FindSimilarChunksInSpace(ctx context.Context, spaceId string, embedding []float32, limit int) ([]models.Chunk, error) {
	return nil, nil
}
