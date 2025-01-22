package tools

import (
	"context"
	"fmt"
)

type SearchTool struct{}

func (s *SearchTool) Name() string {
	return "search"
}

func (s *SearchTool) Description() string {
	return "Useful for when you need to find information on the web."
}

func (s *SearchTool) Execute(ctx context.Context, input string) (string, error) {
	if input == "" {
		return "", fmt.Errorf("searchTool.Execute: search query cannot be empty")
	}
	fmt.Printf("Executing search for query: %s\n", input)
	return "Search results for " + input, nil
}
