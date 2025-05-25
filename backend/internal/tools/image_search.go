package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/generative-ai-go/genai"
)

const (
	pexelsAPIURL     = "https://api.pexels.com/v1/search"
	pexelsMaxPerPage = 80

	pixabayAPIURL     = "https://pixabay.com/api/"
	pixabayMaxPerPage = 200

	istDefaultMaxImagesToReturn = 8
	istMaxImagesToReturn        = 20
	istDefaultMinImageWidth     = 150
	istDefaultMinImageHeight    = 150

	istHTTPClientTimeout = 15 * time.Second

	sourceBoth    = "both"
	sourcePexels  = "pexels"
	sourcePixabay = "pixabay"
	sourceDefault = sourceBoth
)

type ImageSearchResult struct {
	Query            string       `json:"query"`
	FoundImages      []FoundImage `json:"found_images,omitempty"`
	ExecutionErrors  []string     `json:"execution_errors,omitempty"`
	ProcessingTimeMs int64        `json:"processing_time_ms"`
}

type FoundImage struct {
	ImageURL        string `json:"image_url"`
	AltText         string `json:"alt_text,omitempty"`
	SourcePageURL   string `json:"source_page_url"`
	SourcePageTitle string `json:"source_page_title,omitempty"`
	DetectedWidth   int    `json:"detected_width,omitempty"`
	DetectedHeight  int    `json:"detected_height,omitempty"`
}

type PexelsPhotoSrc struct {
	Original  string `json:"original"`
	Large2x   string `json:"large2x"`
	Large     string `json:"large"`
	Medium    string `json:"medium"`
	Small     string `json:"small"`
	Portrait  string `json:"portrait"`
	Landscape string `json:"landscape"`
	Tiny      string `json:"tiny"`
}

type PexelsPhoto struct {
	ID              int            `json:"id"`
	Width           int            `json:"width"`
	Height          int            `json:"height"`
	URL             string         `json:"url"`
	Photographer    string         `json:"photographer"`
	PhotographerURL string         `json:"photographer_url"`
	AvgColor        string         `json:"avg_color"`
	Src             PexelsPhotoSrc `json:"src"`
	Alt             string         `json:"alt"`
}

type PexelsSearchResponse struct {
	TotalResults int           `json:"total_results"`
	Page         int           `json:"page"`
	PerPage      int           `json:"per_page"`
	Photos       []PexelsPhoto `json:"photos"`
	NextPage     string        `json:"next_page"`
}

type PixabayHit struct {
	ID              int    `json:"id"`
	PageURL         string `json:"pageURL"`
	Type            string `json:"type"`
	Tags            string `json:"tags"`
	PreviewURL      string `json:"previewURL"`
	PreviewWidth    int    `json:"previewWidth"`
	PreviewHeight   int    `json:"previewHeight"`
	WebformatURL    string `json:"webformatURL"`
	WebformatWidth  int    `json:"webformatWidth"`
	WebformatHeight int    `json:"webformatHeight"`
	LargeImageURL   string `json:"largeImageURL"`
	ImageWidth      int    `json:"imageWidth"`
	ImageHeight     int    `json:"imageHeight"`
	Views           int    `json:"views"`
	Downloads       int    `json:"downloads"`
	Likes           int    `json:"likes"`
	Comments        int    `json:"comments"`
	UserID          int    `json:"user_id"`
	User            string `json:"user"`
	UserImageURL    string `json:"userImageURL"`
}

type PixabaySearchResponse struct {
	Total     int          `json:"total"`
	TotalHits int          `json:"totalHits"`
	Hits      []PixabayHit `json:"hits"`
}

type ImageSearchTool struct {
	pexelsAPIKey  string
	pixabayAPIKey string
	apiClient     *http.Client
}

