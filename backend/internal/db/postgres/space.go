package postgres

import (
	"context"

	"github.com/synntx/askmind/internal/models"
)

func (db *Postgres) CreateSpace(ctx context.Context, space *models.Space) error {
	sql := `
	INSERT INTO spaces (
		space_id, user_id, title, description,
		source_limit, created_at, updated_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := db.pool.Exec(ctx, sql,
		space.SpaceId,
		space.UserId,
		space.Title,
		space.Description,
		space.SourceLimit,
		space.CreatedAt,
		space.UpdatedAt,
	)
	return err
}

func (db *Postgres) ListSpacesForUser(ctx context.Context, userId string) ([]models.Space, error) {
	sql := `
	SELECT
		space_id, user_id, title, description,
		source_limit, created_at, updated_at
	FROM spaces WHERE user_id = $1`

	rows, err := db.pool.Query(ctx, sql, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var spaces []models.Space
	for rows.Next() {
		var space models.Space
		err := rows.Scan(
			&space.SpaceId,
			&space.UserId,
			&space.Title,
			&space.Description,
			&space.SourceLimit,
			&space.CreatedAt,
			&space.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		spaces = append(spaces, space)
	}
	return spaces, nil
}

func (db *Postgres) GetSpace(ctx context.Context, spaceId string) (*models.Space, error) {
	return nil, nil
}
func (db *Postgres) UpdateSpace(ctx context.Context, space *models.UpdateSpace) error {
	return nil
}
func (db *Postgres) DeleteSpace(ctx context.Context, spaceId string) error {
	return nil
}
