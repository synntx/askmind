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
	psaMaxKeyLinks             = 25
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
	Description       string   `json:"description,omitempty"`
	Keywords          []string `json:"keywords,omitempty"`
	Author            string   `json:"author,omitempty"`
	PublishedDate     string   `json:"published_date,omitempty"`
	Generator         string   `json:"generator,omitempty"`
	CanonicalURL      string   `json:"canonical_url,omitempty"`
	OpenGraphType     string   `json:"og_type,omitempty"`
	OpenGraphImage    string   `json:"og_image,omitempty"`
	OpenGraphSiteName string   `json:"og_site_name,omitempty"`
	JSONLDData        []string `json:"json_ld_data,omitempty"`
}

type HeadingElement struct {
	Level int    `json:"level"`
	Text  string `json:"text"`
	ID    string `json:"id,omitempty"`
}

type TableData struct {
	ID      string     `json:"id,omitempty"`
	Caption string     `json:"caption,omitempty"`
	Headers []string   `json:"headers,omitempty"`
	Rows    [][]string `json:"rows,omitempty"`
	Preview string     `json:"preview,omitempty"`
}

type ListData struct {
	ID    string   `json:"id,omitempty"`
	Type  string   `json:"type"`
	Items []string `json:"items"`
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
		MaxIdleConns:          100,
		IdleConnTimeout:       idleConnTimeout,
		TLSHandshakeTimeout:   tlsHandshakeTimeout,
		ResponseHeaderTimeout: responseHeaderTimeout,
		MaxConnsPerHost:       10,
	}
	client := &http.Client{
		Transport: transport,
		Timeout:   psaHTTPClientTimeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
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
	return "Analyzes the HTML structure of a given web page, extracting metadata (including OpenGraph, JSON-LD), headings (table of contents), main text blocks, tables, lists, and key navigation/footer links. Provides a structured overview of the page content."
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

	parsedURL, err := url.ParseRequestURI(pageURL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		return "", fmt.Errorf("invalid URL format: '%s'. Must be a valid http or https URL", pageURL)
	}
	pageURL = parsedURL.String()

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
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) WebPageStructureAnalyzerTool/1.2")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")

	res, err := psa.httpClient.Do(req)
	if err != nil {
		errMsg := fmt.Sprintf("http client error: %v", err)
		if urlErr, ok := err.(*url.Error); ok && urlErr.Timeout() {
			errMsg = fmt.Sprintf("http client timeout fetching URL: %v", err)
		}
		result.ExecutionError = errMsg
		return psa.formatResult(&result, startTime)
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(io.LimitReader(res.Body, 1024))
		result.ExecutionError = fmt.Sprintf("received non-2xx status: %d %s. Body sample: %s", res.StatusCode, http.StatusText(res.StatusCode), string(bodyBytes))
		return psa.formatResult(&result, startTime)
	}

	contentType := res.Header.Get("Content-Type")
	if !strings.Contains(strings.ToLower(contentType), "text/html") && !strings.Contains(strings.ToLower(contentType), "application/xhtml+xml") {
		result.ExecutionError = fmt.Sprintf("unsupported content type '%s', expected HTML or XHTML", contentType)
		return psa.formatResult(&result, startTime)
	}

	doc, err := goquery.NewDocumentFromReader(io.LimitReader(res.Body, psaMaxHTMLBodySize))
	if err != nil {
		result.ExecutionError = fmt.Sprintf("failed to parse HTML: %v", err)
		return psa.formatResult(&result, startTime)
	}

	result.Title = psa.cleanText(doc.Find("title").First().Text())
	result.Metadata = psa.extractMetadata(doc)
	result.TableOfContents = psa.extractHeadings(doc)

	if extractMainContent {
		result.MainContentTextBlocks = psa.extractMainContentText(doc)
	}
	if extractTables {
		result.ExtractedTables = psa.extractTables(doc)
	}
	if extractLists {
		result.ExtractedLists = psa.extractLists(doc)
	}
	result.KeyLinks = psa.extractKeyLinks(doc, pageURL)

	return psa.formatResult(&result, startTime)
}

