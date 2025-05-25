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
	"sync"
	"time"
	"unicode/utf8"

	"github.com/PuerkitoBio/goquery"
	"github.com/google/generative-ai-go/genai"
)

const (
	crtDefaultNumWebResults         = 3
	crtMaxNumWebResults             = 5
	crtDefaultNumVideos             = 3
	crtMaxNumVideos                 = 5
	crtDefaultMaxImagesPerPage      = 3
	crtMaxImagesPerPage             = 10
	crtContentSnippetMaxLengthRunes = 500

	crtPageFetchTimeout             = 8 * time.Second
	crtMaxHTMLBodySizeImageExtract  = 2 * 1024 * 1024
	crtImageExtractionClientTimeout = 10 * time.Second
)

type ResearchResult struct {
	Query            string             `json:"query"`
	WebPages         []ProcessedWebPage `json:"web_pages,omitempty"`
	Videos           []YouTubeVideoInfo `json:"videos,omitempty"`
	ExecutionErrors  []string           `json:"execution_errors,omitempty"`
	ProcessingTimeMs int64              `json:"processing_time_ms"`
}

type ProcessedWebPage struct {
	URL             string     `json:"url"`
	Title           string     `json:"title,omitempty"`
	ContentSnippet  string     `json:"content_snippet,omitempty"`
	ExtractedImages []WebImage `json:"extracted_images,omitempty"`
	Error           string     `json:"error,omitempty"`
}

type WebImage struct {
	URL     string `json:"url"`
	AltText string `json:"alt_text,omitempty"`
}

type ResearchTool struct {
	webSearchTool         *WebSearchTool
	youtubeSearchTool     *YouTubeSearchTool
	imageExtractionClient *http.Client
}

func NewResearchTool(webSearchTool *WebSearchTool, youtubeSearchTool *YouTubeSearchTool) (*ResearchTool, error) {
	if webSearchTool == nil {
		return nil, fmt.Errorf("WebSearchTool dependency cannot be nil")
	}

	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   dialTimeout,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          50,
		MaxIdleConnsPerHost:   10,
		IdleConnTimeout:       idleConnTimeout,
		TLSHandshakeTimeout:   tlsHandshakeTimeout,
		ExpectContinueTimeout: expectContinueTimeout,
		ResponseHeaderTimeout: responseHeaderTimeout,
	}

	imageExtractionClient := &http.Client{
		Transport: transport,
		Timeout:   crtImageExtractionClientTimeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}

	return &ResearchTool{
		webSearchTool:         webSearchTool,
		youtubeSearchTool:     youtubeSearchTool,
		imageExtractionClient: imageExtractionClient,
	}, nil
}

func (crt *ResearchTool) Name() string {
	return "researcher"
}

func (crt *ResearchTool) Description() string {
	return "Performs in-depth research on a query by searching the web for articles, extracting key images from those articles, and finding relevant YouTube videos. Returns a consolidated report."
}

func (crt *ResearchTool) Parameters() []Parameter {
	return []Parameter{
		{Name: "query", Description: "The research query.", Type: genai.TypeString, Required: true},
		{Name: "num_web_results", Description: fmt.Sprintf("Number of web pages to process for content and images (default %d, max %d).", crtDefaultNumWebResults, crtMaxNumWebResults), Type: genai.TypeNumber, Optional: true},
		{Name: "num_videos", Description: fmt.Sprintf("Number of YouTube videos to find (default %d, max %d). Set to 0 to disable video search.", crtDefaultNumVideos, crtMaxNumVideos), Type: genai.TypeNumber, Optional: true},
		{Name: "max_images_per_page", Description: fmt.Sprintf("Maximum number of images to extract from each web page (default %d, max %d). Set to 0 to disable image extraction.", crtDefaultMaxImagesPerPage, crtMaxImagesPerPage), Type: genai.TypeNumber, Optional: true},
	}
}

// --- Execute Method ---

