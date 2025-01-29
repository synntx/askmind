package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	pgvector "github.com/pgvector/pgvector-go"
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
	rows, rowErr := db.pool.Query(ctx, sql, spaceId)
	if rowErr != nil {
		return nil, rowErr
	}
	defer rows.Close()

	var sources []models.Source

	for rows.Next() {
		var source models.Source
		err := rows.Scan(&source)
		if err != nil {
			return nil, err
		}
		sources = append(sources, source)
	}
	return sources, nil
}

func (db *Postgres) CreateChunks(ctx context.Context, userId string, spaceId string, sourceId string, chunks []models.Chunk) error {
	tx, err := db.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}

	_, err = tx.CopyFrom(ctx,
		pgx.Identifier{"chunks"},
		[]string{"chunk_id", "source_id", "user_id", "text", "chunk_index", "chunk_token_count", "embedding"},
		pgx.CopyFromSource(chunkSliceToCopyFromRows(chunks)),
	)
	if err != nil {
		return fmt.Errorf("copy from: %w", err)
	}

	err = tx.Commit(ctx)
	if err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	return nil
}

func chunkSliceToCopyFromRows(chunks []models.Chunk) pgx.CopyFromSource {
	rows := make([][]any, 0, len(chunks))
	for _, chunk := range chunks {
		queryVector := pgvector.NewVector(chunk.Embedding)
		rows = append(rows, []any{
			chunk.ChunkId,
			chunk.SourceId,
			chunk.UserId,
			chunk.Text,
			chunk.ChunkIndex,
			chunk.ChunkTokenCount,
			queryVector,
		})
	}
	return pgx.CopyFromSlice(len(rows), func(i int) ([]any, error) {
		return rows[i], nil
	})
}

func (db *Postgres) FindSimilarChunks(ctx context.Context, embedding []float32, limit int, filters models.ChunkFilters) ([]models.Chunk, error) {
	queryVector := pgvector.NewVector(embedding)
	sqlQuery := `SELECT chunk_id, source_id, user_id, text, chunk_index, chunk_token_count, embedding FROM chunks WHERE 1=1`

	var queryParams []interface{}
	paramIndex := 1

	if filters.UserID != nil {
		sqlQuery += fmt.Sprintf(" AND user_id = $%d", paramIndex)
		queryParams = append(queryParams, *filters.UserID)
		paramIndex++
	}
	if filters.SpaceID != nil {
		sqlQuery += fmt.Sprintf(" AND space_id = $%d", paramIndex)
		queryParams = append(queryParams, *filters.SpaceID)
		paramIndex++
	}
	if filters.SourceID != nil {
		sqlQuery += fmt.Sprintf(" AND source_id = $%d", paramIndex)
		queryParams = append(queryParams, *filters.SourceID)
		paramIndex++
	}

	sqlQuery += fmt.Sprintf("ORDER BY embedding <=> $%d LIMIT $%d", paramIndex, paramIndex+1)
	queryParams = append(queryParams, queryVector, limit)

	tx, err := db.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, "SET ivfflat.probes = 10;")
	if err != nil {
		return nil, fmt.Errorf("set ivfflat.probes: %w", err)
	}

	rows, err := tx.Query(ctx, sqlQuery, queryParams...)
	if err != nil {
		return nil, fmt.Errorf("query similar chunks: %w", err)
	}
	defer rows.Close()

	_, err = tx.Exec(ctx, "RESET ivfflat.probes;")
	if err != nil {
		return nil, fmt.Errorf("reset ivfflat.probes : %w", err)
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, fmt.Errorf("commit tx : %w", err)
	}

	var chunks []models.Chunk
	for rows.Next() {
		var chunk models.Chunk
		var embedding pgvector.Vector

		rows.Scan(
			&chunk.ChunkId,
			&chunk.SourceId,
			&chunk.UserId,
			&chunk.Text,
			&chunk.ChunkIndex,
			&chunk.ChunkTokenCount,
			&embedding)

		chunk.Embedding = embedding.Slice()
		chunks = append(chunks, chunk)
	}

	return chunks, nil
}
