package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/utils"
)

func (db *Postgres) CreateSpace(ctx context.Context, space *models.CreateSpace) error {
	sql := `
	INSERT INTO spaces (
		user_id, title, description,
		source_limit
	) VALUES ($1, $2, $3, COALESCE(NULLIF($4, 0) , 50))`

	if _, err := db.pool.Exec(ctx, sql,
		space.UserId,
		space.Title,
		space.Description,
		space.SourceLimit,
	); err != nil {
		return utils.HandlePgError(err, "CreateSpace")
	}
	return nil
}

func (db *Postgres) ListSpacesForUser(ctx context.Context, userId string) ([]models.Space, error) {
	sql := `
	SELECT
		space_id, user_id, title, description,
		source_limit, created_at, updated_at
	FROM spaces WHERE user_id = $1`

	rows, err := db.pool.Query(ctx, sql, userId)
	if err != nil {
		return nil, utils.HandlePgError(err, "ListSpacesForUser")
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
			return nil, utils.HandlePgError(err, "ListSpacesForUser")
		}
		spaces = append(spaces, space)
	}
	return spaces, nil
}

func (db *Postgres) GetSpace(ctx context.Context, spaceId string) (*models.Space, error) {
	sql := `SELECT space_id, user_id, title, description, source_limit, created_at, updated_at FROM spaces WHERE space_id = $1`
	var space models.Space
	err := db.pool.QueryRow(ctx, sql, spaceId).Scan(&space)
	if err != nil {
		return nil, utils.HandlePgError(err, "GetSpace")
	}
	return &space, nil
}

func (db *Postgres) UpdateSpace(ctx context.Context, space *models.UpdateSpace) error {
	var values []string
	var args []interface{}
	paramIndex := 2

	args = append(args, space.SpaceId)

	if space.Title != nil {
		values = append(values, fmt.Sprintf("title = $%d", paramIndex))
		args = append(args, *space.Title)
		paramIndex++
	}

	if space.Description != nil {
		values = append(values, fmt.Sprintf("description = $%d", paramIndex))
		args = append(args, *space.Description)
		paramIndex++
	}

	sql := fmt.Sprintf(`UPDATE spaces set %s , updated_at = NOW() WHERE space_id = $1`, strings.Join(values, ", "))

	if _, err := db.pool.Exec(ctx, sql, args...); err != nil {
		return utils.HandlePgError(err, "UpdateSpace")
	}
	return nil
}

func (db *Postgres) DeleteSpace(ctx context.Context, spaceId string) error {
	sql := `DELETE FROM spaces WHERE space_id = $1`
	if _, err := db.pool.Exec(ctx, sql, spaceId); err != nil {
		return utils.HandlePgError(err, "DeleteSpace")
	}
	return nil
}
