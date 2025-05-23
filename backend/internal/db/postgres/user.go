package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/utils"
	"go.uber.org/zap"
)

var ErrUserNotFound = errors.New("user not found")

func (db *Postgres) CreateUser(ctx context.Context, user *models.User) error {
	sql := `
	INSERT INTO users (
		first_name, last_name, email, password,
		space_limit, created_at, updated_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := db.pool.Exec(ctx, sql,
		user.FirstName,
		user.LastName,
		user.Email,
		user.Password,
		user.SpaceLimit,
		user.CreatedAt,
		user.UpdatedAt,
	)

	return err
}

func (db *Postgres) GetUser(ctx context.Context, userId string) (*models.User, error) {
	sql := `
	SELECT
		user_id, first_name, last_name, email, password,
		space_limit, created_at, updated_at
	FROM users WHERE user_id = $1`

	var user models.User
	err := db.pool.QueryRow(ctx, sql, userId).Scan(
		&user.UserId,
		&user.FirstName,
		&user.LastName,
		&user.Email,
		&user.Password,
		&user.SpaceLimit,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.ErrUserNotFound.Wrap(err)
		}
		return nil, utils.ErrDatabase.Wrap(err)
	}

	return &user, err
}

func (db *Postgres) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	sql := `
	SELECT
		user_id, first_name, last_name, email, password,
		space_limit, created_at, updated_at
	FROM users WHERE email = $1`

	var user models.User
	err := db.pool.QueryRow(ctx, sql, email).Scan(
		&user.UserId,
		&user.FirstName,
		&user.LastName,
		&user.Email,
		&user.Password,
		&user.SpaceLimit,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.ErrUserNotFound.Wrap(err)
		}
		return nil, utils.ErrDatabase.Wrap(err)
	}

	return &user, err
}

func (db *Postgres) UpdateName(ctx context.Context, userId string, user *models.UpdateName) error {
	sql := `UPDATE users SET first_name = $2, last_name = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`
	_, err := db.pool.Exec(ctx, sql, userId, user.FirstName, user.LastName)
	if err != nil {
		return utils.ErrDatabase.Wrap(err)
	}
	return nil
}

func (db *Postgres) UpdateEmail(ctx context.Context, userId string, email string) error {
	sql := `UPDATE users
	SET email = $2,
	updated_at = CURRENT_TIMESTAMP
	WHERE user_id = $1`
	_, err := db.pool.Exec(ctx, sql, userId, email)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			switch pgErr.Code {
			case "23505":
				return utils.ErrUniqueConflict.Wrap(err)
			case "23514":
				return utils.ErrValidation.Wrap(err)
			}
		}
		return utils.ErrDatabase.Wrap(err)
	}
	return nil
}

func (db *Postgres) UpdatePassword(ctx context.Context, userId string, password string) error {
	sql := `UPDATE users
	SET password = $2,
	updated_at = CURRENT_TIMESTAMP
	WHERE user_id = $1`
	_, err := db.pool.Exec(ctx, sql, userId, password)
	return err
}

func (db *Postgres) DeleteUser(ctx context.Context, userId string) error {
	startTime := time.Now()
	defer func() {
		db.logger.Info(
			"database query executed",
			zap.String("user_id", userId),
			zap.String("event", "delete_user"),
			zap.Duration("duration", time.Since(startTime)),
		)
	}()

	sql := `DELETE FROM users
	WHERE user_id = $1`
	cmdTag, err := db.pool.Exec(ctx, sql, userId)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			switch pgErr.Code {
			case "23505":
				return utils.ErrUniqueConflict.Wrap(err)
			case "23503":
				return utils.ErrValidation.Wrap(err)
			}
		}
		return utils.ErrDatabase.Wrap(err)
	}

	if cmdTag.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}
