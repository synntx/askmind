package postgres

import (
	"context"

	"github.com/synntx/askmind/internal/models"
)

func (db *Postgres) CreateConversation(ctx context.Context, conv *models.Conversation) error {
	sql := `INSERT INTO conversations
	(space_id, user_id, title, status, start_time, end_time, created_at, updated_at)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := db.pool.Exec(ctx, sql,
		conv.SpaceId,
		conv.UserId,
		conv.Title,
		conv.Status,
		conv.StartTime,
		conv.EndTime,
		conv.CreatedAt,
		conv.UpdatedAt,
	)

	return err
}

func (db *Postgres) GetConversation(ctx context.Context, convId string) (*models.Conversation, error) {
	sql := `SELECT * FROM conversations WHERE conversation_id = $1`
	var conv models.Conversation
	err := db.pool.QueryRow(ctx, sql, convId).Scan(&conv)

	return &conv, err
}

func (db *Postgres) UpdateConversationTitle(ctx context.Context, convId string, title string) error {
	sql := `UPDATE conversations
	set title = $2, updated_at = NOW() WHERE conversation_id = $1`

	_, err := db.pool.Exec(ctx, sql, convId, title)
	return err
}

func (db *Postgres) UpdateConversationStatus(ctx context.Context, convId string, status models.ConversationStatus) error {
	sql := `UPDATE conversations
	set status = $2, updated_at = NOW() WHERE conversation_id = $1`

	_, err := db.pool.Exec(ctx, sql, convId, status)
	return err
}

func (db *Postgres) DeleteConversation(ctx context.Context, convId string) error {
	sql := `DELETE FROM conversations WHERE conversation_id = $1`
	_, err := db.pool.Exec(ctx, sql, convId)
	return err
}

func (db *Postgres) ListConversationsForSpace(ctx context.Context, spaceId string) ([]models.Conversation, error) {
	sql := `SELECT * FROM conversations WHERE space_id = $1`

	rows, err := db.pool.Query(ctx, sql, spaceId)
	if err != nil {
		return nil, err
	}

	var conversations []models.Conversation
	for rows.Next() {
		var conversation models.Conversation
		err := rows.Scan(&conversation)
		if err != nil {
			return nil, err
		}
		conversations = append(conversations, conversation)
	}

	return conversations, nil
}

func (db *Postgres) ListActiveConversationsForUser(ctx context.Context, userId string) ([]models.Conversation, error) {
	sql := `SELECT * FROM conversations WHERE status = $2 AND user_id = $1`

	rows, err := db.pool.Query(ctx, sql, userId, models.ConversationStatusActive)
	if err != nil {
		return nil, err
	}

	var conversations []models.Conversation
	for rows.Next() {
		var conversation models.Conversation
		err := rows.Scan(&conversation)
		if err != nil {
			return nil, err
		}
		conversations = append(conversations, conversation)
	}

	return conversations, nil
}
