package tools

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/generative-ai-go/genai"
)

type NotionTool struct {
	client *NotionClient
}

func NewNotionTool(client *NotionClient) *NotionTool {
	return &NotionTool{client: client}
}

func (t *NotionTool) Name() string {
	return "notion"
}

func (t *NotionTool) Description() string {
	return "A multi-purpose tool to interact with Notion pages. Use the 'action' parameter to specify the operation."
}

func (t *NotionTool) Parameters() []Parameter {
	return []Parameter{
		{
			Name:        "action",
			Description: "The operation to perform.",
			Type:        genai.TypeString,
			Required:    true,
			Enum:        []string{"create_page", "get_page_content", "append_to_page", "search_pages"},
		},
		{Name: "title", Description: "The title of the page. Required for 'create_page'.", Type: genai.TypeString, Optional: true},
		{Name: "content", Description: "Text content. Required for 'create_page' and 'append_to_page'.", Type: genai.TypeString, Optional: true},
		{Name: "page_id", Description: "The ID of the Notion page. Required for 'get_page_content' and 'append_to_page'.", Type: genai.TypeString, Optional: true},
		{Name: "query", Description: "The keyword to search for. Required for 'search_pages'.", Type: genai.TypeString, Optional: true},
		{
			Name:        "block_type",
			Description: "The type of block to create for 'append_to_page'. Examples: 'paragraph', 'heading_1', 'heading_2', 'quote', 'code'. Defaults to 'paragraph'.",
			Type:        genai.TypeString,
			Optional:    true,
		},
	}
}

func (t *NotionTool) Execute(ctx context.Context, args map[string]any) (string, error) {
	action, ok := args["action"].(string)
	if !ok {
		return "", fmt.Errorf("missing required 'action' argument")
	}

	switch action {
	case "create_page":
		title, ok1 := args["title"].(string)
		content, ok2 := args["content"].(string)
		if !ok1 || !ok2 || strings.TrimSpace(title) == "" {
			return "", fmt.Errorf("for action 'create_page', 'title' and 'content' are required")
		}
		return t.client.CreatePage(ctx, title, content)

	case "get_page_content":
		pageID, ok := args["page_id"].(string)
		if !ok || strings.TrimSpace(pageID) == "" {
			return "", fmt.Errorf("for action 'get_page_content', 'page_id' is required")
		}
		return t.client.GetPageContent(ctx, pageID)

	case "append_to_page":
		pageID, ok1 := args["page_id"].(string)
		content, ok2 := args["content"].(string)
		if !ok1 || !ok2 || strings.TrimSpace(pageID) == "" {
			return "", fmt.Errorf("for action 'append_to_page', 'page_id' and 'content' are required")
		}
		// Get the new optional parameter
		blockType, _ := args["block_type"].(string)

		// Call the updated client method
		return t.client.AppendToPage(ctx, pageID, content, blockType)

	case "search_pages":
		query, ok := args["query"].(string)
		if !ok || strings.TrimSpace(query) == "" {
			return "", fmt.Errorf("for action 'search_pages', 'query' is required")
		}
		return t.client.SearchPages(ctx, query)

	default:
		return "", fmt.Errorf("invalid action '%s'. Must be one of: create_page, get_page_content, append_to_page, search_pages", action)
	}
}

// For creating pages
type NotionTitle struct {
	Text struct {
		Content string `json:"content"`
	} `json:"text"`
}
type NotionRichText struct {
	Text struct {
		Content string `json:"content"`
	} `json:"text"`
}
type NotionParagraphBlock struct {
	Object    string `json:"object"`
	Type      string `json:"type"`
	Paragraph struct {
		RichText []NotionRichText `json:"rich_text"`
	} `json:"paragraph"`
}
type NotionCreatePagePayload struct {
	Parent struct {
		DatabaseID string `json:"database_id"`
	} `json:"parent"`
	Properties struct {
		Title []NotionTitle `json:"Name"`
	} `json:"properties"` 
	Children []NotionParagraphBlock `json:"children"`
}

// For viewing page content
type NotionBlockChildrenResponse struct {
	Results []NotionBlock `json:"results"`
}
type NotionBlock struct {
	Type      string `json:"type"`
	Paragraph struct {
		RichText []struct {
			PlainText string `json:"plain_text"`
		} `json:"rich_text"`
	} `json:"paragraph"`
}
