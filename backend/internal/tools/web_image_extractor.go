package tools

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/PuerkitoBio/goquery"
	"github.com/google/generative-ai-go/genai"
	"golang.org/x/image/webp"
)

const (
	wiePageFetchTimeout       = 12 * time.Second
	wieMaxHTMLBodySize        = 5 * 1024 * 1024
	wieHTTPClientTimeout      = 15 * time.Second
	wieImageMetadataTimeout   = 5 * time.Second
	wieMaxImageSizeBytes      = 10 * 1024 * 1024
	wieDefaultMaxImages       = 10
	wieMaxImagesToConsider    = 100
	wieDefaultMinImageWidth   = 100
	wieDefaultMinImageHeight  = 100
	wieMaxConcurrentMetaFetch = 5
)

var (
	imageExtensions = regexp.MustCompile(`(?i)\.(jpeg|jpg|png|gif|webp|svg|bmp|tiff)$`)
	dataURIPattern  = regexp.MustCompile(`^data:image\/[^;]+;base64,`)
)

type WebImageExtractorResult struct {
	PageURL          string          `json:"page_url"`
	PageTitle        string          `json:"page_title,omitempty"`
	FoundImages      []FoundWebImage `json:"found_images,omitempty"`
	ExecutionErrors  []string        `json:"execution_errors,omitempty"`
	ProcessingTimeMs int64           `json:"processing_time_ms"`
}

type FoundWebImage struct {
	ImageURL     string `json:"image_url"`
	AltText      string `json:"alt_text,omitempty"`
	ImageType    string `json:"image_type,omitempty"`
	Width        int    `json:"width,omitempty"`
	Height       int    `json:"height,omitempty"`
	SourceTag    string `json:"source_tag,omitempty"`
	FileSize     int64  `json:"file_size,omitempty"`
	IsFromSrcset bool   `json:"is_from_srcset,omitempty"`
}

type WebImageExtractorTool struct {
	httpClient *http.Client
	imgClient  *http.Client
}

func NewWebImageExtractorTool() *WebImageExtractorTool {

	pageTransport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   dialTimeout,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          50,
		IdleConnTimeout:       idleConnTimeout,
		TLSHandshakeTimeout:   tlsHandshakeTimeout,
		ResponseHeaderTimeout: responseHeaderTimeout,
	}
	imgTransport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   3 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          100,
		IdleConnTimeout:       idleConnTimeout,
		TLSHandshakeTimeout:   tlsHandshakeTimeout,
		ResponseHeaderTimeout: wieImageMetadataTimeout,
		MaxConnsPerHost:       wieMaxConcurrentMetaFetch + 2,
	}

	return &WebImageExtractorTool{
		httpClient: &http.Client{
			Transport: pageTransport,
			Timeout:   wieHTTPClientTimeout,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 5 {
					return http.ErrUseLastResponse
				}
				return nil
			},
		},
		imgClient: &http.Client{
			Transport: imgTransport,
			Timeout:   wieImageMetadataTimeout,
		},
	}
}

func (wie *WebImageExtractorTool) Name() string {
	return "web_image_extractor"
}

func (wie *WebImageExtractorTool) Description() string {
	return "Extracts images from a given web page URL. It parses HTML for <img>, <picture>, and og:image tags, resolves URLs, and attempts to fetch image dimensions and types. Filters results based on specified criteria. Does not extract CSS background images or execute JavaScript."
}

