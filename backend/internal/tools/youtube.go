package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/generative-ai-go/genai"
)

const (
	youtubeDefaultMaxResults = 3
	youtubeAPIBaseURL        = "https://www.googleapis.com/youtube/v3"
)

type YouTubeSearchTool struct {
	httpClient *http.Client
	apiKey     string
}

type YouTubeVideoInfo struct {
	VideoID      string `json:"videoId"`
	Title        string `json:"title"`
	Description  string `json:"description,omitempty"`
	WatchURL     string `json:"watchUrl"`
	ChannelTitle string `json:"channelTitle"`
	PublishedAt  string `json:"publishedAt,omitempty"`
	ThumbnailURL string `json:"thumbnailUrl,omitempty"`
	ViewCount    string `json:"viewCount,omitempty"`
	Duration     string `json:"duration,omitempty"`
}

type YouTubeSearchResponse struct {
	Items []YouTubeSearchItem `json:"items"`
	Error *YouTubeAPIError    `json:"error,omitempty"`
}

type YouTubeSearchItem struct {
	Kind string `json:"kind"`
	ID   struct {
		VideoID string `json:"videoId"`
		Kind    string `json:"kind"`
	} `json:"id"`
	Snippet YouTubeSnippet `json:"snippet"`
}

type YouTubeVideosResponse struct {
	Items []YouTubeVideoItem `json:"items"`
	Error *YouTubeAPIError   `json:"error,omitempty"`
}

type YouTubeVideoItem struct {
	ID             string         `json:"id"`
	Snippet        YouTubeSnippet `json:"snippet"`
	ContentDetails struct {
		Duration string `json:"duration"`
	} `json:"contentDetails"`
	Statistics struct {
		ViewCount    string `json:"viewCount"`
		LikeCount    string `json:"likeCount,omitempty"`
		CommentCount string `json:"commentCount,omitempty"`
	} `json:"statistics"`
}

type YouTubeSnippet struct {
	PublishedAt  time.Time                   `json:"publishedAt"`
	ChannelID    string                      `json:"channelId"`
	Title        string                      `json:"title"`
	Description  string                      `json:"description"`
	Thumbnails   map[string]YouTubeThumbnail `json:"thumbnails"`
	ChannelTitle string                      `json:"channelTitle"`
}

type YouTubeThumbnail struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

type YouTubeAPIError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Errors  []struct {
		Message string `json:"message"`
		Domain  string `json:"domain"`
		Reason  string `json:"reason"`
	} `json:"errors"`
}

func (e *YouTubeAPIError) String() string {
	if e == nil {
		return ""
	}
	var errMsgs []string
	for _, errDetail := range e.Errors {
		errMsgs = append(errMsgs, fmt.Sprintf("%s (reason: %s)", errDetail.Message, errDetail.Reason))
	}
	return fmt.Sprintf("YouTube API Error %d: %s. Details: %s", e.Code, e.Message, strings.Join(errMsgs, "; "))
}