func (crt *ResearchTool) Execute(ctx context.Context, args map[string]any) (string, error) {
	startTime := time.Now()
	query, ok := args["query"].(string)
	if !ok || strings.TrimSpace(query) == "" {
		return "", fmt.Errorf("missing or invalid 'query' argument")
	}

	numWebResults := getIntArg(args, "num_web_results", crtDefaultNumWebResults)
	numWebResults = min(max(numWebResults, 0), crtMaxNumWebResults)

	numVideos := getIntArg(args, "num_videos", crtDefaultNumVideos)
	numVideos = min(max(numVideos, 0), crtMaxNumVideos)

	maxImagesPerPage := getIntArg(args, "max_images_per_page", crtDefaultMaxImagesPerPage)
	maxImagesPerPage = min(max(maxImagesPerPage, 0), crtMaxImagesPerPage)

	fmt.Printf("INFO: ResearchTool starting for query: '%s', web_results: %d, videos: %d, images_per_page: %d\n",
		query, numWebResults, numVideos, maxImagesPerPage)

	finalResult := ResearchResult{
		Query: query,
	}
	var collectedErrors []string
	var errLock sync.Mutex

	var wg sync.WaitGroup

	// Channel for raw web search results from WebSearchTool
	rawWebPagesChan := make(chan []webPageContent, 1)
	// Channel for video results from YouTubeSearchTool
	youtubeVideosChan := make(chan []YouTubeVideoInfo, 1)

	// 1. Execute Web Search
	if numWebResults > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			fmt.Printf("INFO: CRT - Initiating web search for: '%s'\n", query)
			webSearchArgs := map[string]any{
				"query":                 query,
				"num_results_to_scrape": float64(numWebResults),
			}
			webResultStr, err := crt.webSearchTool.Execute(ctx, webSearchArgs)
			if err != nil {
				errMsg := fmt.Sprintf("Web search failed: %v", err)
				fmt.Printf("ERROR: CRT - %s\n", errMsg)
				errLock.Lock()
				collectedErrors = append(collectedErrors, errMsg)
				errLock.Unlock()
				rawWebPagesChan <- nil
				return
			}

			if webResultStr == "No suitable links found in search results from DuckDuckGo." || webResultStr == "Failed to scrape any content from search result links." {
				fmt.Printf("INFO: CRT - Web search yielded no processable results for '%s': %s\n", query, webResultStr)
				rawWebPagesChan <- []webPageContent{}
				return
			}

			var pages []webPageContent
			if err := json.Unmarshal([]byte(webResultStr), &pages); err != nil {
				errMsg := fmt.Sprintf("Failed to unmarshal web search results: %v. Raw: %s", err, webResultStr)
				fmt.Printf("ERROR: CRT - %s\n", errMsg)
				errLock.Lock()
				collectedErrors = append(collectedErrors, errMsg)
				errLock.Unlock()
				rawWebPagesChan <- nil
				return
			}
			fmt.Printf("INFO: CRT - Web search successful, found %d raw pages for: '%s'\n", len(pages), query)
			rawWebPagesChan <- pages
		}()
	} else {
		close(rawWebPagesChan)
	}

	if crt.youtubeSearchTool != nil && numVideos > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			fmt.Printf("INFO: CRT - Initiating YouTube search for: '%s'\n", query)
			ytSearchArgs := map[string]any{
				"query":       query,
				"max_results": float64(numVideos),
			}
			ytResultStr, err := crt.youtubeSearchTool.Execute(ctx, ytSearchArgs)
			if err != nil {
				errMsg := fmt.Sprintf("YouTube search failed: %v", err)
				fmt.Printf("ERROR: CRT - %s\n", errMsg)
				errLock.Lock()
				collectedErrors = append(collectedErrors, errMsg)
				errLock.Unlock()
				youtubeVideosChan <- nil
				return
			}

			if ytResultStr == "No videos found for the given query." || ytResultStr == "No valid video IDs found in search results." {
				fmt.Printf("INFO: CRT - YouTube search yielded no results for '%s': %s\n", query, ytResultStr)
				youtubeVideosChan <- []YouTubeVideoInfo{}
				return
			}

			var videos []YouTubeVideoInfo
			if err := json.Unmarshal([]byte(ytResultStr), &videos); err != nil {
				errMsg := fmt.Sprintf("Failed to unmarshal YouTube search results: %v. Raw: %s", err, ytResultStr)
				fmt.Printf("ERROR: CRT - %s\n", errMsg)
				errLock.Lock()
				collectedErrors = append(collectedErrors, errMsg)
				errLock.Unlock()
				youtubeVideosChan <- nil
				return
			}
			fmt.Printf("INFO: CRT - YouTube search successful, found %d videos for: '%s'\n", len(videos), query)
			youtubeVideosChan <- videos
		}()
	} else {
		if crt.youtubeSearchTool == nil {
			fmt.Printf("INFO: CRT - YouTubeSearchTool not configured, skipping video search.\n")
		}
		close(youtubeVideosChan)
	}

	wg.Wait()

	var rawWebPagesResult []webPageContent
	if numWebResults > 0 {
		rawWebPagesResult = <-rawWebPagesChan
		close(rawWebPagesChan)
	}

	if crt.youtubeSearchTool != nil && numVideos > 0 {
		finalResult.Videos = <-youtubeVideosChan
		close(youtubeVideosChan)
	}

	if rawWebPagesResult != nil && len(rawWebPagesResult) > 0 && maxImagesPerPage > 0 {
		fmt.Printf("INFO: CRT - Starting image extraction for %d web pages for query: '%s'\n", len(rawWebPagesResult), query)
		processedPagesChan := make(chan ProcessedWebPage, len(rawWebPagesResult))
		var imgWg sync.WaitGroup

		for _, rawPage := range rawWebPagesResult {
			if ctx.Err() != nil {
				fmt.Printf("WARN: CRT - Context cancelled before processing page %s for images.\n", rawPage.URL)
				break
			}
			imgWg.Add(1)
			go func(pageToProcess webPageContent) {
				defer imgWg.Done()

				select {
				case <-ctx.Done():
					fmt.Printf("WARN: CRT - Context cancelled during image extraction for %s.\n", pageToProcess.URL)
					processedPagesChan <- ProcessedWebPage{
						URL:   pageToProcess.URL,
						Title: pageToProcess.Title,
						Error: "Image extraction cancelled due to context",
					}
					return
				default:
				}

				processedPage := ProcessedWebPage{
					URL:   pageToProcess.URL,
					Title: pageToProcess.Title,
				}

				if pageToProcess.Content != "" {
					if utf8.RuneCountInString(pageToProcess.Content) > crtContentSnippetMaxLengthRunes {
						snippetRunes := []rune(pageToProcess.Content)[:crtContentSnippetMaxLengthRunes]
						processedPage.ContentSnippet = string(snippetRunes) + "..."
					} else {
						processedPage.ContentSnippet = pageToProcess.Content
					}
				} else {
					processedPage.ContentSnippet = "(No text content extracted by web search)"
				}

				if pageToProcess.Error != "" {
					processedPage.Error = fmt.Sprintf("Source page error from WebSearchTool: %s", pageToProcess.Error)
				} else if pageToProcess.URL != "" {
					fmt.Printf("INFO: CRT - Extracting images from: %s\n", pageToProcess.URL)
					images, err := crt.extractImagesFromURL(ctx, pageToProcess.URL, maxImagesPerPage)
					if err != nil {
						errMsg := fmt.Sprintf("Image extraction failed for %s: %v", pageToProcess.URL, err)
						fmt.Printf("WARN: CRT - %s\n", errMsg)
						processedPage.Error = errMsg
					}
					processedPage.ExtractedImages = images
					fmt.Printf("INFO: CRT - Extracted %d images from: %s\n", len(images), pageToProcess.URL)
				}
				processedPagesChan <- processedPage
			}(rawPage)
		}

		go func() {
			imgWg.Wait()
			close(processedPagesChan)
		}()

		for pwp := range processedPagesChan {
			finalResult.WebPages = append(finalResult.WebPages, pwp)
		}
		fmt.Printf("INFO: CRT - Finished image extraction phase for query: '%s'\n", query)
	} else if rawWebPagesResult != nil {
		for _, rawPage := range rawWebPagesResult {
			pwp := ProcessedWebPage{
				URL:   rawPage.URL,
				Title: rawPage.Title,
				Error: rawPage.Error,
			}
			if rawPage.Content != "" {
				if utf8.RuneCountInString(rawPage.Content) > crtContentSnippetMaxLengthRunes {
					snippetRunes := []rune(rawPage.Content)[:crtContentSnippetMaxLengthRunes]
					pwp.ContentSnippet = string(snippetRunes) + "..."
				} else {
					pwp.ContentSnippet = rawPage.Content
				}
			} else {
				pwp.ContentSnippet = "(No text content extracted by web search)"
			}
			finalResult.WebPages = append(finalResult.WebPages, pwp)
		}
	}

	finalResult.ExecutionErrors = collectedErrors
	finalResult.ProcessingTimeMs = time.Since(startTime).Milliseconds()

	fmt.Printf("PERF: Total ResearchTool.Execute for '%s' took %dms. Web Pages: %d, Videos: %d, Errors: %d\n",
		query, finalResult.ProcessingTimeMs, len(finalResult.WebPages), len(finalResult.Videos), len(finalResult.ExecutionErrors))

	jsonData, err := json.MarshalIndent(finalResult, "", "  ")
	if err != nil {
		jsonDataSimple, simpleErr := json.Marshal(finalResult)
		if simpleErr != nil {
			return "", fmt.Errorf("failed to marshal comprehensive research results (indent and simple): %v / %v. Original query: %s", err, simpleErr, query)
		}
		if len(finalResult.ExecutionErrors) > 0 {
			return string(jsonDataSimple), fmt.Errorf("comprehensive research completed with errors: %s. See JSON output for details", strings.Join(finalResult.ExecutionErrors, "; "))
		}
		return string(jsonDataSimple), nil
	}

	if len(finalResult.ExecutionErrors) > 0 {
		return string(jsonData), fmt.Errorf("comprehensive research completed with errors: %s. See JSON output for details", strings.Join(finalResult.ExecutionErrors, "; "))
	}

	return string(jsonData), nil
}