func (wie *WebImageExtractorTool) Parameters() []Parameter {
	return []Parameter{
		{Name: "url", Description: "The URL of the web page to extract images from.", Type: genai.TypeString, Required: true},
		{Name: "max_images_to_return", Description: fmt.Sprintf("Maximum number of images to return (default %d).", wieDefaultMaxImages), Type: genai.TypeNumber, Optional: true},
		{Name: "min_image_width", Description: fmt.Sprintf("Minimum width (pixels) for an image to be included (default %d).", wieDefaultMinImageWidth), Type: genai.TypeNumber, Optional: true},
		{Name: "min_image_height", Description: fmt.Sprintf("Minimum height (pixels) for an image to be included (default %d).", wieDefaultMinImageHeight), Type: genai.TypeNumber, Optional: true},
		{Name: "allowed_image_types", Description: `Comma-separated list of allowed image types (e.g., "jpeg,png,webp"). If empty, allows common types (jpeg, png, gif, webp). Valid types: jpeg, png, gif, webp, svg, bmp, tiff.`, Type: genai.TypeString, Optional: true},
		{Name: "prioritize_og_image", Description: "If true, the OpenGraph image (og:image) will be prioritized if found and valid (default true).", Type: genai.TypeBoolean, Optional: true},
		{Name: "fetch_image_metadata", Description: "If true (default), attempts to fetch actual dimensions and type for images by making a request to the image URL. This is more accurate but slower. If false, relies on HTML attributes and URL extensions.", Type: genai.TypeBoolean, Optional: true},
	}
}

