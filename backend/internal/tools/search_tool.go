package tools

import (
	"context"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

type SearchTool struct{}

func (s *SearchTool) Name() string {
	return "search"
}

func (s *SearchTool) Description() string {
	return "Useful for when you need to find information on the web."
}

func (s *SearchTool) Parameters() []Parameter {
	return []Parameter{
		{
			Name:        "query",
			Description: "The search query",
			Type:        genai.TypeString,
		},
	}
}

func (s *SearchTool) Execute(ctx context.Context, args map[string]any) (string, error) {
	input, ok := args["query"].(string)
	if !ok {
		return "", fmt.Errorf("searchTool.Execute: query argument is not a string")
	}
	fmt.Printf("Executing search for query: %s\n", input)
	return "Search results for " + input, nil
}
