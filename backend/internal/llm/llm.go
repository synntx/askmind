package llm

import (
	"context"

	"github.com/google/generative-ai-go/genai"
)

type LLM interface {
	GenerateContent(ctx context.Context, input string) (string, error)
	GenerateEmbeddings(ctx context.Context, input string) (*genai.EmbedContentResponse, error)
	GenerateContentStream(ctx context.Context, input string) <-chan ContentChunk
}