func (wie *WebImageExtractorTool) Execute(ctx context.Context, args map[string]any) (string, error) {
	startTime := time.Now()
	result := WebImageExtractorResult{}

	pageURLArg, ok := args["url"].(string)
	if !ok || strings.TrimSpace(pageURLArg) == "" {
		return "", fmt.Errorf("missing or invalid 'url' argument")
	}
	parsedPageURL, err := url.ParseRequestURI(pageURLArg)
	if err != nil || (parsedPageURL.Scheme != "http" && parsedPageURL.Scheme != "https") {
		result.ExecutionErrors = append(result.ExecutionErrors, fmt.Sprintf("Invalid page URL format: '%s'. Must be http/https.", pageURLArg))
		return wie.formatResult(&result, startTime)
	}
	result.PageURL = parsedPageURL.String()

	maxImages := getIntArg(args, "max_images_to_return", wieDefaultMaxImages)
	minWidth := getIntArg(args, "min_image_width", wieDefaultMinImageWidth)
	minHeight := getIntArg(args, "min_image_height", wieDefaultMinImageHeight)
	prioritizeOgImage := getBoolArg(args, "prioritize_og_image", true)
	fetchMetadata := getBoolArg(args, "fetch_image_metadata", true)

	allowedTypesStr, _ := args["allowed_image_types"].(string)
	allowedTypesMap := make(map[string]bool)
	if strings.TrimSpace(allowedTypesStr) != "" {
		types := strings.Split(strings.ToLower(allowedTypesStr), ",")
		for _, t := range types {
			allowedTypesMap[strings.TrimSpace(t)] = true
		}
	} else {
		allowedTypesMap = map[string]bool{"jpeg": true, "jpg": true, "png": true, "gif": true, "webp": true}
	}

	fmt.Printf("INFO: WebImageExtractorTool starting for URL: %s\n", result.PageURL)

	fetchCtx, cancel := context.WithTimeout(ctx, wiePageFetchTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(fetchCtx, "GET", result.PageURL, nil)
	if err != nil {
		result.ExecutionErrors = append(result.ExecutionErrors, fmt.Sprintf("Failed to create request for page: %v", err))
		return wie.formatResult(&result, startTime)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) WebImageExtractorTool/1.0")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	res, err := wie.httpClient.Do(req)
	if err != nil {
		result.ExecutionErrors = append(result.ExecutionErrors, fmt.Sprintf("Failed to fetch page: %v", err))
		return wie.formatResult(&result, startTime)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		result.ExecutionErrors = append(result.ExecutionErrors, fmt.Sprintf("Page fetch returned status %d %s", res.StatusCode, http.StatusText(res.StatusCode)))
		return wie.formatResult(&result, startTime)
	}

	contentType := res.Header.Get("Content-Type")
	if !strings.Contains(strings.ToLower(contentType), "text/html") && !strings.Contains(strings.ToLower(contentType), "application/xhtml+xml") {
		result.ExecutionErrors = append(result.ExecutionErrors, fmt.Sprintf("Unsupported page content type '%s'", contentType))
		return wie.formatResult(&result, startTime)
	}

	doc, err := goquery.NewDocumentFromReader(io.LimitReader(res.Body, wieMaxHTMLBodySize))
	if err != nil {
		result.ExecutionErrors = append(result.ExecutionErrors, fmt.Sprintf("Failed to parse page HTML: %v", err))
		return wie.formatResult(&result, startTime)
	}

	result.PageTitle = cleanText(doc.Find("title").First().Text())
	basePageURL := doc.Url
	if basePageURL == nil {
		basePageURL = parsedPageURL
	}

	candidateImages := make(map[string]FoundWebImage)

	if prioritizeOgImage {
		doc.Find("meta[property='og:image']").Each(func(i int, s *goquery.Selection) {
			if content, exists := s.Attr("content"); exists {
				imgURL := wie.resolveLink(basePageURL, content)
				if imgURL != "" && !dataURIPattern.MatchString(imgURL) {
					candidateImages[imgURL] = FoundWebImage{ImageURL: imgURL, SourceTag: "og:image"}
				}
			}
		})
	}

	doc.Find("picture").Each(func(i int, pictureSel *goquery.Selection) {
		var bestSourceURL string
		var bestSourceWidth int

		pictureSel.Find("source").Each(func(j int, sourceSel *goquery.Selection) {
			srcset, _ := sourceSel.Attr("srcset")
			media, _ := sourceSel.Attr("media")
			_ = media

			urlsFromSrcset := wie.parseSrcset(srcset)
			for _, srcURL := range urlsFromSrcset {
				currentWidth := 0
				if srcURL.width > 0 {
					currentWidth = srcURL.width
				}
				if currentWidth > bestSourceWidth || bestSourceURL == "" {
					resolvedSrcURL := wie.resolveLink(basePageURL, srcURL.url)
					if resolvedSrcURL != "" && !dataURIPattern.MatchString(resolvedSrcURL) {
						bestSourceURL = resolvedSrcURL
						bestSourceWidth = currentWidth
					}
				}
			}
		})

		imgSel := pictureSel.Find("img").First()
		if bestSourceURL == "" && imgSel.Length() > 0 {
			src, _ := imgSel.Attr("src")
			if src != "" {
				resolvedSrc := wie.resolveLink(basePageURL, src)
				if resolvedSrc != "" && !dataURIPattern.MatchString(resolvedSrc) {
					bestSourceURL = resolvedSrc
				}
			}
		}

		if bestSourceURL != "" {
			if _, exists := candidateImages[bestSourceURL]; !exists {
				imgEntry := FoundWebImage{
					ImageURL:  bestSourceURL,
					SourceTag: "picture",
					AltText:   cleanText(imgSel.AttrOr("alt", "")),
				}
				w, _ := strconv.Atoi(imgSel.AttrOr("width", "0"))
				h, _ := strconv.Atoi(imgSel.AttrOr("height", "0"))
				imgEntry.Width = w
				imgEntry.Height = h
				candidateImages[bestSourceURL] = imgEntry
			}
		}
	})

	doc.Find("img").Each(func(i int, s *goquery.Selection) {
		if len(candidateImages) > wieMaxImagesToConsider && !fetchMetadata {
			return
		}
		src := ""
		lazyAttrs := []string{"data-src", "data-lazy-src", "data-original", "data-lazyload"}
		for _, attr := range lazyAttrs {
			if val, exists := s.Attr(attr); exists && val != "" {
				src = val
				break
			}
		}
		if src == "" {
			src, _ = s.Attr("src")
		}

		srcset, srcsetExists := s.Attr("srcset")

		var imgSrcs []string
		if src != "" && !dataURIPattern.MatchString(src) {
			resolved := wie.resolveLink(basePageURL, src)
			if resolved != "" {
				imgSrcs = append(imgSrcs, resolved)
			}
		}

		if srcsetExists {
			parsed := wie.parseSrcset(srcset)
			for _, p := range parsed {
				resolved := wie.resolveLink(basePageURL, p.url)
				if resolved != "" && !dataURIPattern.MatchString(resolved) {
					isNew := true
					for _, existingSrc := range imgSrcs {
						if existingSrc == resolved {
							isNew = false
							break
						}
					}
					if isNew {
						imgSrcs = append(imgSrcs, resolved)
					}
				}
			}
		}

		alt := cleanText(s.AttrOr("alt", ""))
		w, _ := strconv.Atoi(s.AttrOr("width", "0"))
		h, _ := strconv.Atoi(s.AttrOr("height", "0"))

		for _, imgSrcURL := range imgSrcs {
			if _, exists := candidateImages[imgSrcURL]; !exists {
				candidateImages[imgSrcURL] = FoundWebImage{
					ImageURL:     imgSrcURL,
					AltText:      alt,
					Width:        w,
					Height:       h,
					SourceTag:    "img",
					IsFromSrcset: srcsetExists && imgSrcURL != wie.resolveLink(basePageURL, src),
				}
			} else {
				existing := candidateImages[imgSrcURL]
				if alt != "" && existing.AltText == "" {
					existing.AltText = alt
				}
				if w > 0 && existing.Width == 0 {
					existing.Width = w
				}
				if h > 0 && existing.Height == 0 {
					existing.Height = h
				}
				if existing.SourceTag == "og:image" && alt != "" {
					existing.SourceTag = "img_og"
				}
				candidateImages[imgSrcURL] = existing
			}
		}
	})

	var finalImages []FoundWebImage
	var imagesToProcess []FoundWebImage
	for _, img := range candidateImages {
		imagesToProcess = append(imagesToProcess, img)
	}

	sort.SliceStable(imagesToProcess, func(i, j int) bool {
		if imagesToProcess[i].SourceTag == "og:image" && imagesToProcess[j].SourceTag != "og:image" {
			return true
		}
		if imagesToProcess[i].SourceTag != "og:image" && imagesToProcess[j].SourceTag == "og:image" {
			return false
		}
		areaI := imagesToProcess[i].Width * imagesToProcess[i].Height
		areaJ := imagesToProcess[j].Width * imagesToProcess[j].Height
		if areaI == 0 && areaJ > 0 {
			return false
		}
		if areaI > 0 && areaJ == 0 {
			return true
		}
		return areaI > areaJ
	})

	if len(imagesToProcess) > wieMaxImagesToConsider {
		imagesToProcess = imagesToProcess[:wieMaxImagesToConsider]
	}

	var wg sync.WaitGroup
	processedChan := make(chan FoundWebImage, len(imagesToProcess))
	errChan := make(chan string, len(imagesToProcess))

	sem := make(chan struct{}, wieMaxConcurrentMetaFetch)

	for _, imgCandidate := range imagesToProcess {
		if !fetchMetadata {
			imgCandidate.ImageType = wie.getImageTypeFromURL(imgCandidate.ImageURL)
			processedChan <- imgCandidate
			continue
		}

		wg.Add(1)
		sem <- struct{}{}
		go func(img FoundWebImage) {
			defer wg.Done()
			defer func() { <-sem }()

			metaCtx, metaCancel := context.WithTimeout(ctx, wieImageMetadataTimeout)
			defer metaCancel()

			fetchedMeta, err := wie.fetchImageMetadata(metaCtx, img.ImageURL)
			if err != nil {
				errChan <- fmt.Sprintf("Error fetching metadata for %s: %v", img.ImageURL, err)
				img.ImageType = wie.getImageTypeFromURL(img.ImageURL)
				processedChan <- img
				return
			}

			img.ImageType = fetchedMeta.ImageType
			if fetchedMeta.Width > 0 {
				img.Width = fetchedMeta.Width
			}
			if fetchedMeta.Height > 0 {
				img.Height = fetchedMeta.Height
			}
			img.FileSize = fetchedMeta.FileSize

			processedChan <- img
		}(imgCandidate)
	}

	wg.Wait()
	close(processedChan)
	close(errChan)

	for errStr := range errChan {
		result.ExecutionErrors = append(result.ExecutionErrors, errStr)
	}

	var tempFilteredImages []FoundWebImage
	for pImg := range processedChan {
		tempFilteredImages = append(tempFilteredImages, pImg)
	}

	sort.SliceStable(tempFilteredImages, func(i, j int) bool {
		if tempFilteredImages[i].SourceTag == "og:image" && tempFilteredImages[j].SourceTag != "og:image" {
			return true
		}
		if tempFilteredImages[i].SourceTag != "og:image" && tempFilteredImages[j].SourceTag == "og:image" {
			return false
		}
		areaI := tempFilteredImages[i].Width * tempFilteredImages[i].Height
		areaJ := tempFilteredImages[j].Width * tempFilteredImages[j].Height
		if areaI == 0 && areaJ > 0 {
			return false
		}
		if areaI > 0 && areaJ == 0 {
			return true
		}
		return areaI > areaJ
	})

	seenFinalURLs := make(map[string]bool)
	for _, img := range tempFilteredImages {
		if len(finalImages) >= maxImages {
			break
		}
		if seenFinalURLs[img.ImageURL] {
			continue
		}

		if img.Width < minWidth || img.Height < minHeight {
			continue
		}
		if len(allowedTypesMap) > 0 {
			imgTypeLower := strings.ToLower(img.ImageType)
			if !allowedTypesMap[imgTypeLower] && !allowedTypesMap[strings.Replace(imgTypeLower, "jpeg", "jpg", 1)] {
				continue
			}
		}

		finalImages = append(finalImages, img)
		seenFinalURLs[img.ImageURL] = true
	}
	result.FoundImages = finalImages

	if len(result.FoundImages) == 0 && len(result.ExecutionErrors) == 0 {
		result.ExecutionErrors = append(result.ExecutionErrors, fmt.Sprintf("No images found on '%s' matching criteria.", result.PageURL))
	}

	return wie.formatResult(&result, startTime)
}

type srcsetEntry struct {
	url   string
	width int
}

func (wie *WebImageExtractorTool) parseSrcset(srcset string) []srcsetEntry {
	var entries []srcsetEntry
	if srcset == "" {
		return entries
	}
	parts := strings.Split(srcset, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		fields := strings.Fields(part)
		if len(fields) == 0 {
			continue
		}
		entry := srcsetEntry{url: fields[0]}
		if len(fields) > 1 {
			descriptor := fields[1]
			if strings.HasSuffix(descriptor, "w") {
				wStr := strings.TrimSuffix(descriptor, "w")
				if w, err := strconv.Atoi(wStr); err == nil {
					entry.width = w
				}
			}
		}
		entries = append(entries, entry)
	}
	sort.SliceStable(entries, func(i, j int) bool {
		return entries[i].width > entries[j].width
	})
	return entries
}

func (wie *WebImageExtractorTool) fetchImageMetadata(ctx context.Context, imageURL string) (FoundWebImage, error) {
	meta := FoundWebImage{ImageURL: imageURL}

	req, err := http.NewRequestWithContext(ctx, "GET", imageURL, nil)
	if err != nil {
		return meta, fmt.Errorf("failed to create request for image metadata: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) WebImageExtractorTool-MetaFetch/1.0")
	req.Header.Set("Accept", "image/*,*/*;q=0.8")
	req.Header.Set("Range", "bytes=0-8191")

	res, err := wie.imgClient.Do(req)
	if err != nil {
		return meta, fmt.Errorf("failed to fetch image metadata HTTP client Do: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK && res.StatusCode != http.StatusPartialContent {
		return meta, fmt.Errorf("image metadata fetch returned status %d", res.StatusCode)
	}

	contentType := res.Header.Get("Content-Type")
	if parts := strings.Split(contentType, ";"); len(parts) > 0 {
		ct := strings.TrimSpace(parts[0])
		if strings.HasPrefix(ct, "image/") {
			meta.ImageType = strings.TrimPrefix(ct, "image/")
		}
	}
	if cl := res.Header.Get("Content-Length"); cl != "" {
		meta.FileSize, _ = strconv.ParseInt(cl, 10, 64)
	}

	limitedBody := io.LimitReader(res.Body, wieMaxImageSizeBytes)

	buf := new(bytes.Buffer)
	_, err = io.CopyN(buf, limitedBody, 8192*2)
	if err != nil && err != io.EOF {
	}

	config, format, err := image.DecodeConfig(bytes.NewReader(buf.Bytes()))
	if err != nil {
	} else {
		meta.Width = config.Width
		meta.Height = config.Height
		if meta.ImageType == "" && format != "" {
			meta.ImageType = format
		}
	}

	if meta.ImageType == "" {
		meta.ImageType = wie.getImageTypeFromURL(imageURL)
	}

	return meta, nil
}

func (wie *WebImageExtractorTool) getImageTypeFromURL(imageURL string) string {
	parsed, err := url.Parse(imageURL)
	if err != nil {
		return ""
	}
	path := parsed.Path
	extMatch := imageExtensions.FindStringSubmatch(path)
	if len(extMatch) > 1 {
		imgType := strings.ToLower(extMatch[1])
		if imgType == "jpg" {
			return "jpeg"
		}
		return imgType
	}
	return ""
}

func (wie *WebImageExtractorTool) resolveLink(base *url.URL, href string) string {
	href = strings.TrimSpace(href)
	if href == "" || strings.HasPrefix(href, "javascript:") || strings.HasPrefix(href, "mailto:") {
		return ""
	}
	if dataURIPattern.MatchString(href) {
		return href
	}

	refURL, err := url.Parse(href)
	if err != nil {
		return ""
	}
	if base == nil {
		if refURL.IsAbs() {
			return refURL.String()
		}
		return ""
	}
	return base.ResolveReference(refURL).String()
}

func cleanText(s string) string {
	s = strings.Join(strings.Fields(s), " ")
	s = strings.Map(func(r rune) rune {
		if unicode.IsPrint(r) || r == '\n' {
			return r
		}
		return -1
	}, s)
	return strings.TrimSpace(s)
}

func (wie *WebImageExtractorTool) formatResult(result *WebImageExtractorResult, start time.Time) (string, error) {
	result.ProcessingTimeMs = time.Since(start).Milliseconds()

	logMsgPrefix := "PERF"
	if len(result.ExecutionErrors) > 0 {
		logMsgPrefix = "WARN"
	}
	fmt.Printf("%s: WebImageExtractorTool for URL '%s' took %dms. Found %d images. Errors: %d.\n",
		logMsgPrefix, result.PageURL, result.ProcessingTimeMs, len(result.FoundImages), len(result.ExecutionErrors))

	if len(result.ExecutionErrors) > 0 {
		for i, e := range result.ExecutionErrors {
			if len(e) > 200 {
				result.ExecutionErrors[i] = e[:200] + "..."
			}
		}
		fmt.Printf("DETAILS: Errors for %s: %s\n", result.PageURL, strings.Join(result.ExecutionErrors, "; "))
	}

	jsonData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		errorResult := map[string]any{
			"page_url":           result.PageURL,
			"execution_errors":   append(result.ExecutionErrors, fmt.Sprintf("CRITICAL: Failed to marshal results: %v", err)),
			"processing_time_ms": result.ProcessingTimeMs,
		}
		jsonDataSimple, _ := json.Marshal(errorResult)
		return string(jsonDataSimple), fmt.Errorf("failed to marshal image extraction results: %w. Original Errors: %s", err, strings.Join(result.ExecutionErrors, "; "))
	}

	if len(result.ExecutionErrors) > 0 {
		return string(jsonData), fmt.Errorf("image extraction completed with %d errors, see execution_errors field for details. First error: %s", len(result.ExecutionErrors), result.ExecutionErrors[0])
	}

	return string(jsonData), nil
}

func init() {
	image.RegisterFormat("webp", "RIFF????WEBPVP8 ", webp.Decode, webp.DecodeConfig)
}