func NewImageSearchTool() *ImageSearchTool {
	pexelsKey := os.Getenv("PEXELS_API_KEY")
	pixabayKey := os.Getenv("PIXABAY_API_KEY")

	if pexelsKey == "" && pixabayKey == "" {
		fmt.Println("WARN: Neither PEXELS_API_KEY nor PIXABAY_API_KEY environment variable is set. ImageSearchTool will fail.")
	} else if pexelsKey == "" {
		fmt.Println("WARN: PEXELS_API_KEY environment variable not set. ImageSearchTool will only be able to use Pixabay if requested.")
	} else if pixabayKey == "" {
		fmt.Println("WARN: PIXABAY_API_KEY environment variable not set. ImageSearchTool will only be able to use Pexels if requested.")
	} else {
		fmt.Println("INFO: PEXELS_API_KEY and PIXABAY_API_KEY environment variables are set. ImageSearchTool can use both APIs.")
	}

	apiClient := &http.Client{
		Timeout: istHTTPClientTimeout,
		Transport: &http.Transport{
			Proxy: http.ProxyFromEnvironment,
		},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	return &ImageSearchTool{
		pexelsAPIKey:  pexelsKey,
		pixabayAPIKey: pixabayKey,
		apiClient:     apiClient,
	}
}

func (ist *ImageSearchTool) Name() string {
	return "image_searcher"
}

func (ist *ImageSearchTool) Description() string {
	return "Searches for high-quality, free-to-use images using the Pexels and/or Pixabay APIs based on a query. Results from selected sources are combined and filtered."
}

func (ist *ImageSearchTool) Parameters() []Parameter {
	return []Parameter{
		{Name: "query", Description: "The search query for images (e.g., 'nature', 'cityscape').", Type: genai.TypeString, Required: true},
		{Name: "max_images_to_return", Description: fmt.Sprintf("Maximum number of combined images to return from all sources (default %d, max %d). Note: Each API has its own per-page limit.", istDefaultMaxImagesToReturn, istMaxImagesToReturn), Type: genai.TypeNumber, Optional: true},
		{Name: "min_image_width", Description: fmt.Sprintf("Minimum width (pixels) for an image to be included in results (default %d). Results are filtered after fetching from APIs.", istDefaultMinImageWidth), Type: genai.TypeNumber, Optional: true},
		{Name: "min_image_height", Description: fmt.Sprintf("Minimum height (pixels) for an image to be included in results (default %d). Results are filtered after fetching from APIs.", istDefaultMinImageHeight), Type: genai.TypeNumber, Optional: true},
		{Name: "orientation", Description: `Filter results by orientation ("landscape", "portrait", or "square"). Applies to both APIs if supported.`, Type: genai.TypeString, Optional: true, Enum: []string{"landscape", "portrait", "square"}},
		{Name: "size", Description: `Filter results by size ("large", "medium", or "small"). Size definitions may vary slightly between sources. Applies to both APIs if supported.`, Type: genai.TypeString, Optional: true, Enum: []string{"large", "medium", "small"}},
		{Name: "source", Description: fmt.Sprintf(`Specify which image source(s) to use ("pexels", "pixabay", or "both"). Defaults to "%s".`, sourceDefault), Type: genai.TypeString, Optional: true, Enum: []string{sourcePexels, sourcePixabay, sourceBoth}},
	}
}

func (ist *ImageSearchTool) Execute(ctx context.Context, args map[string]any) (string, error) {
	startTime := time.Now()
	result := ImageSearchResult{}

	query, ok := args["query"].(string)
	if !ok || strings.TrimSpace(query) == "" {
		return "", fmt.Errorf("missing or invalid 'query' argument")
	}
	result.Query = query

	maxImagesToReturn := getIntArg(args, "max_images_to_return", istDefaultMaxImagesToReturn)
	maxImagesToReturn = min(max(maxImagesToReturn, 1), istMaxImagesToReturn)

	minImageWidth := getIntArg(args, "min_image_width", istDefaultMinImageWidth)
	minImageHeight := getIntArg(args, "min_image_height", istDefaultMinImageHeight)

	orientation, _ := args["orientation"].(string)
	size, _ := args["size"].(string)

	source, _ := args["source"].(string)
	if source == "" {
		source = sourceDefault
	}
	if source != sourcePexels && source != sourcePixabay && source != sourceBoth {
		result.ExecutionErrors = append(result.ExecutionErrors, fmt.Sprintf("Invalid 'source' parameter: '%s'. Must be '%s', '%s', or '%s'.", source, sourcePexels, sourcePixabay, sourceBoth))
		return ist.formatResult(&result, startTime)
	}

	fmt.Printf("INFO: ImageSearchTool starting for query: '%s', max_images (combined target): %d, min_dims: %dx%d, orientation: %s, size: %s, source: %s\n",
		query, maxImagesToReturn, minImageWidth, minImageHeight, orientation, size, source)

	var allPhotos []FoundImage
	seenImageURLs := make(map[string]bool)

	if source == sourcePexels || source == sourceBoth {
		if ist.pexelsAPIKey != "" {
			pexelsPhotos, err := ist.searchPexelsImages(ctx, query, min(maxImagesToReturn, pexelsMaxPerPage), orientation, size)
			if err != nil {
				result.ExecutionErrors = append(result.ExecutionErrors, fmt.Sprintf("Pexels API search failed: %v", err))
			} else {
				for _, photo := range pexelsPhotos {
					imgURL := photo.Src.Large2x
					if imgURL == "" {
						imgURL = photo.Src.Large
					}
					if imgURL == "" {
						imgURL = photo.Src.Medium
					}
					if imgURL != "" && !seenImageURLs[imgURL] {
						allPhotos = append(allPhotos, FoundImage{
							ImageURL:        imgURL,
							AltText:         photo.Alt,
							SourcePageURL:   photo.URL,
							SourcePageTitle: photo.Photographer,
							DetectedWidth:   photo.Width,
							DetectedHeight:  photo.Height,
						})
						seenImageURLs[imgURL] = true
					}
				}
			}
		} else {
			result.ExecutionErrors = append(result.ExecutionErrors, "PEXELS_API_KEY not set, skipping Pexels search.")
		}
	}

	if source == sourcePixabay || source == sourceBoth {
		if ist.pixabayAPIKey != "" {
			pixabayHits, err := ist.searchPixabayImages(ctx, query, min(maxImagesToReturn, pixabayMaxPerPage), orientation)
			if err != nil {
				result.ExecutionErrors = append(result.ExecutionErrors, fmt.Sprintf("Pixabay API search failed: %v", err))
			} else {
				for _, hit := range pixabayHits {
					imgURL := hit.LargeImageURL
					if imgURL == "" {
						imgURL = hit.WebformatURL
					}
					altText := hit.Tags

					detectedWidth := hit.ImageWidth
					detectedHeight := hit.ImageHeight
					if detectedWidth == 0 || detectedHeight == 0 {
						detectedWidth = hit.WebformatWidth
						detectedHeight = hit.WebformatHeight
					}

					if imgURL != "" && !seenImageURLs[imgURL] {
						allPhotos = append(allPhotos, FoundImage{
							ImageURL:        imgURL,
							AltText:         altText,
							SourcePageURL:   hit.PageURL,
							SourcePageTitle: hit.User,
							DetectedWidth:   detectedWidth,
							DetectedHeight:  detectedHeight,
						})
						seenImageURLs[imgURL] = true
					}
				}
			}
		} else {
			result.ExecutionErrors = append(result.ExecutionErrors, "PIXABAY_API_KEY not set, skipping Pixabay search.")
		}
	}

	filteredAndLimitedPhotos := []FoundImage{}
	for _, photo := range allPhotos {
		if len(filteredAndLimitedPhotos) >= maxImagesToReturn {
			break
		}

		if (minImageWidth > 0 && photo.DetectedWidth < minImageWidth) || (minImageHeight > 0 && photo.DetectedHeight < minImageHeight) {
			continue
		}

		filteredAndLimitedPhotos = append(filteredAndLimitedPhotos, photo)
	}

	result.FoundImages = filteredAndLimitedPhotos

	if len(result.FoundImages) == 0 && len(result.ExecutionErrors) == 0 {
		result.ExecutionErrors = append(result.ExecutionErrors, fmt.Sprintf("No images found for query '%s' from source(s) '%s' matching criteria.", query, source))
	} else if len(result.FoundImages) == 0 && source != sourceBoth {
	} else if len(result.FoundImages) == 0 && source == sourceBoth && ist.pexelsAPIKey != "" && ist.pixabayAPIKey != "" {
		result.ExecutionErrors = append(result.ExecutionErrors, fmt.Sprintf("No images found for query '%s' from source(s) '%s' matching criteria.", query, source))
	}

	return ist.formatResult(&result, startTime)
}

func (ist *ImageSearchTool) searchPexelsImages(ctx context.Context, query string, perPage int, orientation, size string) ([]PexelsPhoto, error) {
	if ist.pexelsAPIKey == "" {
		return nil, fmt.Errorf("PEXELS_API_KEY is not set")
	}

	u, err := url.Parse(pexelsAPIURL)
	if err != nil {
		return nil, fmt.Errorf("invalid Pexels API URL: %w", err)
	}

	q := u.Query()
	q.Set("query", query)
	q.Set("per_page", strconv.Itoa(perPage))
	if orientation != "" {
		q.Set("orientation", orientation)
	}
	if size != "" {
		q.Set("size", size)
	}
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create Pexels API request: %w", err)
	}
	req.Header.Set("Authorization", ist.pexelsAPIKey)
	req.Header.Set("User-Agent", "Go-ImageSearchTool/1.0 (+https://example.com/tool)")

	res, err := ist.apiClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Pexels API request failed: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return nil, fmt.Errorf("Pexels API returned status %d: %s", res.StatusCode, string(bodyBytes))
	}

	var pexelsResponse PexelsSearchResponse
	decoder := json.NewDecoder(io.LimitReader(res.Body, 5*1024*1024))
	if err := decoder.Decode(&pexelsResponse); err != nil {
		return nil, fmt.Errorf("failed to parse Pexels API response: %w", err)
	}

	fmt.Printf("INFO: Pexels API search for '%s' returned %d photos.\n", query, len(pexelsResponse.Photos))

	return pexelsResponse.Photos, nil
}