func (crt *ResearchTool) extractImagesFromURL(ctx context.Context, pageURL string, maxImages int) ([]WebImage, error) {
	if maxImages <= 0 {
		return nil, nil
	}

	fetchCtx, cancel := context.WithTimeout(ctx, crtPageFetchTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(fetchCtx, "GET", pageURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request for %s: %w", pageURL, err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	var res *http.Response
	var reqErr error

	for i := 0; i < 2; i++ {
		res, reqErr = crt.imageExtractionClient.Do(req)
		if reqErr != nil {
			if netErr, ok := reqErr.(net.Error); ok && netErr.Timeout() && i == 0 {
				fmt.Printf("WARN: CRT - Timeout fetching %s for images, retrying...\n", pageURL)
				fetchCtxRetry, cancelRetry := context.WithTimeout(ctx, crtPageFetchTimeout)
				defer cancelRetry()
				req = req.WithContext(fetchCtxRetry)
				time.Sleep(500 * time.Millisecond)
				continue
			}
			return nil, fmt.Errorf("http client Do error for %s: %w", pageURL, reqErr)
		}
		break
	}
	if reqErr != nil {
		return nil, fmt.Errorf("http client Do error after retries for %s: %w", pageURL, reqErr)
	}

	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("received status %d from %s", res.StatusCode, pageURL)
	}

	contentType := res.Header.Get("Content-Type")
	if !strings.Contains(strings.ToLower(contentType), "text/html") {
		return nil, fmt.Errorf("non-HTML content type '%s' from %s", contentType, pageURL)
	}

	doc, err := goquery.NewDocumentFromReader(io.LimitReader(res.Body, crtMaxHTMLBodySizeImageExtract))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML from %s: %w", pageURL, err)
	}

	var images []WebImage
	parsedBaseURL, err := url.Parse(pageURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse base URL %s: %w", pageURL, err)
	}

	mainContentSelectors := []string{
		"article", "main", "div[role='main']",
		".article-content", ".entry-content", ".post-body", ".main-content",
		"div[class*='content']", "div[id*='content']",
	}

	seenImageURLs := make(map[string]bool)

	findImagesInSelection := func(selection *goquery.Selection) {
		selection.Find("img").EachWithBreak(func(_ int, s *goquery.Selection) bool {
			if len(images) >= maxImages {
				return false
			}

			src, exists := s.Attr("src")
			if !exists || src == "" {
				if dataSrc, dsExists := s.Attr("data-src"); dsExists && dataSrc != "" {
					src = dataSrc
				} else if srcset, ssExists := s.Attr("srcset"); ssExists && srcset != "" {
					parts := strings.Split(srcset, ",")
					if len(parts) > 0 {
						src = strings.Fields(strings.TrimSpace(parts[0]))[0]
					} else {
						return true
					}
				} else {
					return true
				}
			}

			if strings.HasPrefix(strings.ToLower(src), "data:") {
				return true
			}
			if len(src) < 5 {
				return true
			}

			absoluteImgURL, err := resolveAndValidateURL(parsedBaseURL, src)
			if err != nil {
				// fmt.Printf("DEBUG: CRT - Skipping image src '%s' from %s due to resolve error: %v\n", src, pageURL, err)
				return true
			}

			urlString := absoluteImgURL.String()
			if seenImageURLs[urlString] {
				return true
			}

			if !hasImageExtension(absoluteImgURL.Path) && !hasImageExtensionFromQuery(absoluteImgURL.RawQuery) {
				// fmt.Printf("DEBUG: CRT - Skipping image src '%s' from %s due to non-image extension.\n", src, pageURL)
				return true
			}

			attr, _ := s.Attr("alt")
			altText := strings.TrimSpace(attr)
			images = append(images, WebImage{URL: urlString, AltText: altText})
			seenImageURLs[urlString] = true
			return true
		})
	}

	for _, selector := range mainContentSelectors {
		doc.Find(selector).EachWithBreak(func(_ int, s *goquery.Selection) bool {
			findImagesInSelection(s)
			return len(images) < maxImages
		})
		if len(images) >= maxImages {
			break
		}
	}

	if len(images) < maxImages {
		findImagesInSelection(doc.Selection)
	}

	return images, nil
}

