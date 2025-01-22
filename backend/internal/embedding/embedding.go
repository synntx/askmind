package embedding

import (
	"context"
	"github.com/google/generative-ai-go/genai"
)

// Generate embedding

func Generate(client *genai.Client, ctx context.Context, text string) (*genai.EmbedContentResponse, error) {
	em := client.EmbeddingModel("text-embedding-004")
	return em.EmbedContent(ctx, genai.Text(text))
}
