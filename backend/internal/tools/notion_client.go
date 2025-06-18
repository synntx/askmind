package tools

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	notionAPIBaseURL = "https://api.notion.com/v1"
	notionAPIVersion = "2022-06-28"
)

// NotionClient is a centralized client for interacting with the Notion API.
type NotionClient struct {
	httpClient *http.Client
	apiKey     string
	DatabaseID string
}

// NewNotionClient creates a new client.
func NewNotionClient() (*NotionClient, error) {
	apiKey := os.Getenv("NOTION_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("NOTION_API_KEY environment variable not set")
	}
	databaseID := os.Getenv("NOTION_DATABASE_ID")
	if databaseID == "" {
		return nil, fmt.Errorf("NOTION_DATABASE_ID environment variable not set")
	}

	transport := &http.Transport{
		Proxy:               http.ProxyFromEnvironment,
		DialContext:         (&net.Dialer{Timeout: 3 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		MaxIdleConns:        50,
		IdleConnTimeout:     60 * time.Second,
		TLSHandshakeTimeout: 5 * time.Second,
	}
	client := &http.Client{Transport: transport, Timeout: 8 * time.Second}

	return &NotionClient{httpClient: client, apiKey: apiKey, DatabaseID: databaseID}, nil
}

// makeRequest is a helper for all API requests.
func (nc *NotionClient) makeRequest(ctx context.Context, method, url string, payload io.Reader) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, url, payload)
	if err != nil {
		return nil, fmt.Errorf("failed to create notion request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+nc.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Notion-Version", notionAPIVersion)

	return nc.httpClient.Do(req)
}

// --- API Methods ---

// CreatePage creates a new page in the pre-configured database.
func (nc *NotionClient) CreatePage(ctx context.Context, title, content string) (string, error) {
	payload := NotionCreatePagePayload{}
	payload.Parent.DatabaseID = nc.DatabaseID
	payload.Properties.Title = []NotionTitle{{Text: struct {
		Content string `json:"content"`
	}{Content: title}}}
	payload.Children = []NotionParagraphBlock{{
		Object: "block", Type: "paragraph",
		Paragraph: struct {
			RichText []NotionRichText `json:"rich_text"`
		}{RichText: []NotionRichText{{Text: struct {
			Content string `json:"content"`
		}{Content: content}}}}},
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal create payload: %w", err)
	}

	res, err := nc.makeRequest(ctx, "POST", notionAPIBaseURL+"/pages", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return "", fmt.Errorf("notion create API returned status %d: %s", res.StatusCode, string(bodyBytes))
	}

	var result map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return "Successfully created page, but failed to parse response for URL.", nil
	}
	pageURL, _ := result["url"].(string)
	return fmt.Sprintf("Successfully created Notion page titled '%s'. URL: %s", title, pageURL), nil
}

// GetPageContent retrieves all the text blocks from a page. THIS IS THE VIEW/READ FUNCTION.
func (nc *NotionClient) GetPageContent(ctx context.Context, pageID string) (string, error) {
	url := fmt.Sprintf("%s/blocks/%s/children", notionAPIBaseURL, pageID)
	res, err := nc.makeRequest(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return "", fmt.Errorf("notion get content API returned status %d: %s", res.StatusCode, string(bodyBytes))
	}

	var response NotionBlockChildrenResponse
	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("failed to decode notion page content: %w", err)
	}

	var contentBuilder strings.Builder
	for _, block := range response.Results {
		if block.Type == "paragraph" && len(block.Paragraph.RichText) > 0 {
			contentBuilder.WriteString(block.Paragraph.RichText[0].PlainText)
			contentBuilder.WriteString("\n")
		}
	}

	pageContent := strings.TrimSpace(contentBuilder.String())
	if pageContent == "" {
		return "No readable paragraph text found on this page.", nil
	}
	return pageContent, nil
}

// SearchPages searches for pages by keyword.
func (nc *NotionClient) SearchPages(ctx context.Context, query string) (string, error) {
	// Search is a POST request in the Notion API
	payload := strings.NewReader(fmt.Sprintf(`{"query": "%s"}`, query))
	res, err := nc.makeRequest(ctx, "POST", notionAPIBaseURL+"/search", payload)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	bodyBytes, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("notion search API returned status %d: %s", res.StatusCode, string(bodyBytes))
	}

	// For now, we return the raw JSON. A future improvement could be to parse this into a friendly format.
	return string(bodyBytes), nil
}

// In internal/tools/notion_client.go

// (This is the new, more flexible AppendToPage function)
func (nc *NotionClient) AppendToPage(ctx context.Context, pageID, content, blockType string) (string, error) {
	// Default to paragraph if blockType is invalid or not provided
	if blockType == "" {
		blockType = "paragraph"
	}

	// Create a generic block structure
	var block map[string]interface{}
	block = map[string]interface{}{
		"object": "block",
		"type":   blockType,
		blockType: map[string]interface{}{
			"rich_text": []map[string]interface{}{
				{
					"type": "text",
					"text": map[string]interface{}{
						"content": content,
					},
				},
			},
		},
	}

	// Notion's API uses a slightly different structure for code blocks
	if blockType == "code" {
		block[blockType] = map[string]interface{}{
			"rich_text": []map[string]interface{}{
				{
					"type": "text",
					"text": map[string]interface{}{
						"content": content,
					},
				},
			},
			"language": "plain text", // You could add a parameter for this later!
		}
	}

	payloadBody := struct {
		Children []map[string]interface{} `json:"children"`
	}{
		Children: []map[string]interface{}{block},
	}

	jsonPayload, err := json.Marshal(payloadBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal append payload: %w", err)
	}

	url := fmt.Sprintf("%s/blocks/%s/children", notionAPIBaseURL, pageID)
	res, err := nc.makeRequest(ctx, "PATCH", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return "", fmt.Errorf("notion append API returned status %d: %s", res.StatusCode, string(bodyBytes))
	}
	return fmt.Sprintf("Successfully appended a '%s' block to Notion page %s.", blockType, pageID), nil
}
