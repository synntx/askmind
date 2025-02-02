package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/synntx/askmind/internal/models"
	"github.com/synntx/askmind/internal/utils"
)

func (db *Postgres) CreateMessage(ctx context.Context, msg *models.CreateMessageRequest) error {
	sql := `INSERT INTO chat_messages
	(conversation_id, role,  content, tokens_used, model, metadata)
	VALUES ($1, $2,$3, $4,$5, $6)`

	if _, err := db.pool.Exec(ctx, sql,
		msg.ConversationId,
		msg.Role,
		msg.Content,
		msg.TokensUsed,
		msg.Model,
		msg.Metadata,
	); err != nil {
		return utils.HandlePgError(err, "CreateMessage")
	}
	return nil
}

func (db *Postgres) CreateMessages(ctx context.Context, msgs []models.CreateMessageRequest) error {
	batch := &pgx.Batch{}
	for _, msg := range msgs {
		batch.Queue(
			`INSERT INTO chat_messages
			(conversation_id, role, content, tokens_used, model, metadata)
			VALUES ($1, $2,$3, $4,$5, $6)`,
			msg.ConversationId,
			msg.Role,
			msg.Content,
			msg.TokensUsed,
			msg.Model,
			msg.Metadata,
		)
	}

	br := db.pool.SendBatch(ctx, batch)
	defer br.Close()
	if _, err := br.Exec(); err != nil {
		return utils.HandlePgError(err, "CreateMessages")
	}
	return nil
}

func (db *Postgres) GetMessage(ctx context.Context, messageId string) (*models.ChatMessage, error) {
	sql := `SELECT * FROM chat_messages WHERE message_id = $1`

	var msg models.ChatMessage
	if err := db.pool.QueryRow(ctx, sql, messageId).Scan(
		&msg.MessageId,
		&msg.ConversationId,
		&msg.Role,
		&msg.Content,
		&msg.TokensUsed,
		&msg.Model,
		&msg.Metadata,
		&msg.CreatedAt,
		&msg.UpdatedAt,
	); err != nil {
		return nil, utils.HandlePgError(err, "GetMessage")
	}

	return &msg, nil
}

func (db *Postgres) GetConversationMessages(ctx context.Context, convId string) ([]models.ChatMessage, error) {
	sql := `SELECT * FROM chat_messages WHERE conversation_id = $1`

	rows, err := db.pool.Query(ctx, sql, convId)
	if err != nil {
		return nil, utils.HandlePgError(err, "GetConversationMessages")
	}

	var msgs []models.ChatMessage

	for rows.Next() {
		var msg models.ChatMessage
		err := rows.Scan(
			&msg.MessageId,
			&msg.ConversationId,
			&msg.Role,
			&msg.Content,
			&msg.TokensUsed,
			&msg.Model,
			&msg.Metadata,
			&msg.CreatedAt,
			&msg.UpdatedAt,
		)
		if err != nil {
			return nil, utils.HandlePgError(err, "GetConversationMessages")
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
		return nil, utils.HandlePgError(err, "GetConversationUserMessages")
	}

	var msgs []models.ChatMessage

	for rows.Next() {
		var msg models.ChatMessage
		err := rows.Scan(
			&msg.MessageId,
			&msg.ConversationId,
			&msg.Role,
			&msg.Content,
			&msg.TokensUsed,
			&msg.Model,
			&msg.Metadata,
			&msg.CreatedAt,
			&msg.UpdatedAt,
		)
		if err != nil {
			return nil, utils.HandlePgError(err, "GetConversationUserMessages")
		}
		msgs = append(msgs, msg)
	}

	return msgs, nil
}