func NewYouTubeSearchTool() (*YouTubeSearchTool, error) {
	apiKey := os.Getenv("YOUTUBE_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("YOUTUBE_API_KEY environment variable not set")
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

	client := &http.Client{
		Transport: transport,
		Timeout:   httpClientTimeout,
	}

	return &YouTubeSearchTool{httpClient: client, apiKey: apiKey}, nil
}

func (yt *YouTubeSearchTool) Name() string {
	return "search_youtube_videos"
}

func (yt *YouTubeSearchTool) Description() string {
	return "Searches YouTube for videos based on a query. Returns a list of videos with titles, links, channel names, thumbnails, view counts, and duration. Useful for finding video content."
}

func (yt *YouTubeSearchTool) Parameters() []Parameter {
	return []Parameter{
		{Name: "query", Description: "The search query for YouTube videos.", Type: genai.TypeString, Required: true},
		{Name: "max_results", Description: fmt.Sprintf("Maximum number of video results to return (default %d, max 10).", youtubeDefaultMaxResults), Type: genai.TypeNumber, Optional: true},
		{Name: "sort_by", Description: "How to sort results.", Type: genai.TypeString, Optional: true, Enum: []string{"relevance", "date", "viewCount", "rating"}},
	}
}

func (yt *YouTubeSearchTool) Execute(ctx context.Context, args map[string]any) (string, error) {
	startTotal := time.Now()
	query, ok := args["query"].(string)
	if !ok || strings.TrimSpace(query) == "" {
		return "", fmt.Errorf("missing or invalid 'query' argument")
	}

	maxResults := youtubeDefaultMaxResults
	if mr, ok := args["max_results"].(float64); ok && mr > 0 {
		potentialMaxResult := int(mr)
		// if potentialMaxResult > 10 {
		// 	maxResults = 10
		// }
		maxResults = min(potentialMaxResult, 10)
	}

	sortBy := "relevance"
	if sb, ok := args["sort_by"].(string); ok && sb != "" {
		validSorts := map[string]bool{"relevance": true, "date": true, "viewCount": true, "rating": true}
		if validSorts[sb] {
			sortBy = sb
		} else {
			fmt.Printf("WARN: Invalid sort_by value '%s', using default 'relevance'\n", sb)
		}
	}

	fmt.Printf("INFO: YouTube search for query: '%s', max_results: %d, sort_by: %s\n", query, maxResults, sortBy)

	searchURL := fmt.Sprintf("%s/search?part=snippet&q=%s&type=video&maxResults=%d&order=%s&key=%s",
		youtubeAPIBaseURL, url.QueryEscape(query), maxResults, sortBy, yt.apiKey)

	startSearchReq := time.Now()
	searchReq, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create YouTube search request: %w", err)
	}

	searchRes, err := yt.httpClient.Do(searchReq)
	searchReqDuration := time.Since(startSearchReq)
	fmt.Printf("PERF: YouTube search API request for '%s' took %s\n", query, searchReqDuration)

	if err != nil {
		return "", fmt.Errorf("youtube search request failed: %w", err)
	}
	defer searchRes.Body.Close()

	if searchRes.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(io.LimitReader(searchRes.Body, 2048))
		return "", fmt.Errorf("youtube search API returned status %d: %s. Body: %s", searchRes.StatusCode, searchRes.Status, string(bodyBytes))
	}

	var searchResponse YouTubeSearchResponse
	if err := json.NewDecoder(io.LimitReader(searchRes.Body, 5*1024*1024)).Decode(&searchResponse); err != nil {
		return "", fmt.Errorf("failed to decode YouTube search response: %w", err)
	}

	if searchResponse.Error != nil {
		return "", fmt.Errorf("youtube search API error: %s", searchResponse.Error.String())
	}

	if len(searchResponse.Items) == 0 {
		return "No videos found for the given query.", nil
	}

	videoIDs := make([]string, 0, len(searchResponse.Items))
	initialVideoData := make(map[string]YouTubeVideoInfo)

	for _, item := range searchResponse.Items {
		if item.ID.Kind == "youtube#video" && item.ID.VideoID != "" {
			videoIDs = append(videoIDs, item.ID.VideoID)
			initialVideoData[item.ID.VideoID] = YouTubeVideoInfo{
				VideoID:      item.ID.VideoID,
				Title:        item.Snippet.Title,
				Description:  item.Snippet.Description,
				WatchURL:     fmt.Sprintf("https://www.youtube.com/watch?v=%s", item.ID.VideoID),
				ChannelTitle: item.Snippet.ChannelTitle,
				PublishedAt:  item.Snippet.PublishedAt.Format(time.RFC3339),
				ThumbnailURL: getBestThumbnailURL(item.Snippet.Thumbnails),
			}
		}
	}

	if len(videoIDs) == 0 {
		return "No valid video IDs found in search results.", nil
	}

	videosURL := fmt.Sprintf("%s/videos?part=snippet,contentDetails,statistics&id=%s&key=%s",
		youtubeAPIBaseURL, strings.Join(videoIDs, ","), yt.apiKey)

	startDetailsReq := time.Now()
	detailsReq, err := http.NewRequestWithContext(ctx, "GET", videosURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create YouTube videos details request: %w", err)
	}

	detailsRes, err := yt.httpClient.Do(detailsReq)
	detailsReqDuration := time.Since(startDetailsReq)
	fmt.Printf("PERF: YouTube videos details API request for %d videos took %s\n", len(videoIDs), detailsReqDuration)

	var videosData []YouTubeVideoInfo
	if err != nil {
		fmt.Printf("WARN: YouTube videos details request failed: %v. Returning data from search results only.\n", err)
		for _, id := range videoIDs {
			videosData = append(videosData, initialVideoData[id])
		}
	} else {
		defer detailsRes.Body.Close()
		if detailsRes.StatusCode != http.StatusOK {
			bodyBytes, _ := io.ReadAll(io.LimitReader(detailsRes.Body, 2048))
			fmt.Printf("WARN: YouTube videos details API returned status %d: %s. Body: %s. Falling back to search data.\n", detailsRes.StatusCode, detailsRes.Status, string(bodyBytes))
			for _, id := range videoIDs {
				videosData = append(videosData, initialVideoData[id])
			}
		} else {
			var videosResponse YouTubeVideosResponse
			if err := json.NewDecoder(io.LimitReader(detailsRes.Body, 10*1024*1024)).Decode(&videosResponse); err != nil {
				fmt.Printf("WARN: Failed to decode YouTube videos details response: %v. Falling back to search data.\n", err)
				for _, id := range videoIDs {
					videosData = append(videosData, initialVideoData[id])
				}
			} else if videosResponse.Error != nil {
				fmt.Printf("WARN: YouTube videos details API error: %s. Falling back to search data.\n", videosResponse.Error.String())
				for _, id := range videoIDs {
					videosData = append(videosData, initialVideoData[id])
				}
			} else {
				detailedVideoDataMap := make(map[string]YouTubeVideoItem)
				for _, vItem := range videosResponse.Items {
					detailedVideoDataMap[vItem.ID] = vItem
				}

				for _, id := range videoIDs {
					baseInfo := initialVideoData[id]
					if detailInfo, ok := detailedVideoDataMap[id]; ok {
						baseInfo.Title = detailInfo.Snippet.Title
						baseInfo.Description = detailInfo.Snippet.Description
						baseInfo.PublishedAt = detailInfo.Snippet.PublishedAt.Format(time.RFC3339)
						baseInfo.ThumbnailURL = getBestThumbnailURL(detailInfo.Snippet.Thumbnails)
						baseInfo.ChannelTitle = detailInfo.Snippet.ChannelTitle
						baseInfo.Duration = formatISO8601Duration(detailInfo.ContentDetails.Duration)
						baseInfo.ViewCount = formatViewCount(detailInfo.Statistics.ViewCount)
					}
					videosData = append(videosData, baseInfo)
				}
			}
		}
	}

	startMarshal := time.Now()
	jsonData, err := json.Marshal(videosData)
	marshalDuration := time.Since(startMarshal)
	fmt.Printf("PERF: Marshaling %d YouTube results for '%s' took %s\n", len(videosData), query, marshalDuration)

	if err != nil {
		return "", fmt.Errorf("failed to marshal YouTube video data: %w", err)
	}

	totalDuration := time.Since(startTotal)
	fmt.Printf("PERF: Total YouTubeSearchTool.Execute for '%s' took %s\n", query, totalDuration)
	return string(jsonData), nil
}

