package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strconv"

	"github.com/google/generative-ai-go/genai"
	"github.com/synntx/askmind/internal/embedding"
	"github.com/synntx/askmind/internal/processing"
	"github.com/synntx/askmind/internal/tools"
	"github.com/synntx/askmind/internal/vectordb"
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

	url := os.Getenv("MILVUSDB_URI")
	username := os.Getenv("MILVUSDB_USERNAME")
	password := os.Getenv("MILVUSDB_PASSWORD")
	collection := "askmind_document_embeddings"
	dim := 768
	nlist := 1024
	nprobe := 32
	vectorDB := vectordb.NewMilvusDB(url, username, password, collection, dim, nlist, nprobe)
	err = vectorDB.Connect()
	if err != nil {
		log.Fatalf("Error in connecting: %v", err)
	}

	// --------- create embeddings and store in vector db --------- //
	for _, chunk := range chunkedText {
		res, err := embedding.Generate(client, ctx, chunk)
		if err != nil {
			fmt.Printf("Failed to generate embedding for chunk: %v\n", err)
			continue
		}
		log.Println("Embeddings: ", res.Embedding.Values)
		// save embeddings in vector db
		randomId := strconv.Itoa(rand.Intn(1_00_000))
		err = vectorDB.InsertEmbedding(randomId, chunk, "user_1", res.Embedding.Values)
		if err != nil {
			fmt.Printf("Failed to insert embedding (ID: %s): %v\n", randomId, err)
			continue
		}

		fmt.Printf("Successfully inserted chunk (ID: %s)\n", randomId)

		testQuery := res.Embedding.Values
		results, err := vectorDB.SearchSimilarEmbeddings(testQuery, 5, "user_1")
		if err != nil {
			fmt.Printf("Search failed: %v\n", err)
			return
		}

		fmt.Println("\nSearch Results:")
		for _, result := range results {
			fmt.Printf("ID: %s | UserID: %s | Score: %.2f | Text: %s\n",
				result.ID, result.UserId, result.Score, result.Text)
		}
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
