package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/synntx/askmind/internal/models"
)

func (db *Postgres) CreateMessage(ctx context.Context, msg *models.ChatMessage) error {
	sql := `INSERT INTO chat_messages
	(conversation_id, role, sender_id, content, tokens_used, model, metadata,created_at, updated_at)
	VALUES ($1, $2,$3, $4,$5, $6, $7, $8, $9)`

	_, err := db.pool.Exec(ctx, sql,
		msg.ConversationId,
		msg.Role,
		msg.SenderId,
		msg.Content,
		msg.TokensUsed,
		msg.Model,
		msg.Metadata,
		msg.CreatedAt,
		msg.UpdatedAt,
	)
	return err
}

func (db *Postgres) CreateMessages(ctx context.Context, msgs []models.ChatMessage) error {
	batch := &pgx.Batch{}
	for _, msg := range msgs {
		batch.Queue(
			`INSERT INTO chat_messages
			(conversation_id, role, sender_id, content, tokens_used, model, metadata,created_at, updated_at)
			VALUES ($1, $2,$3, $4,$5, $6, $7, $8, $9)`,
			msg.ConversationId,
			msg.Role,
			msg.SenderId,
			msg.Content,
			msg.TokensUsed,
			msg.Model,
			msg.Metadata,
			msg.CreatedAt,
			msg.UpdatedAt,
		)
	}

	br := db.pool.SendBatch(ctx, batch)
	defer br.Close()
	_, err := br.Exec()
	return err
}

func (db *Postgres) GetMessage(ctx context.Context, messageId string) (*models.ChatMessage, error) {
	sql := `SELECT * FROM chat_messages WHERE message_id = $1`

	var msg models.ChatMessage
	err := db.pool.QueryRow(ctx, sql, messageId).Scan(&msg)

	return &msg, err
}

func (db *Postgres) GetConversationMessages(ctx context.Context, convId string) ([]models.ChatMessage, error) {
	sql := `SELECT * FROM chat_messages WHERE conversation_id = $1`

	rows, err := db.pool.Query(ctx, sql, convId)
	if err != nil {
		return nil, err
	}

	var msgs []models.ChatMessage

	for rows.Next() {
		var msg models.ChatMessage
		err := rows.Scan(&msg)
		if err != nil {
			return nil, err
		}
		msgs = append(msgs, msg)
	}

	return msgs, nil
}

// only user & assistant message exclude agents messages
func (db *Postgres) GetConversationUserMessages(ctx context.Context, convId string) ([]models.ChatMessage, error) {
	sql := `SELECT * FROM chat_messages WHERE conversation_id = $1 AND role = $2 OR role = $3`

	rows, err := db.pool.Query(ctx, sql, convId, models.RoleAssistant, models.RoleUser)
	if err != nil {
		return nil, err
	}

	var msgs []models.ChatMessage

	for rows.Next() {
		var msg models.ChatMessage
		err := rows.Scan(&msg)
		if err != nil {
			return nil, err
		}
		msgs = append(msgs, msg)
	}

	return msgs, nil
}
