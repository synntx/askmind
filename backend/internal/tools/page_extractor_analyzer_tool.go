package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode"

	"github.com/PuerkitoBio/goquery"
	"github.com/google/generative-ai-go/genai"
	"golang.org/x/net/html"
)

const (
	psaPageFetchTimeout        = 10 * time.Second
	psaMaxHTMLBodySize         = 4 * 1024 * 1024
	psaHTTPClientTimeout       = 12 * time.Second
	psaMaxTextPreviewLength    = 200
	psaMaxTableCellsForPreview = 20
)

type PageStructureResult struct {
	URL                   string           `json:"url"`
	Title                 string           `json:"title,omitempty"`
	Metadata              PageMetadata     `json:"metadata,omitempty"`
	TableOfContents       []HeadingElement `json:"table_of_contents,omitempty"`
	MainContentTextBlocks []string         `json:"main_content_text_blocks,omitempty"`
	ExtractedTables       []TableData      `json:"extracted_tables,omitempty"`
	ExtractedLists        []ListData       `json:"extracted_lists,omitempty"`
	KeyLinks              []LinkData       `json:"key_links,omitempty"`
	ExecutionError        string           `json:"execution_error,omitempty"`
	ProcessingTimeMs      int64            `json:"processing_time_ms"`
}

type PageMetadata struct {
	Description   string   `json:"description,omitempty"`
	Keywords      []string `json:"keywords,omitempty"`
	Author        string   `json:"author,omitempty"`
	PublishedDate string   `json:"published_date,omitempty"`
	Generator     string   `json:"generator,omitempty"`
}

type HeadingElement struct {
	Level int    `json:"level"` // 1 for H1, 2 for H2, etc.
	Text  string `json:"text"`
	ID    string `json:"id,omitempty"`
}

type TableData struct {
	ID      string     `json:"id,omitempty"`
	Caption string     `json:"caption,omitempty"`
	Headers []string   `json:"headers,omitempty"`
	Rows    [][]string `json:"rows,omitempty"`    // List of rows, each row is a list of cell texts
	Preview string     `json:"preview,omitempty"` // A textual preview of the table
}

type ListData struct {
	ID    string   `json:"id,omitempty"`
	Type  string   `json:"type"`  // "ordered" or "unordered"
	Items []string `json:"items"` // List of item texts
}

type LinkData struct {
	Text string `json:"text"`
	Href string `json:"href"`
	Rel  string `json:"rel,omitempty"`
}

type WebPageStructureAnalyzerTool struct {
	httpClient *http.Client
}

func NewWebPageStructureAnalyzerTool() *WebPageStructureAnalyzerTool {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   dialTimeout,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          20,
		IdleConnTimeout:       idleConnTimeout,
		TLSHandshakeTimeout:   tlsHandshakeTimeout,
		ResponseHeaderTimeout: responseHeaderTimeout,
	}
	client := &http.Client{
		Transport: transport,
		Timeout:   psaHTTPClientTimeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}
	return &WebPageStructureAnalyzerTool{httpClient: client}
}

func (psa *WebPageStructureAnalyzerTool) Name() string {
	return "web_page_structure_analyzer"
}

func (psa *WebPageStructureAnalyzerTool) Description() string {
	return "Analyzes the HTML structure of a given web page, extracting metadata, headings (table of contents), main text blocks, tables, and lists. Provides a structured overview of the page content."
}

func (psa *WebPageStructureAnalyzerTool) Parameters() []Parameter {
	return []Parameter{
		{Name: "url", Description: "The URL of the web page to analyze.", Type: genai.TypeString, Required: true},
		{Name: "extract_main_content", Description: "Attempt to identify and extract text blocks from the main content area (default true).", Type: genai.TypeBoolean, Optional: true},
		{Name: "extract_tables", Description: "Extract data from HTML tables (default true).", Type: genai.TypeBoolean, Optional: true},
		{Name: "extract_lists", Description: "Extract items from ordered and unordered lists (default true).", Type: genai.TypeBoolean, Optional: true},
	}
}