func (psa *WebPageStructureAnalyzerTool) extractMetadata(doc *goquery.Document) PageMetadata {
	var meta PageMetadata
	doc.Find("meta").Each(func(i int, s *goquery.Selection) {
		name, _ := s.Attr("name")
		property, _ := s.Attr("property")
		itemprop, _ := s.Attr("itemprop")
		content, contentExists := s.Attr("content")

		name = strings.ToLower(name)
		property = strings.ToLower(property)
		itemprop = strings.ToLower(itemprop)

		if !contentExists || content == "" {
			return
		}

		if property == "og:description" {
			meta.Description = content
		} else if (name == "description" || itemprop == "description") && meta.Description == "" {
			meta.Description = content
		}

		if name == "keywords" {
			rawKeywords := strings.Split(content, ",")
			meta.Keywords = []string{}
			for _, k := range rawKeywords {
				trimmedK := psa.cleanText(k)
				if trimmedK != "" {
					meta.Keywords = append(meta.Keywords, trimmedK)
				}
			}
		}

		if property == "article:author" || property == "og:article:author" {
			meta.Author = content
		} else if (name == "author" || itemprop == "author") && meta.Author == "" {
			meta.Author = content
		}

		if name == "generator" {
			meta.Generator = content
		}

		dateTags := []string{
			"article:published_time", "og:published_time",
			"publishdate", "publish_date", "publisheddate", "date",
			"dc.date.issued", "dcterms.created", "dcterms.date",
			"sailthru.date", itemprop,
		}
		for _, dt := range dateTags {
			checkProp := ""
			checkName := ""
			checkItemprop := ""
			if strings.HasPrefix(dt, "og:") || strings.HasPrefix(dt, "article:") {
				checkProp = dt
			} else if dt == itemprop {
				checkItemprop = dt
			} else {
				checkName = dt
			}

			if (checkProp != "" && property == checkProp) ||
				(checkName != "" && name == checkName) ||
				(checkItemprop != "" && itemprop == checkItemprop) {
				if meta.PublishedDate == "" || checkProp != "" {
					meta.PublishedDate = content
					if checkProp != "" {
						break
					}
				}
			}
		}

		if property == "og:type" {
			meta.OpenGraphType = content
		}
		if property == "og:image" {
			meta.OpenGraphImage = content
		}
		if property == "og:site_name" {
			meta.OpenGraphSiteName = content
		}
	})

	doc.Find("link[rel='canonical']").EachWithBreak(func(i int, s *goquery.Selection) bool {
		if href, exists := s.Attr("href"); exists && href != "" {
			meta.CanonicalURL = psa.resolveLink(doc.Url, href)
			return false
		}
		return true
	})

	doc.Find("script[type='application/ld+json']").Each(func(i int, s *goquery.Selection) {
		jsonLDContent := psa.cleanText(s.Text())
		if jsonLDContent != "" {
			if (strings.HasPrefix(jsonLDContent, "{") && strings.HasSuffix(jsonLDContent, "}")) ||
				(strings.HasPrefix(jsonLDContent, "[") && strings.HasSuffix(jsonLDContent, "]")) {
				meta.JSONLDData = append(meta.JSONLDData, jsonLDContent)
			}
		}
	})

	if meta.Description == "" {
		doc.Find("[itemprop='description']").EachWithBreak(func(i int, s *goquery.Selection) bool {
			if content, exists := s.Attr("content"); exists && content != "" {
				meta.Description = content
				return false
			}
			textDesc := psa.cleanText(s.Text())
			if textDesc != "" {
				meta.Description = textDesc
				return false
			}
			return true
		})
	}
	return meta
}

func (psa *WebPageStructureAnalyzerTool) extractHeadings(doc *goquery.Document) []HeadingElement {
	var headings []HeadingElement
	doc.Find("h1, h2, h3, h4, h5, h6").Each(func(i int, s *goquery.Selection) {
		if s.ParentsFiltered("table, nav, footer, aside, figure, blockquote").Length() > 0 {
			if !(s.Is("h1,h2") && s.ParentsFiltered("article, main, section[role='main'], div[role='main']").Length() > 0) {
				return
			}
		}
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
		if text != "" && level > 0 {
			headings = append(headings, HeadingElement{Level: level, Text: text, ID: id})
		}
	})
	return headings
}