func resolveAndValidateURL(base *url.URL, path string) (*url.URL, error) {
	trimmedPath := strings.TrimSpace(path)
	if trimmedPath == "" {
		return nil, fmt.Errorf("empty path")
	}

	// If path is already absolute (starts with http:// or https:// or //)
	if strings.HasPrefix(trimmedPath, "http://") || strings.HasPrefix(trimmedPath, "https://") {
		return url.Parse(trimmedPath)
	}
	if strings.HasPrefix(trimmedPath, "//") { // Protocol-relative URL
		return url.Parse(base.Scheme + ":" + trimmedPath)
	}

	resolvedURL, err := base.Parse(trimmedPath)
	if err != nil {
		return nil, fmt.Errorf("could not parse relative path '%s' against base '%s': %w", trimmedPath, base.String(), err)
	}

	if resolvedURL.Scheme != "http" && resolvedURL.Scheme != "https" {
		return nil, fmt.Errorf("unsupported scheme: '%s' for URL %s", resolvedURL.Scheme, resolvedURL.String())
	}
	return resolvedURL, nil
}

func hasImageExtension(path string) bool {
	lowerPath := strings.ToLower(path)
	// Common image extensions
	extensions := []string{".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".bmp", ".tiff"}
	for _, ext := range extensions {
		if strings.HasSuffix(lowerPath, ext) {
			return true
		}
	}
	// Check path part before query string
	if qIndex := strings.Index(lowerPath, "?"); qIndex != -1 {
		pathWithoutQuery := lowerPath[:qIndex]
		for _, ext := range extensions {
			if strings.HasSuffix(pathWithoutQuery, ext) {
				return true
			}
		}
	}
	return false
}

func hasImageExtensionFromQuery(rawQuery string) bool {
	if rawQuery == "" {
		return false
	}
	// Sometimes image type is in query like ?format=jpg
	query := strings.ToLower(rawQuery)
	imgParams := []string{"format=jpg", "format=jpeg", "format=png", "format=gif", "format=webp", "fm=jpg", "fm=png"}
	for _, param := range imgParams {
		if strings.Contains(query, param) {
			return true
		}
	}
	return false
}