func (ist *ImageSearchTool) searchPixabayImages(ctx context.Context, query string, perPage int, orientation string) ([]PixabayHit, error) {
	if ist.pixabayAPIKey == "" {
		return nil, fmt.Errorf("PIXABAY_API_KEY is not set")
	}

	u, err := url.Parse(pixabayAPIURL)
	if err != nil {
		return nil, fmt.Errorf("invalid Pixabay API URL: %w", err)
	}

	q := u.Query()
	q.Set("key", ist.pixabayAPIKey)
	q.Set("q", query)
	q.Set("image_type", "photo")
	q.Set("safesearch", "true")
	q.Set("per_page", strconv.Itoa(perPage))

	if orientation != "" {
		if orientation == "landscape" {
			q.Set("orientation", "horizontal")
		} else if orientation == "portrait" {
			q.Set("orientation", "vertical")
		} else if orientation == "square" {
		}
	}

	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create Pixabay API request: %w", err)
	}
	req.Header.Set("User-Agent", "Go-ImageSearchTool/1.0 (+https://example.com/tool)")

	res, err := ist.apiClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Pixabay API request failed: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return nil, fmt.Errorf("Pixabay API returned status %d: %s", res.StatusCode, string(bodyBytes))
	}

	var pixabayResponse PixabaySearchResponse
	decoder := json.NewDecoder(io.LimitReader(res.Body, 5*1024*1024))
	if err := decoder.Decode(&pixabayResponse); err != nil {
		return nil, fmt.Errorf("failed to parse Pixabay API response: %w", err)
	}

	fmt.Printf("INFO: Pixabay API search for '%s' returned %d hits.\n", query, len(pixabayResponse.Hits))

	return pixabayResponse.Hits, nil
}

func (ist *ImageSearchTool) formatResult(result *ImageSearchResult, start time.Time) (string, error) {
	result.ProcessingTimeMs = time.Since(start).Milliseconds()

	if len(result.ExecutionErrors) > 0 {
		fmt.Printf("WARN: ImageSearchTool for query '%s' completed with %d errors in %dms. Found %d images.\n",
			result.Query, len(result.ExecutionErrors), result.ProcessingTimeMs, len(result.FoundImages))
	} else {
		fmt.Printf("PERF: ImageSearchTool for query '%s' took %dms. Found %d images.\n",
			result.Query, result.ProcessingTimeMs, len(result.FoundImages))
	}

	jsonData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		jsonDataSimple, _ := json.Marshal(result)
		return string(jsonDataSimple), fmt.Errorf("failed to marshal image search results: %w. Errors: %s", err, strings.Join(result.ExecutionErrors, "; "))
	}

	if len(result.ExecutionErrors) > 0 {
		return string(jsonData), fmt.Errorf("image search completed with errors: %s", strings.Join(result.ExecutionErrors, "; "))
	}

	return string(jsonData), nil
}
