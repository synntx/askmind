package postgres

import (
	"context"

	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/utils"
)

func (db *Postgres) CreateConversation(ctx context.Context, conv *models.Conversation) (*models.Conversation, error) {
	sql := `INSERT INTO conversations
	(space_id, user_id, title, status)
	VALUES ($1, $2, $3, $4)
	RETURNING conversation_id, space_id, user_id, title, status, created_at, updated_at`

	var conversation models.Conversation

	err := db.pool.QueryRow(ctx, sql,
		conv.SpaceId,
		conv.UserId,
		conv.Title,
		conv.Status,
	).Scan(
		&conversation.ConversationId,
		&conversation.SpaceId,
		&conversation.UserId,
		&conversation.Title,
		&conversation.Status,
		&conversation.CreatedAt,
		&conversation.UpdatedAt,
	)
	if err != nil {
		return nil, utils.HandlePgError(err, "CreateConversation")
	}

	return &conversation, nil
}

func (db *Postgres) GetConversation(ctx context.Context, convId string) (*models.Conversation, error) {
	sql := `SELECT * FROM conversations WHERE conversation_id = $1 `
	var conv models.Conversation
	if err := db.pool.QueryRow(ctx, sql, convId).Scan(
		&conv.ConversationId,
		&conv.SpaceId,
		&conv.UserId,
		&conv.Title,
		&conv.Status,
		&conv.CreatedAt,
		&conv.UpdatedAt,
	); err != nil {
		return nil, utils.HandlePgError(err, "GetConversation")
	}
	return &conv, nil
}

func (db *Postgres) UpdateConversationTitle(ctx context.Context, convId string, title string) error {
	sql := `UPDATE conversations
	set title = $2, updated_at = NOW() WHERE conversation_id = $1`

	if _, err := db.pool.Exec(ctx, sql, convId, title); err != nil {
		return utils.HandlePgError(err, "UpdateConversationTitle")
	}
	return nil
}

func (db *Postgres) UpdateConversationStatus(ctx context.Context, convId string, status models.ConversationStatus) error {
	sql := `UPDATE conversations
	set status = $2, updated_at = NOW() WHERE conversation_id = $1`

	if _, err := db.pool.Exec(ctx, sql, convId, status); err != nil {
		return utils.HandlePgError(err, "UpdateConversationStatus")
	}
	return nil
}

func (db *Postgres) DeleteConversation(ctx context.Context, convId string) error {
	sql := `DELETE FROM conversations WHERE conversation_id = $1`
	if _, err := db.pool.Exec(ctx, sql, convId); err != nil {
		return utils.HandlePgError(err, "DeleteConversation")
	}
	return nil
}

func (db *Postgres) ListConversationsForSpace(ctx context.Context, spaceId string) ([]models.Conversation, error) {
	sql := `SELECT * FROM conversations WHERE space_id = $1 ORDER BY updated_at DESC`

	rows, err := db.pool.Query(ctx, sql, spaceId)
	if err != nil {
		return nil, utils.HandlePgError(err, "ListConversationsForSpace")
	}

	var conversations []models.Conversation
	for rows.Next() {
		var conversation models.Conversation
		err := rows.Scan(
			&conversation.ConversationId,
			&conversation.SpaceId,
			&conversation.UserId,
			&conversation.Title,
			&conversation.Status,
			&conversation.CreatedAt,
			&conversation.UpdatedAt,
		)
		if err != nil {
			return nil, utils.HandlePgError(err, "ListConversationsForSpace")
		}
		conversations = append(conversations, conversation)
	}

	return conversations, nil
}

func (db *Postgres) ListActiveConversationsForUser(ctx context.Context, userId string) ([]models.Conversation, error) {
	sql := `SELECT * FROM conversations WHERE status = $2 AND user_id = $1`

	rows, err := db.pool.Query(ctx, sql, userId, models.ConversationStatusActive)
	if err != nil {
		return nil, utils.HandlePgError(err, "ListActiveConversationsForUser")
	}

	var conversations []models.Conversation
	for rows.Next() {
		var conversation models.Conversation
		err := rows.Scan(
			&conversation.ConversationId,
			&conversation.SpaceId,
			&conversation.UserId,
			&conversation.Title,
			&conversation.Status,
			&conversation.CreatedAt,
			&conversation.UpdatedAt,
		)
		if err != nil {
			return nil, utils.HandlePgError(err, "ListActiveConversationsForUser")
		}
		conversations = append(conversations, conversation)
	}

	return conversations, nil
}