func (psa *WebPageStructureAnalyzerTool) extractMainContentText(doc *goquery.Document) []string {
	var textBlocks []string
	mainContentSelectors := []string{
		"article", "main", "[role='main']",
		".post-content", ".entry-content", ".td-post-content",
		".article-body", ".story-content", "[itemprop='articleBody']",
		".content", ".main-content", ".page-content",
		"#content", "#main", "#body",
	}
	var mainContentSelection *goquery.Selection

	doc.Find(strings.Join(mainContentSelectors, ", ")).EachWithBreak(func(i int, s *goquery.Selection) bool {
		if s.Find("p").Length() > 1 || len(psa.cleanText(s.Text())) > 300 {
			isContainedInOtherCandidate := false
			for _, outerSelStr := range mainContentSelectors {
				if s.ParentsFiltered(outerSelStr).Length() > 0 {
					isContainedInOtherCandidate = true
					break
				}
			}
			if !isContainedInOtherCandidate {
				mainContentSelection = s
				return false
			}
		}
		return true
	})

	if mainContentSelection == nil || mainContentSelection.Length() == 0 {
		mainContentSelection = doc.Find("body").First()
	}

	contentClone := mainContentSelection.Clone()

	contentClone.Find("script, style, head, link, meta, title, noscript, iframe, frame, frameset, object, embed, param, map, area, nav, header, footer, aside, form, button, input, textarea, select, optgroup, option, label, .noprint, .sidebar, .widget, .ad, .ads, .advert, .advertisement, .banner, #comments, .comments, .comment-list, .social-share, .share-buttons, .related-posts, .post-meta, .byline, .timestamp, .cookie-banner, .popup, .modal, [role='navigation'], [role='banner'], [role='contentinfo'], [role='search'], [role='complementary'], [role='form'], [aria-hidden='true'], details > summary, figure > figcaption").Remove()

	contentClone.Find("p, div, li, pre, blockquote, section, article > div, td").Each(func(i int, s *goquery.Selection) {
		if (s.Is("li") && s.ParentsFiltered("ul, ol").Length() > 0) || (s.Is("div") && s.ParentsFiltered("ul, ol, table").Length() > 0) {
			return
		}

		hasSignificantBlockChildren := false
		s.ChildrenFiltered("p, div, ul, ol, table, pre, blockquote, section, article, h1, h2, h3, h4, h5, h6").EachWithBreak(func(_ int, child *goquery.Selection) bool {
			if len(psa.cleanText(child.Text())) > 50 {
				hasSignificantBlockChildren = true
				return false
			}
			return true
		})

		var text string
		if !hasSignificantBlockChildren {
			text = psa.cleanText(s.Text())
		} else {
			s.Contents().Each(func(_ int, contentSel *goquery.Selection) {
				if isTextNode(contentSel) {
					cleanedNodeText := psa.cleanText(contentSel.Text())
					if cleanedNodeText != "" {
						text += cleanedNodeText + " "
					}
				}
			})
			text = psa.cleanText(text)
		}

		words := strings.Fields(text)
		if len(words) > 5 && len(text) > 25 && !isLikelyNavigationOrFooterItem(text, s) {
			textBlocks = append(textBlocks, text)
		}
	})

	if len(textBlocks) < 2 && (mainContentSelection != nil && mainContentSelection.Length() > 0) {
		fullContentText := psa.cleanText(contentClone.Text())
		if len(strings.Fields(fullContentText)) > 20 {
			potentialBlocks := strings.Split(fullContentText, "\n")
			textBlocks = []string{}
			for _, pBlock := range potentialBlocks {
				cleanedPBlock := psa.cleanText(pBlock)
				if len(strings.Fields(cleanedPBlock)) > 5 && len(cleanedPBlock) > 25 {
					textBlocks = append(textBlocks, cleanedPBlock)
				}
			}
		}
	}

	finalBlocks := psa.deduplicateAndSmartMergeTextBlocks(textBlocks)
	if len(finalBlocks) > 150 {
		finalBlocks = finalBlocks[:150]
	}
	return finalBlocks
}

func isLikelyNavigationOrFooterItem(text string, s *goquery.Selection) bool {
	if len(strings.Fields(text)) > 7 {
		return false
	}
	if s.ParentsFiltered("nav, .nav, #nav, footer, .footer, #footer, .breadcrumbs, .pagination, .menu, .tabs").Length() > 0 {
		return true
	}
	textLower := strings.ToLower(text)
	navKeywords := []string{
		"home", "about us", "contact us", "services", "products", "blog", "news", "events",
		"faq", "support", "careers", "jobs", "login", "register", "sign in", "sign up",
		"terms of service", "privacy policy", "cookie policy", "sitemap", "accessibility",
		"©", "copyright", "all rights reserved",
	}
	for _, kw := range navKeywords {
		if strings.Contains(textLower, kw) {
			return true
		}
	}
	return false
}

