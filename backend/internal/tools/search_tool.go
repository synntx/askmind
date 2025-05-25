package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/google/generative-ai-go/genai"
)

const (
	defaultNumResultsToScrape = 3
	maxNumResultsToScrape     = 7
	ddgSearchURLLimit         = 1 * 1024 * 1024
	pageScrapeBodyLimit       = 2 * 1024 * 1024

	// Timeouts
	httpClientTimeout       = 8 * time.Second
	pageScrapeClientTimeout = 6 * time.Second
	scraperContextTimeout   = 15 * time.Second
	dialTimeout             = 3 * time.Second
	responseHeaderTimeout   = 5 * time.Second
	idleConnTimeout         = 60 * time.Second
	expectContinueTimeout   = 1 * time.Second
	tlsHandshakeTimeout     = 5 * time.Second
)

type WebSearchTool struct {
	httpClient *http.Client
}

type webPageContent struct {
	URL     string `json:"url"`
	Title   string `json:"title,omitempty"`
	Content string `json:"content,omitempty"`
	Error   string `json:"error,omitempty"`
}

func NewWebSearchTool() *WebSearchTool {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   dialTimeout,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   20,
		IdleConnTimeout:       idleConnTimeout,
		TLSHandshakeTimeout:   tlsHandshakeTimeout,
		ExpectContinueTimeout: expectContinueTimeout,
		ResponseHeaderTimeout: responseHeaderTimeout,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   httpClientTimeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}
	return &WebSearchTool{httpClient: client}
}

func (ws *WebSearchTool) Name() string {
	return "web_search_extract"
}

func (ws *WebSearchTool) Description() string {
	return "Searches DuckDuckGo for a query, extracts text content from top results. Use for finding and summarizing information from multiple web pages."
}

func (ws *WebSearchTool) Parameters() []Parameter {
	return []Parameter{
		{Name: "query", Description: "The search query.", Type: genai.TypeString, Required: true},
		{Name: "num_results_to_scrape", Description: fmt.Sprintf("Number of top search results to scrape (default %d, max %d).", defaultNumResultsToScrape, maxNumResultsToScrape), Type: genai.TypeNumber, Optional: true},
	}
}

