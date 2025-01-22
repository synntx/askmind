package main

import (
	"context"
	"fmt"
	"os"

	"github.com/google/generative-ai-go/genai"
	"github.com/harshyadavone/askmind/internal/embedding"
	"github.com/harshyadavone/askmind/internal/processing"
	"github.com/harshyadavone/askmind/internal/tools"
	"google.golang.org/api/option"
)

func main() {
	filePath := "test.txt"

	extractedText, err := processing.ProcessFile(filePath)
	if err != nil {
		fmt.Printf("Error processing file: %v\n", err)
		return
	}

	toolRegistry := tools.NewToolRegistry()
	toolRegistry.Register(&tools.SearchTool{})

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))

	chunkedText := processing.ChunkText(extractedText, 1024)

	// --------- create embeddings and store in vector db --------- //
	for _, chunk := range chunkedText {
		res, err := embedding.Generate(client, ctx, chunk)
		if err != nil {
			continue
		}
		// save embeddings in vector db
	}

	// -------------------------------------- LLM Response ------------------------------------------------ //
	// simulate gemini response
	prompt := fmt.Sprintf("Please summarize the following text:\n%s", extractedText)
	response, err := processing.SimulateGemini(prompt)
	if err != nil {
		fmt.Printf("Error generating response: %v\n", err)
		return
	}
	fmt.Println("\nSimulated Gemini Response:")
	fmt.Println(response)
}