func (psa *WebPageStructureAnalyzerTool) deduplicateAndSmartMergeTextBlocks(blocks []string) []string {
	if len(blocks) == 0 {
		return blocks
	}

	var uniqueBlocks []string
	seen := make(map[string]bool)
	for _, block := range blocks {
		trimmedBlock := strings.TrimSpace(block)
		if len(trimmedBlock) < 10 {
			continue
		}
		hash := trimmedBlock
		if !seen[hash] {
			seen[hash] = true
			uniqueBlocks = append(uniqueBlocks, trimmedBlock)
		}
	}

	if len(uniqueBlocks) < 2 {
		return uniqueBlocks
	}

	var mergedResult []string
	currentParagraph := new(strings.Builder)
	currentParagraph.WriteString(uniqueBlocks[0])

	for i := 1; i < len(uniqueBlocks); i++ {
		prevBlock := uniqueBlocks[i-1]
		currentBlock := uniqueBlocks[i]

		endsWithPunctuation := strings.HasSuffix(prevBlock, ".") || strings.HasSuffix(prevBlock, "!") || strings.HasSuffix(prevBlock, "?") || strings.HasSuffix(prevBlock, ":")
		startsWithCapital := len(currentBlock) > 0 && unicode.IsUpper(rune(currentBlock[0]))

		if (!endsWithPunctuation && len(strings.Fields(prevBlock)) < 20) ||
			(len(strings.Fields(currentBlock)) < 10 && !startsWithCapital && !endsWithPunctuation) {
			if currentParagraph.Len() > 0 {
				currentParagraph.WriteString(" ")
			}
			currentParagraph.WriteString(currentBlock)
		} else {
			mergedResult = append(mergedResult, psa.cleanText(currentParagraph.String()))
			currentParagraph.Reset()
			currentParagraph.WriteString(currentBlock)
		}
		if currentParagraph.Len() > 2000 {
			mergedResult = append(mergedResult, psa.cleanText(currentParagraph.String()))
			currentParagraph.Reset()
		}
	}
	if currentParagraph.Len() > 0 {
		mergedResult = append(mergedResult, psa.cleanText(currentParagraph.String()))
	}
	return mergedResult
}

func (psa *WebPageStructureAnalyzerTool) extractTables(doc *goquery.Document) []TableData {
	var tables []TableData
	doc.Find("table").Each(func(tableIndex int, tableSelection *goquery.Selection) {
		if role, _ := tableSelection.Attr("role"); role == "presentation" || role == "none" {
			return
		}
		if class, _ := tableSelection.Attr("class"); strings.Contains(class, "layout") || strings.Contains(class, "grid") {
			if tableSelection.Find("td,th").Length() < 3 {
				return
			}
		}
		if tableSelection.ParentsFiltered("table").Length() > 0 {
			return
		}
		if tableSelection.Find("tr").Length() < 1 || tableSelection.Find("td, th").Length() < 2 {
			return
		}

		var currentTable TableData
		currentTable.ID, _ = tableSelection.Attr("id")
		currentTable.Caption = psa.cleanText(tableSelection.Find("caption").First().Text())

		headerSourceNode := (*goquery.Selection)(nil)

		thead := tableSelection.Find("thead").First()
		if thead.Length() > 0 {
			headerRowInThead := thead.Find("tr").Last()
			if headerRowInThead.Length() == 0 {
				headerRowInThead = thead.Find("tr").First()
			}

			if headerRowInThead.Length() > 0 {
				headerRowInThead.Find("th, td").Each(func(_ int, cell *goquery.Selection) {
					currentTable.Headers = append(currentTable.Headers, psa.cleanText(cell.Text()))
				})
				headerSourceNode = headerRowInThead
			}
		}

		if len(currentTable.Headers) == 0 {
			firstTableTr := tableSelection.Find("tr").First()
			if firstTableTr.Length() > 0 && firstTableTr.Find("th").Length() > 0 {
				firstTableTr.Find("th, td").Each(func(_ int, cell *goquery.Selection) {
					currentTable.Headers = append(currentTable.Headers, psa.cleanText(cell.Text()))
				})
				headerSourceNode = firstTableTr
			}
		}

		if len(currentTable.Headers) == 0 {
			firstTableTr := tableSelection.Find("tr").First()
			if firstTableTr.Length() > 0 && firstTableTr.Find("td").Length() > 1 {
				isLikelyHeader := true
				cellTexts := []string{}
				firstTableTr.Find("td").Each(func(_ int, cell *goquery.Selection) {
					txt := psa.cleanText(cell.Text())
					if len(txt) > 50 || strings.Count(txt, " ") > 7 {
						isLikelyHeader = false
					}
					cellTexts = append(cellTexts, txt)
				})
				if isLikelyHeader {
					currentTable.Headers = cellTexts
					headerSourceNode = firstTableTr
				}
			}
		}

		tableSelection.Find("tr").Each(func(rowIndex int, tr *goquery.Selection) {
			if tr.ParentsFiltered("thead").Length() > 0 {
				return
			}
			if headerSourceNode != nil && tr.Length() > 0 && headerSourceNode.Length() > 0 && tr.Get(0) == headerSourceNode.Get(0) {
				return
			}

			var rowData []string
			tr.Find("td, th").Each(func(cellIndex int, cell *goquery.Selection) {
				rowData = append(rowData, psa.cleanText(cell.Text()))
			})

			if len(rowData) > 0 {
				currentTable.Rows = append(currentTable.Rows, rowData)
			}
		})

		if len(currentTable.Headers) > 0 || len(currentTable.Rows) > 0 {
			var previewBuilder strings.Builder
			cellCount := 0
			if currentTable.Caption != "" {
				previewBuilder.WriteString("Caption: " + currentTable.Caption + "\n")
			}
			if len(currentTable.Headers) > 0 {
				previewBuilder.WriteString("Headers: " + strings.Join(currentTable.Headers, " | ") + "\n")
			}
			for rIdx, row := range currentTable.Rows {
				if rIdx < 5 {
					previewBuilder.WriteString(strings.Join(row, " | ") + "\n")
					cellCount += len(row)
					if cellCount >= psaMaxTableCellsForPreview {
						if rIdx < len(currentTable.Rows)-1 {
							previewBuilder.WriteString("...\n")
						}
						break
					}
				} else {
					previewBuilder.WriteString("...\n")
					break
				}
			}
			currentTable.Preview = strings.TrimSpace(previewBuilder.String())
			tables = append(tables, currentTable)
		}
	})
	return tables
}

