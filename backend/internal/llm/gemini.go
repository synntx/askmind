package llm

import (
	"context"
	"errors"
	"fmt"
	"io"

	"github.com/google/generative-ai-go/genai"
	"go.uber.org/zap"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

type Gemini struct {
	Client    *genai.Client
	logger    *zap.Logger
	ModelName string
}

type ContentChunk struct {
	Content string
	Err     error
}

func NewGemini(client *genai.Client, logger *zap.Logger, modelName string) *Gemini {
	return &Gemini{
		Client:    client,
		logger:    logger,
		ModelName: modelName,
	}
}

// CreateGeminiClient creates a new genai client
func NewGeminiClient(ctx context.Context, apiKey string) (*genai.Client, error) {
	return genai.NewClient(ctx, option.WithAPIKey(apiKey))
}

func (g *Gemini) GenerateContent(ctx context.Context, input string) (string, error) {
	model := g.Client.GenerativeModel(g.ModelName) // Use configured model name
	resp, err := model.GenerateContent(ctx, genai.Text(input))
	if err != nil {
		g.logger.Error("Failed to generate content from Gemini", zap.Error(err), zap.String("input", input))
		return "", fmt.Errorf("failed to generate content from Gemini: %w", err)
	}

	if len(resp.Candidates) == 0 {
		g.logger.Warn("No candidates returned from Gemini", zap.String("input", input))
		return "", fmt.Errorf("no response candidates from Gemini")
	}

	if len(resp.Candidates[0].Content.Parts) == 0 {
		g.logger.Warn("No content parts in the first candidate from Gemini", zap.String("input", input))
		return "", fmt.Errorf("no content parts in Gemini response")
	}

	if text, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
		return string(text), nil
	} else {
		g.logger.Warn("Unexpected response type from Gemini, not text", zap.String("input", input), zap.Any("response", resp.Candidates[0].Content.Parts[0]))
		return "", fmt.Errorf("unexpected response type from Gemini, not text")
	}
}

func (g *Gemini) GenerateEmbeddings(ctx context.Context, input string) (*genai.EmbedContentResponse, error) {
	em := g.Client.EmbeddingModel("text-embedding-004")
	return em.EmbedContent(ctx, genai.Text(input))
}

func (g *Gemini) GenerateContentStream(ctx context.Context, input string) <-chan ContentChunk {
	model := g.Client.GenerativeModel(g.ModelName)
	stream := model.GenerateContentStream(ctx, genai.Text(input))

	contentStream := make(chan ContentChunk, 10)

	go func() {
		defer close(contentStream)

		for {
			resp, err := stream.Next()
			if err == iterator.Done || err == io.EOF {
				g.logger.Info("Gemini stream finished normally")
				return
			}
			if err != nil {
				fmt.Println("Error while generating content: ", err)
				var googleErr *googleapi.Error
				if errors.As(err, &googleErr) && googleErr.Code == 429 {
					g.logger.Error("Rate limit (429) error from Gemini stream Next()", zap.Error(err))
					contentStream <- ContentChunk{Err: fmt.Errorf("rate_limit_exceeded: %w", err)}

				} else {
					g.logger.Error("Error from Gemini stream Next()", zap.Error(err))
					contentStream <- ContentChunk{Err: fmt.Errorf("generation_error: %w", err)}
				}
				return
			}

			// Not so severe
			if resp == nil || len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
				g.logger.Warn("Unexpected empty response or candidates from Gemini stream")
				// errChan <- fmt.Errorf("empty_response: unexpected empty response from model")
				continue // ignore
			}

			part := resp.Candidates[0].Content.Parts[0]
			text, ok := part.(genai.Text)
			if !ok {
				g.logger.Warn("Unexpected part type in streamed response from Gemini, not text", zap.Any("part", part))
				contentStream <- ContentChunk{Err: fmt.Errorf("invalid_response: expected text but got different type")}
				return
			}

			chunk := string(text)
			g.logger.Debug("Received text chunk from Gemini", zap.String("chunk", chunk))

			select {
			case contentStream <- ContentChunk{Content: chunk}:
			case <-ctx.Done():
				contentStream <- ContentChunk{Err: ctx.Err()}
				return
			}
		}
	}()

	return contentStream
}
