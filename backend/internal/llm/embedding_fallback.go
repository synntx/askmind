package llm

import (
	"context"
	"fmt"
)

type EmbeddingFallbackLLM struct {
	LLM
	embeddingProvider LLM
}

func NewEmbeddingFallbackLLM(primary LLM, embeddingProvider LLM) *EmbeddingFallbackLLM {
	return &EmbeddingFallbackLLM{
		LLM:               primary,
		embeddingProvider: embeddingProvider,
	}
}

func (e *EmbeddingFallbackLLM) GenerateEmbeddings(ctx context.Context, input string) ([]float32, error) {
	embeddings, err := e.LLM.GenerateEmbeddings(ctx, input)
	if err == nil {
		return embeddings, nil
	}

	if e.embeddingProvider != nil {
		return e.embeddingProvider.GenerateEmbeddings(ctx, input)
	}

	return nil, fmt.Errorf("no embedding provider available: %w", err)
}