func (ws *WebSearchTool) Execute(ctx context.Context, args map[string]any) (string, error) {
	startTotal := time.Now()
	query, ok := args["query"].(string)
	if !ok || strings.TrimSpace(query) == "" {
		return "", fmt.Errorf("missing or invalid 'query' argument")
	}

	numToScrape := defaultNumResultsToScrape
	if n, ok := args["num_results_to_scrape"].(float64); ok && n > 0 {
		numToScrape = int(n)
		numToScrape = min(numToScrape, maxNumResultsToScrape)
	}

	searchURL := fmt.Sprintf("https://html.duckduckgo.com/html/?q=%s", url.QueryEscape(query))

	startDuckDuckGoReq := time.Now()
	req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create DDG request: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36") // Slightly updated UA
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")

	res, err := ws.httpClient.Do(req)
	duckDuckGoReqDuration := time.Since(startDuckDuckGoReq)
	fmt.Printf("PERF: DuckDuckGo search request for '%s' took %s\n", query, duckDuckGoReqDuration)

	if err != nil {
		return "", fmt.Errorf("duckduckgo search request failed: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return "", fmt.Errorf("duckduckgo search returned status: %d, body snippet: %s", res.StatusCode, string(bodyBytes))
	}

	startParseSearch := time.Now()
	limitedBody := io.LimitReader(res.Body, ddgSearchURLLimit)
	doc, err := goquery.NewDocumentFromReader(limitedBody)
	parseSearchDuration := time.Since(startParseSearch)
	fmt.Printf("PERF: Parsing DuckDuckGo search results for '%s' took %s\n", query, parseSearchDuration)

	if err != nil {
		return "", fmt.Errorf("parsing search results failed: %w", err)
	}

	var linksToScrape []string
	startExtractLinks := time.Now()
	doc.Find("div.web-result").EachWithBreak(func(i int, s *goquery.Selection) bool {
		linkTag := s.Find("a.result__a")
		href, exists := linkTag.Attr("href")
		if !exists || href == "" {
			return true
		}
		parsedHref, err := url.Parse(href)
		if err != nil {
			return true
		}
		actualURL := parsedHref.Query().Get("uddg")
		if actualURL == "" && strings.HasPrefix(href, "http") {
			actualURL = href
		}
		if actualURL != "" && strings.HasPrefix(actualURL, "http") && !strings.Contains(actualURL, ".pdf") && !strings.Contains(actualURL, ".xml") {
			if !slices.Contains(linksToScrape, actualURL) {
				linksToScrape = append(linksToScrape, actualURL)
			}
		}
		return len(linksToScrape) < numToScrape
	})
	extractLinksDuration := time.Since(startExtractLinks)
	fmt.Printf("PERF: Extracting %d links from search results for '%s' took %s\n", len(linksToScrape), query, extractLinksDuration)

	if len(linksToScrape) == 0 {
		return "No suitable links found in search results from DuckDuckGo.", nil
	}

	var wg sync.WaitGroup
	scrapedDataChan := make(chan webPageContent, len(linksToScrape))
	scraperCtx, cancelScrapers := context.WithTimeout(ctx, scraperContextTimeout)
	defer cancelScrapers()

	startScrapingPhase := time.Now()
	for _, link := range linksToScrape {
		wg.Add(1)
		go func(u string) {
			defer wg.Done()
			pageCtx, pageCancel := context.WithTimeout(scraperCtx, pageScrapeClientTimeout)
			defer pageCancel()

			content, title, err := ws.scrapePage(pageCtx, u)
			pageResult := webPageContent{URL: u, Title: title}
			if err != nil {
				pageResult.Error = err.Error()
			} else {
				pageResult.Content = content
			}
			select {
			case scrapedDataChan <- pageResult:
			case <-scraperCtx.Done():
				fmt.Printf("WARN: Scraper context done, discarding result for %s\n", u)
				return
			}
		}(link)
	}

	go func() {
		wg.Wait()
		close(scrapedDataChan)
	}()

	var allScrapedData []webPageContent
	for data := range scrapedDataChan {
		allScrapedData = append(allScrapedData, data)
	}
	scrapingPhaseDuration := time.Since(startScrapingPhase)
	fmt.Printf("PERF: Concurrent scraping phase for %d links for '%s' took %s\n", len(linksToScrape), query, scrapingPhaseDuration)

	if len(allScrapedData) == 0 {
		if scraperCtx.Err() == context.DeadlineExceeded {
			return "Failed to scrape content from search result links within the time limit.", nil
		}
		return "Failed to scrape any content from search result links.", nil
	}

	startMarshal := time.Now()
	jsonData, err := json.Marshal(allScrapedData)
	marshalDuration := time.Since(startMarshal)
	fmt.Printf("PERF: Marshaling %d scraped results for '%s' took %s\n", len(allScrapedData), query, marshalDuration)

	if err != nil {
		return "", fmt.Errorf("failed to marshal scraped data: %w", err)
	}

	totalDuration := time.Since(startTotal)
	fmt.Printf("PERF: Total WebSearchTool.Execute for '%s' took %s\n", query, totalDuration)

	return string(jsonData), nil
}

func (ws *WebSearchTool) scrapePage(ctx context.Context, pageURL string) (string, string, error) {
	startScrapePage := time.Now()

	startHTTPReq := time.Now()
	req, err := http.NewRequestWithContext(ctx, "GET", pageURL, nil)
	if err != nil {
		return "", "", fmt.Errorf("failed to create page request for %s: %w", pageURL, err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")

	res, err := ws.httpClient.Do(req)
	httpReqDuration := time.Since(startHTTPReq)

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			fmt.Printf("PERF: HTTP request to %s timed out after %s\n", pageURL, httpReqDuration)
			return "", "", fmt.Errorf("request to %s timed out: %w", pageURL, err)
		}
		fmt.Printf("PERF: HTTP request to %s failed after %s (Error: %v)\n", pageURL, httpReqDuration, err)
		return "", "", fmt.Errorf("request to %s failed: %w", pageURL, err)
	}
	defer res.Body.Close()
	fmt.Printf("PERF: HTTP request to %s took %s (Status: %d)\n", pageURL, httpReqDuration, res.StatusCode)

	if res.StatusCode != http.StatusOK {
		scrapePageDuration := time.Since(startScrapePage)
		fmt.Printf("PERF: scrapePage for %s failed after %s (Status: %d)\n", pageURL, scrapePageDuration, res.StatusCode)
		return "", "", fmt.Errorf("status %d from %s", res.StatusCode, pageURL)
	}

	contentType := res.Header.Get("Content-Type")
	if !strings.Contains(strings.ToLower(contentType), "text/html") {
		scrapePageDuration := time.Since(startScrapePage)
		fmt.Printf("PERF: scrapePage for %s failed after %s (Non-HTML Content: %s)\n", pageURL, scrapePageDuration, contentType)
		return "", "", fmt.Errorf("non-HTML content type: %s from %s", contentType, pageURL)
	}

	startHTMLParse := time.Now()
	limitedBody := io.LimitReader(res.Body, pageScrapeBodyLimit)
	doc, err := goquery.NewDocumentFromReader(limitedBody)
	htmlParseDuration := time.Since(startHTMLParse)
	fmt.Printf("PERF: HTML parsing for %s took %s\n", pageURL, htmlParseDuration)

	if err != nil {
		scrapePageDuration := time.Since(startScrapePage)
		fmt.Printf("PERF: scrapePage for %s failed after %s (HTML Parsing Error)\n", pageURL, scrapePageDuration)
		return "", "", fmt.Errorf("parsing %s failed: %w", pageURL, err)
	}

	title := strings.TrimSpace(doc.Find("title").First().Text())

	var contentBuilder strings.Builder
	var foundContentBlocks int

	selectors := []string{
		"article", "main", "div[role='main']", "section[role='main']",
		".article-content", ".entry-content", ".post-body", ".blog-post-content", ".main-content",
		".td-post-content", ".content", ".story-content", "div[class*='content']", "div[id*='content']",
	}
	removalSelectors := "script, style, nav, header, footer, aside, form, .sidebar, .related-posts, .comments, .noprint, .share, .social, noscript, iframe, [aria-hidden='true'], .ad, [class*='ad-'], [id*='ad-']"

	startContentExtraction := time.Now()
	foundContentWithPrimarySelector := false
	for _, selector := range selectors {
		doc.Find(selector).Each(func(_ int, s *goquery.Selection) {
			s.Find(removalSelectors).Remove()
			text := strings.TrimSpace(s.Text())
			text = strings.Join(strings.Fields(text), " ")
			if len(text) > 100 {
				contentBuilder.WriteString(text)
				contentBuilder.WriteString("\n\n")
				foundContentBlocks++
				foundContentWithPrimarySelector = true
			}
		})
		if foundContentWithPrimarySelector && foundContentBlocks > 0 {
		}
	}

	if !foundContentWithPrimarySelector && foundContentBlocks < 2 {
		doc.Find("p").Each(func(_ int, s *goquery.Selection) {
			parentIsNonContent := false
			s.ParentsUntil("body").Each(func(_ int, parentSel *goquery.Selection) {
				if slices.ContainsFunc([]string{"nav", "header", "footer", "aside", "form", ".sidebar", ".noprint", ".share", ".social", "figure", "figcaption", "details", "summary"}, func(s string) bool {
					return parentSel.Is(s)
				}) {
					parentIsNonContent = true
					return
				}
			})
			if parentIsNonContent {
				return // continue to next <p>
			}

			s.Find("script, style, noscript, iframe, [aria-hidden='true']").Remove()
			text := strings.TrimSpace(s.Text())
			text = strings.Join(strings.Fields(text), " ")
			if len(text) > 70 {
				contentBuilder.WriteString(text)
				contentBuilder.WriteString("\n\n")
				foundContentBlocks++
			}
		})
	}
	contentExtractionDuration := time.Since(startContentExtraction)
	fmt.Printf("PERF: Content extraction for %s took %s (%d blocks found)\n", pageURL, contentExtractionDuration, foundContentBlocks)

	pageText := strings.TrimSpace(contentBuilder.String())
	if len(pageText) > 20000 {
		pageText = pageText[:20000] + "..."
	}

	scrapePageDuration := time.Since(startScrapePage)
	fmt.Printf("PERF: Total scrapePage for %s took %s\n", pageURL, scrapePageDuration)

	if pageText == "" {
		if title != "" {
			return "", title, fmt.Errorf("no significant body content extracted, only title found")
		}
		return "", "", fmt.Errorf("no significant content or title extracted")
	}
	return pageText, title, nil
}