func getBestThumbnailURL(thumbnails map[string]YouTubeThumbnail) string {
	if tn, ok := thumbnails["high"]; ok && tn.URL != "" {
		return tn.URL
	}
	if tn, ok := thumbnails["medium"]; ok && tn.URL != "" {
		return tn.URL
	}
	if tn, ok := thumbnails["default"]; ok && tn.URL != "" {
		return tn.URL
	}
	return ""
}

func formatISO8601Duration(isoDuration string) string {
	if !strings.HasPrefix(isoDuration, "PT") {
		if strings.HasPrefix(isoDuration, "P") && (strings.Contains(isoDuration, "D") || strings.Contains(isoDuration, "W") || strings.Contains(isoDuration, "M") || strings.Contains(isoDuration, "Y") && !strings.Contains(isoDuration, "T")) {
			return isoDuration
		}
		return isoDuration
	}

	durationStr := strings.TrimPrefix(isoDuration, "PT")
	var readableDuration strings.Builder
	var currentNum strings.Builder

	for _, r := range durationStr {
		if r >= '0' && r <= '9' {
			currentNum.WriteRune(r)
		} else {
			if currentNum.Len() > 0 {
				readableDuration.WriteString(currentNum.String())
				currentNum.Reset()
			}
			switch r {
			case 'H':
				readableDuration.WriteString("h")
			case 'M':
				readableDuration.WriteString("m")
			case 'S':
				readableDuration.WriteString("s")
			}
		}
	}
	return readableDuration.String()
}

func formatViewCount(vc string) string {
	num, err := strconv.ParseInt(vc, 10, 64)
	if err != nil {
		return vc
	}
	if num < 1000 {
		return vc
	}
	s := strconv.FormatInt(num, 10)
	startOffset := 0
	if num < 0 {
		startOffset = 1
	}
	var buff strings.Builder
	buff.WriteString(s[:len(s)%3+startOffset])
	for i := len(s)%3 + startOffset; i < len(s); i += 3 {
		if buff.Len() > startOffset {
			buff.WriteRune(',')
		}
		buff.WriteString(s[i : i+3])
	}
	return buff.String()
}