func (psa *WebPageStructureAnalyzerTool) Execute(ctx context.Context, args map[string]any) (string, error) {
	startTime := time.Now()
	pageURL, ok := args["url"].(string)
	if !ok || strings.TrimSpace(pageURL) == "" {
		return "", fmt.Errorf("missing or invalid 'url' argument")
	}

	// Default to true if not specified or if type is wrong
	extractMainContent := getBoolArg(args, "extract_main_content", true)
	extractTables := getBoolArg(args, "extract_tables", true)
	extractLists := getBoolArg(args, "extract_lists", true)

	fmt.Printf("INFO: PageStructureAnalyzerTool starting for URL: %s\n", pageURL)
	result := PageStructureResult{URL: pageURL}

	fetchCtx, cancel := context.WithTimeout(ctx, psaPageFetchTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(fetchCtx, "GET", pageURL, nil)
	if err != nil {
		result.ExecutionError = fmt.Sprintf("failed to create request: %v", err)
		return psa.formatResult(&result, startTime)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	res, err := psa.httpClient.Do(req)
	if err != nil {
		result.ExecutionError = fmt.Sprintf("http client Do error: %v", err)
		return psa.formatResult(&result, startTime)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		result.ExecutionError = fmt.Sprintf("received status %d", res.StatusCode)
		return psa.formatResult(&result, startTime)
	}

	contentType := res.Header.Get("Content-Type")
	if !strings.Contains(strings.ToLower(contentType), "text/html") {
		result.ExecutionError = fmt.Sprintf("non-HTML content type '%s'", contentType)
		return psa.formatResult(&result, startTime)
	}

	doc, err := goquery.NewDocumentFromReader(io.LimitReader(res.Body, psaMaxHTMLBodySize))
	if err != nil {
		result.ExecutionError = fmt.Sprintf("failed to parse HTML: %v", err)
		return psa.formatResult(&result, startTime)
	}

	result.Title = strings.TrimSpace(doc.Find("title").First().Text())

	// Extract Metadata
	result.Metadata = psa.extractMetadata(doc)

	// Extract Table of Contents (Headings)
	result.TableOfContents = psa.extractHeadings(doc)

	// Extract Main Content (Simplified)
	if extractMainContent {
		result.MainContentTextBlocks = psa.extractMainContentText(doc)
	}

	// Extract Tables
	if extractTables {
		result.ExtractedTables = psa.extractTables(doc)
	}

	// Extract Lists
	if extractLists {
		result.ExtractedLists = psa.extractLists(doc)
	}

	// Extract Key Links (e.g. from nav or primary sections)
	result.KeyLinks = psa.extractKeyLinks(doc, pageURL)

	return psa.formatResult(&result, startTime)
}

func (psa *WebPageStructureAnalyzerTool) extractMetadata(doc *goquery.Document) PageMetadata {
	var meta PageMetadata
	doc.Find("meta").Each(func(i int, s *goquery.Selection) {
		name, _ := s.Attr("name")
		property, _ := s.Attr("property")
		content, _ := s.Attr("content")
		name = strings.ToLower(name)
		property = strings.ToLower(property)

		if content == "" {
			return
		}

		if name == "description" || property == "og:description" {
			meta.Description = content
		}
		if name == "keywords" {
			meta.Keywords = strings.Split(content, ",")
			for i, k := range meta.Keywords {
				meta.Keywords[i] = strings.TrimSpace(k)
			}
		}
		if name == "author" || property == "article:author" {
			meta.Author = content
		}
		if name == "generator" {
			meta.Generator = content
		}
		if name == "publish-date" || name == "creation_date" || property == "article:published_time" || property == "og:published_time" {
			meta.PublishedDate = content
		}
	})
	return meta
}

func (psa *WebPageStructureAnalyzerTool) extractHeadings(doc *goquery.Document) []HeadingElement {
	var headings []HeadingElement
	doc.Find("h1, h2, h3, h4, h5, h6").Each(func(i int, s *goquery.Selection) {
		level := 0
		switch goquery.NodeName(s) {
		case "h1":
			level = 1
		case "h2":
			level = 2
		case "h3":
			level = 3
		case "h4":
			level = 4
		case "h5":
			level = 5
		case "h6":
			level = 6
		}
		text := psa.cleanText(s.Text())
		id, _ := s.Attr("id")
		if text != "" {
			headings = append(headings, HeadingElement{Level: level, Text: text, ID: id})
		}
	})
	return headings
}

// NOTE: main content extraction - for a more robust version we can use libraries like readability.js (via microservice)
func (psa *WebPageStructureAnalyzerTool) extractMainContentText(doc *goquery.Document) []string {
	var textBlocks []string
	// Common main content selectors
	selectors := []string{"article", "main", "div[role='main']", ".content", ".entry-content", ".post-body", ".main-content", "div[class*='content']"}
	var mainContentSelection *goquery.Selection

	for _, selector := range selectors {
		mainContentSelection = doc.Find(selector).First()
		if mainContentSelection.Length() > 0 {
			break
		}
	}
	if mainContentSelection.Length() == 0 {
		mainContentSelection = doc.Find("body")
	}

	// Remove common non-content elements
	mainContentSelection.Find("script, style, nav, header, footer, aside, form, .noprint, .sidebar, figure > figcaption, details > summary").Remove()

	mainContentSelection.Find("p, div, li").Each(func(i int, s *goquery.Selection) {
		hasBlockChildren := false
		s.ChildrenFiltered("p, div, li, table, ul, ol, h1, h2, h3, h4, h5, h6").Each(func(_ int, _ *goquery.Selection) {
			hasBlockChildren = true
		})

		var text string
		if !hasBlockChildren {
			text = psa.cleanText(s.Text())
		} else {
			s.Contents().Each(func(_ int, contentSel *goquery.Selection) {
				if isTextNode(contentSel) {
					text += psa.cleanText(contentSel.Text()) + " "
				}
			})
			text = psa.cleanText(text)
		}

		if len(strings.Fields(text)) > 5 {
			textBlocks = append(textBlocks, text)
		}
	})
	return textBlocks
}

func (psa *WebPageStructureAnalyzerTool) extractTables(doc *goquery.Document) []TableData {
	var tables []TableData
	doc.Find("table").Each(func(i int, s *goquery.Selection) {
		var table TableData
		table.ID, _ = s.Attr("id")
		table.Caption = psa.cleanText(s.Find("caption").First().Text())

		s.Find("thead tr th, tr th").Each(func(hi int, th *goquery.Selection) {
			table.Headers = append(table.Headers, psa.cleanText(th.Text()))
		})
		if len(table.Headers) == 0 {
			s.Find("tbody tr, tr").First().Find("td").Each(func(hi int, td *goquery.Selection) {
				table.Headers = append(table.Headers, psa.cleanText(td.Text()))
			})
		}

		// Extract rows (td)
		s.Find("tbody tr, tr").Each(func(ri int, tr *goquery.Selection) {
			if len(table.Headers) > 0 && ri == 0 && (s.Find("thead").Length() > 0 || s.Find("tr th").Length() > 0) {
				isHeaderRow := true
				tr.Find("td").Each(func(_ int, cell *goquery.Selection) {
					if cell.Children().Filter("th").Length() == 0 {
						// COMPLEX: because tr might contain td for data and th for row header
					}
				})
				if isHeaderRow && s.Find("tbody tr th").Length() == 0 && s.Find("tr th").Length() > 0 {
				} else if s.Find("thead").Length() > 0 { // If thead exists, tbody rows are data
					// continue
				} else if ri == 0 && len(table.Headers) > 0 { // if we used first row as header, skip it
					// return // continue to next row
				}
			}

			var row []string
			tr.Find("td").Each(func(ci int, td *goquery.Selection) {
				row = append(row, psa.cleanText(td.Text()))
			})
			if len(row) > 0 {
				table.Rows = append(table.Rows, row)
			}
		})
		// SIMPLE TEXT PREVIEW
		var previewBuilder strings.Builder
		cellCount := 0
		if table.Caption != "" {
			previewBuilder.WriteString("Caption: " + table.Caption + "\n")
		}
		if len(table.Headers) > 0 {
			previewBuilder.WriteString("Headers: " + strings.Join(table.Headers, " | ") + "\n")
		}
		for rIdx, row := range table.Rows {
			if rIdx < 5 { // Preview first 5 rows
				previewBuilder.WriteString(strings.Join(row, " | ") + "\n")
				cellCount += len(row)
				if cellCount > psaMaxTableCellsForPreview {
					break
				}
			} else {
				break
			}
		}
		table.Preview = strings.TrimSpace(previewBuilder.String())

		tables = append(tables, table)
	})
	return tables
}

func (psa *WebPageStructureAnalyzerTool) extractLists(doc *goquery.Document) []ListData {
	var lists []ListData
	doc.Find("ul, ol").Each(func(i int, s *goquery.Selection) {
		var list ListData
		list.ID, _ = s.Attr("id")
		if goquery.NodeName(s) == "ul" {
			list.Type = "unordered"
		} else {
			list.Type = "ordered"
		}
		s.ChildrenFiltered("li").Each(func(li int, item *goquery.Selection) {
			var itemTextBuilder strings.Builder
			item.Contents().Each(func(_ int, childNode *goquery.Selection) {
				if isTextNode(childNode) {
					itemTextBuilder.WriteString(childNode.Text())
				} else if childNode.Is("a, span, em, strong, b, i, code, sub, sup") {
					itemTextBuilder.WriteString(childNode.Text())
				}
			})
			cleanedItemText := psa.cleanText(itemTextBuilder.String())
			if cleanedItemText != "" {
				list.Items = append(list.Items, cleanedItemText)
			}
		})
		if len(list.Items) > 0 {
			lists = append(lists, list)
		}
	})
	return lists
}

func (psa *WebPageStructureAnalyzerTool) extractKeyLinks(doc *goquery.Document, pageURL string) []LinkData {
	var keyLinks []LinkData
	baseUrl, _ := url.Parse(pageURL)

	// Nav links
	doc.Find("nav a").Each(func(i int, s *goquery.Selection) {
		text := psa.cleanText(s.Text())
		href, _ := s.Attr("href")
		if text != "" && href != "" && !strings.HasPrefix(href, "#") && !strings.HasPrefix(strings.ToLower(href), "javascript:") {
			absHref := psa.resolveLink(baseUrl, href)
			keyLinks = append(keyLinks, LinkData{Text: text, Href: absHref})
		}
	})
	if len(keyLinks) > 20 {
		keyLinks = keyLinks[:20]
	}
	return keyLinks
}

func (psa *WebPageStructureAnalyzerTool) resolveLink(base *url.URL, href string) string {
	if base == nil {
		return href
	}
	absURL, err := base.Parse(href)
	if err != nil {
		return href
	}
	return absURL.String()
}

func isTextNode(s *goquery.Selection) bool {
	if s == nil || s.Length() == 0 {
		return false
	}
	node := s.Get(0)
	return node.Type == html.TextNode
}

func (psa *WebPageStructureAnalyzerTool) cleanText(s string) string {
	s = strings.Join(strings.Fields(s), " ")
	s = strings.Map(func(r rune) rune {
		if unicode.IsPrint(r) || unicode.IsSpace(r) {
			return r
		}
		return -1 // Remove
	}, s)
	return strings.TrimSpace(s)
}

func (psa *WebPageStructureAnalyzerTool) formatResult(result *PageStructureResult, start time.Time) (string, error) {
	result.ProcessingTimeMs = time.Since(start).Milliseconds()
	if result.ExecutionError != "" {
		fmt.Printf("ERROR: PageStructureAnalyzerTool for URL '%s' failed: %s (Took %dms)\n", result.URL, result.ExecutionError, result.ProcessingTimeMs)
	} else {
		fmt.Printf("PERF: PageStructureAnalyzerTool for URL '%s' took %dms\n", result.URL, result.ProcessingTimeMs)
	}

	jsonData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		jsonDataSimple, _ := json.Marshal(result)
		return string(jsonDataSimple), fmt.Errorf("failed to marshal page structure results: %w. Error: %s", err, result.ExecutionError)
	}
	if result.ExecutionError != "" {
		return string(jsonData), fmt.Errorf("page structure analysis failed: %s", result.ExecutionError)
	}
	return string(jsonData), nil
}

func getBoolArg(args map[string]any, key string, defaultValue bool) bool {
	if val, ok := args[key].(bool); ok {
		return val
	}
	return defaultValue
}