func (psa *WebPageStructureAnalyzerTool) extractLists(doc *goquery.Document) []ListData {
	var lists []ListData
	doc.Find("ul, ol").Each(func(i int, s *goquery.Selection) {
		if s.ParentsFiltered("nav, footer, table, aside, .pagination, .menu, .tabs").Length() > 0 {
			if s.ChildrenFiltered("li").Length() < 3 && s.ParentsFiltered("nav, footer, .menu").Length() > 0 {
				return
			}
		}
		if s.HasClass("pagination") || s.ParentsFiltered(".pagination").Length() > 0 {
			return
		}
		if s.Find("li").Length() == 0 {
			return
		}

		var list ListData
		list.ID, _ = s.Attr("id")
		list.Type = "unordered"
		if goquery.NodeName(s) == "ol" {
			list.Type = "ordered"
		}

		s.ChildrenFiltered("li").Each(func(liIndex int, item *goquery.Selection) {
			itemClone := item.Clone()
			itemClone.Find("ul, ol").Remove()

			cleanedItemText := psa.cleanText(itemClone.Text())
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
	seenLinks := make(map[string]bool)
	baseUrl, _ := url.Parse(pageURL)

	linkSelectors := []string{
		"nav a[href]", "header a[href]",
		"footer nav a[href]", "footer .footer-links a[href]", "footer .site-map a[href]",
		".breadcrumbs a[href]", ".breadcrumb a[href]",
		"a[rel='home'][href]", "a[rel='canonical'][href]",
		"main nav a[href]",
	}

	doc.Find(strings.Join(linkSelectors, ", ")).Each(func(i int, s *goquery.Selection) {
		if len(keyLinks) >= psaMaxKeyLinks {
			return
		}

		text := psa.cleanText(s.Text())
		href, _ := s.Attr("href")
		rel, _ := s.Attr("rel")

		if href == "" || href == "#" || strings.HasPrefix(strings.ToLower(href), "javascript:") || strings.HasPrefix(strings.ToLower(href), "mailto:") {
			return
		}
		if text == "" {
			if img := s.Find("img[alt]"); img.Length() > 0 {
				text = psa.cleanText(img.AttrOr("alt", ""))
			}
			if text == "" {
				text = psa.cleanText(s.AttrOr("title", ""))
			}
			if text == "" {
				return
			}
		}

		absHref := psa.resolveLink(baseUrl, href)
		if absHref == "" {
			return
		}

		if !seenLinks[absHref] {
			keyLinks = append(keyLinks, LinkData{Text: text, Href: absHref, Rel: rel})
			seenLinks[absHref] = true
		}
	})
	return keyLinks
}

func (psa *WebPageStructureAnalyzerTool) resolveLink(base *url.URL, href string) string {
	href = strings.TrimSpace(href)
	if href == "" {
		return ""
	}

	if base == nil {
		parsedHref, err := url.Parse(href)
		if err == nil && parsedHref.IsAbs() {
			return parsedHref.String()
		}
		if strings.HasPrefix(href, "//") {
			schemelessURL, errParse := url.Parse("https:" + href)
			if errParse == nil && schemelessURL.IsAbs() {
				return schemelessURL.String()
			}
		}
		return href
	}

	absURL, err := base.Parse(href)
	if err != nil {
		return ""
	}
	return absURL.String()
}

func isTextNode(s *goquery.Selection) bool {
	if s == nil || s.Length() == 0 {
		return false
	}
	node := s.Get(0)
	return node != nil && node.Type == html.TextNode
}

func (psa *WebPageStructureAnalyzerTool) cleanText(s string) string {
	s = strings.ReplaceAll(s, "\u00a0", " ")
	s = strings.ReplaceAll(s, "\t", " ")
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")

	var b strings.Builder
	b.Grow(len(s))

	lastCharWasSpaceOrNewline := true
	consecutiveNewlines := 0

	for _, r := range s {
		if unicode.IsSpace(r) {
			if r == '\n' {
				if consecutiveNewlines < 2 {
					b.WriteRune('\n')
					consecutiveNewlines++
				}
				lastCharWasSpaceOrNewline = true
			} else {
				if !lastCharWasSpaceOrNewline {
					b.WriteRune(' ')
				}
				lastCharWasSpaceOrNewline = true
			}
		} else if unicode.IsPrint(r) {
			b.WriteRune(r)
			lastCharWasSpaceOrNewline = false
			consecutiveNewlines = 0
		}
	}

	return strings.Trim(b.String(), " \n\t\r")
}

func (psa *WebPageStructureAnalyzerTool) formatResult(result *PageStructureResult, start time.Time) (string, error) {
	result.ProcessingTimeMs = time.Since(start).Milliseconds()
	if result.ExecutionError != "" {
		errMsgForLog := result.ExecutionError
		if len(errMsgForLog) > 1024 {
			errMsgForLog = errMsgForLog[:1024] + "..."
		}
		fmt.Printf("ERROR: PageStructureAnalyzerTool for URL '%s' failed: %s (Took %dms)\n", result.URL, errMsgForLog, result.ProcessingTimeMs)
	} else {
		fmt.Printf("PERF: PageStructureAnalyzerTool for URL '%s' took %dms. Title: '%s'. ContentBlocks: %d, Tables: %d, Lists: %d, Links: %d\n",
			result.URL, result.ProcessingTimeMs, result.Title, len(result.MainContentTextBlocks), len(result.ExtractedTables), len(result.ExtractedLists), len(result.KeyLinks))
	}

	jsonData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		jsonDataSimple, errSimple := json.Marshal(result)
		if errSimple != nil {
			finalErr := fmt.Errorf("critical: failed to marshal page structure results (indented: %v, simple: %v). Original exec error: %s", err, errSimple, result.ExecutionError)
			errorJson := fmt.Sprintf(`{"url": "%s", "execution_error": "critical: failed to marshal results. Check logs. Original error: %s", "processing_time_ms": %d}`,
				result.URL, psa.cleanText(result.ExecutionError), result.ProcessingTimeMs)
			return errorJson, finalErr
		}
		fmt.Printf("WARN: PageStructureAnalyzerTool for URL '%s' could not be pretty-printed, returning compact JSON. MarshalIndent error: %v\n", result.URL, err)
		if result.ExecutionError != "" {
			return string(jsonDataSimple), fmt.Errorf("page structure analysis failed: %s (and failed to indent JSON: %v)", result.ExecutionError, err)
		}
		return string(jsonDataSimple), nil
	}

	if result.ExecutionError != "" {
		return string(jsonData), fmt.Errorf("page structure analysis failed: %s", result.ExecutionError)
	}
	return string(jsonData), nil
}

func getBoolArg(args map[string]any, key string, defaultValue bool) bool {
	val, ok := args[key]
	if !ok {
		return defaultValue
	}
	boolVal, ok := val.(bool)
	if !ok {
		if strVal, okStr := val.(string); okStr {
			lowerStrVal := strings.ToLower(strVal)
			if lowerStrVal == "true" {
				return true
			}
			if lowerStrVal == "false" {
				return false
			}
		}
		return defaultValue
	}
	return boolVal
}
