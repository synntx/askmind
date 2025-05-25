package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/google/generative-ai-go/genai"
)

const (
	oldRedditBaseURL              = "https://old.reddit.com"
	defaultRedditMaxPosts         = 10
	defaultRedditSortByBrowse     = "hot"
	defaultRedditTimeFilterBrowse = "all"
	defaultRedditSortBySearch     = "relevance"
	defaultRedditTimeFilterSearch = "all"
	defaultMaxCommentsPerPost     = 0
	requestDelayMilliseconds      = 1500
)

type RedditPost struct {
	Title               string          `json:"title"`
	URL                 string          `json:"url"`
	Permalink           string          `json:"permalink"`
	Score               int             `json:"score"`
	NumCommentsReported int             `json:"num_comments_reported"`
	Author              string          `json:"author"`
	Age                 string          `json:"age"`
	Flair               string          `json:"flair,omitempty"`
	SubredditSource     string          `json:"subreddit_source,omitempty"`
	TopComments         []RedditComment `json:"top_comments,omitempty"`
}

type RedditComment struct {
	Author string `json:"author"`
	Text   string `json:"text"`
	Score  int    `json:"score"`
	Age    string `json:"age"`
}

type RedditScrapeResult struct {
	OperationMode    string       `json:"operation_mode"`
	SearchQuery      string       `json:"search_query,omitempty"`
	SubredditName    string       `json:"subreddit_name,omitempty"`
	ScrapedPosts     []RedditPost `json:"scraped_posts"`
	Error            string       `json:"error,omitempty"`
	NextPageURLHint  string       `json:"next_page_url_hint,omitempty"`
	ProcessingTimeMs int64        `json:"processing_time_ms"`
}

type RedditSubredditScraperTool struct {
	httpClient *http.Client
}

func NewRedditSubredditScraperTool() *RedditSubredditScraperTool {
	return &RedditSubredditScraperTool{
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

func (rst *RedditSubredditScraperTool) Name() string {
	return "reddit_content_retriever"
}

func (rst *RedditSubredditScraperTool) Description() string {
	return "Retrieves content from Reddit. Can browse posts from a specific subreddit (hot, new, top) or search across all of Reddit or within a specific subreddit for keywords. Optionally fetches top comments. Uses old.reddit.com and relies on HTML scraping."
}

func (rst *RedditSubredditScraperTool) Parameters() []Parameter {
	return []Parameter{
		{Name: "search_query", Description: "Keywords to search for on Reddit. If provided, tool operates in search mode.", Type: genai.TypeString, Optional: true},
		{Name: "subreddit", Description: "Subreddit name (e.g., golang). If 'search_query' is given, search is restricted to this subreddit. If 'search_query' is empty and subreddit is given, browses this subreddit.", Type: genai.TypeString, Optional: true},
		{Name: "sort_by", Description: fmt.Sprintf("For browsing subreddit: 'hot', 'new', 'top' (default '%s').", defaultRedditSortByBrowse), Type: genai.TypeString, Optional: true},
		{Name: "time_filter", Description: fmt.Sprintf("For browsing 'top' in subreddit: 'hour', 'day', 'week', 'month', 'year', 'all' (default '%s').", defaultRedditTimeFilterBrowse), Type: genai.TypeString, Optional: true},
		{Name: "search_sort_by", Description: fmt.Sprintf("For search: 'relevance', 'comments', 'new', 'top' (default '%s').", defaultRedditSortBySearch), Type: genai.TypeString, Optional: true},
		{Name: "search_time_filter", Description: fmt.Sprintf("For search 'top' or 'comments' sort: 'hour', 'day', 'week', 'month', 'year', 'all' (default '%s').", defaultRedditTimeFilterSearch), Type: genai.TypeString, Optional: true},
		{Name: "max_posts", Description: fmt.Sprintf("Max posts to fetch (default %d, max 50).", defaultRedditMaxPosts), Type: genai.TypeNumber, Optional: true},
		{Name: "max_comments_per_post", Description: fmt.Sprintf("Max top comments per post (default %d, 0 for none).", defaultMaxCommentsPerPost), Type: genai.TypeNumber, Optional: true},
	}
}

func (rst *RedditSubredditScraperTool) Execute(ctx context.Context, args map[string]any) (string, error) {
	startTime := time.Now()
	result := RedditScrapeResult{}

	searchQuery, _ := args["search_query"].(string)
	subredditParam, _ := args["subreddit"].(string)
	result.SubredditName = strings.ToLower(strings.TrimPrefix(subredditParam, "r/"))

	sortByBrowse := getStringArg(args, "sort_by", defaultRedditSortByBrowse)
	timeFilterBrowse := getStringArg(args, "time_filter", defaultRedditTimeFilterBrowse)
	searchSortBy := getStringArg(args, "search_sort_by", defaultRedditSortBySearch)
	searchTimeFilter := getStringArg(args, "search_time_filter", defaultRedditTimeFilterSearch)

	maxPosts := getIntArg(args, "max_posts", defaultRedditMaxPosts)
	if maxPosts <= 0 || maxPosts > 50 {
		maxPosts = defaultRedditMaxPosts
	}
	maxCommentsPerPost := getIntArg(args, "max_comments_per_post", defaultMaxCommentsPerPost)

	var baseURL string
	var queryParams = url.Values{}
	isSearchMode := false

	if strings.TrimSpace(searchQuery) != "" {
		isSearchMode = true
		result.OperationMode = "search"
		result.SearchQuery = searchQuery
		queryParams.Set("q", searchQuery)
		queryParams.Set("sort", searchSortBy)
		queryParams.Set("t", searchTimeFilter)

		if result.SubredditName != "" {
			baseURL = fmt.Sprintf("%s/r/%s/search/", oldRedditBaseURL, result.SubredditName)
			queryParams.Set("restrict_sr", "on")
		} else {
			baseURL = fmt.Sprintf("%s/search/", oldRedditBaseURL)
		}
	} else if result.SubredditName != "" {
		result.OperationMode = "browse"
		baseURL = fmt.Sprintf("%s/r/%s/", oldRedditBaseURL, result.SubredditName)
		if sortByBrowse == "new" {
			baseURL += "new/"
		} else if sortByBrowse == "top" {
			baseURL += "top/"
			queryParams.Set("t", timeFilterBrowse)
		}
	} else {
		result.Error = "Either 'subreddit' (for browsing) or 'search_query' (for searching) must be provided."
		return rst.formatResult(&result, startTime)
	}

	var allPosts []RedditPost
	var postsCollected int
	var nextPageAfterParam string

	for postsCollected < maxPosts {
		currentQueryParams := cloneURLValues(queryParams)
		if nextPageAfterParam != "" {
			currentQueryParams.Set("after", nextPageAfterParam)
			currentQueryParams.Set("count", strconv.Itoa(postsCollected))
		}

		pageURL := baseURL
		if len(currentQueryParams) > 0 {
			pageURL += "?" + currentQueryParams.Encode()
		}

		fmt.Printf("INFO: Scraping Reddit page: %s\n", pageURL)
		doc, err := rst.fetchPage(ctx, pageURL)
		if err != nil {
			result.Error = fmt.Sprintf("failed to fetch or parse page %s: %v", pageURL, err)
			break
		}

		var newPostsOnPage int
		var postSelector string
		if isSearchMode {
			postSelector = "div.search-result.search-result-link"
		} else {
			postSelector = "div.thing.link"
		}

		doc.Find(postSelector).EachWithBreak(func(i int, s *goquery.Selection) bool {
			if postsCollected >= maxPosts {
				return false
			}

			post := RedditPost{}
			var titleLink *goquery.Selection

			if isSearchMode {
				titleLink = s.Find("a.search-title")
				post.Title = strings.TrimSpace(titleLink.Text())
				post.URL, _ = titleLink.Attr("href")
				post.Permalink, _ = s.Find("a.search-comments").Attr("href")
				if post.Permalink == "" {
					post.Permalink = post.URL
				}

				scoreStr := s.Find("span.search-score").Text()
				post.Score, _ = strconv.Atoi(strings.Fields(scoreStr)[0])

				numCommentsStr := s.Find("a.search-comments").Text()
				parts := strings.Fields(numCommentsStr)
				if len(parts) > 0 {
					post.NumCommentsReported, _ = strconv.Atoi(parts[0])
				}

				post.Author = s.Find("a.author").Text()
				post.Age = strings.TrimSpace(s.Find("time.search-time timeago").AttrOr("title", "unknown age"))
				post.SubredditSource = strings.TrimSpace(s.Find("a.search-subreddit-link").Text())
			} else {
				titleLink = s.Find("a.title")
				post.Title = strings.TrimSpace(titleLink.Text())
				post.URL, _ = titleLink.Attr("href")
				post.Permalink, _ = s.Find("a.comments").Attr("href")

				scoreStr := s.Find("div.score.unvoted").Text()
				if scoreStr == "•" {
					scoreStr = s.Find("div.score.unvoted").AttrOr("title", "0")
				}
				post.Score, _ = strconv.Atoi(scoreStr)

				commentTextParts := strings.Fields(s.Find("a.comments").Text())
				if len(commentTextParts) > 0 {
					post.NumCommentsReported, _ = strconv.Atoi(commentTextParts[0])
				} else {
					post.NumCommentsReported = 0
				}

				post.Author = s.Find("a.author").Text()
				post.Age = strings.TrimSpace(s.Find("time.live-timestamp").Text())
				if post.Age == "" {
					post.Age = strings.TrimSpace(s.Find("p.tagline time").First().AttrOr("title", "unknown"))
				}
				post.Flair = strings.TrimSpace(s.Find("span.linkflairlabel").Text())
				post.SubredditSource = result.SubredditName
			}

			if !strings.HasPrefix(post.URL, "http") && post.URL != "" {
				post.URL = oldRedditBaseURL + post.URL
			}
			if permalinkURL, err := url.Parse(post.Permalink); err == nil {
				post.Permalink = permalinkURL.Path
			}

			if maxCommentsPerPost > 0 && post.Permalink != "" {
				time.Sleep(time.Duration(requestDelayMilliseconds) * time.Millisecond)
				commentsPageURL := oldRedditBaseURL + post.Permalink
				if !strings.HasSuffix(commentsPageURL, "/") {
					commentsPageURL += "/"
				}
				commentsPageURL += fmt.Sprintf("?limit=%d&sort=top", maxCommentsPerPost+5)

				fmt.Printf("INFO: Fetching comments for '%s' from %s\n", truncateString(post.Title, 30), commentsPageURL)
				commentsDoc, comErr := rst.fetchPage(ctx, commentsPageURL)
				if comErr == nil {
					var commentsFound int
					commentsDoc.Find("div.commentarea > div.sitetable > div.thing.comment:not(.stickied)").EachWithBreak(func(ci int, cs *goquery.Selection) bool {
						if commentsFound >= maxCommentsPerPost {
							return false
						}

						comment := RedditComment{}
						comment.Author = cs.Find("a.author").First().Text()
						comment.Text = formatCommentText(cs.Find("div.md").First())

						commentScoreStr := cs.Find("span.score").First().Text()
						parts := strings.Fields(commentScoreStr)
						if len(parts) > 0 {
							comment.Score, _ = strconv.Atoi(parts[0])
						}

						comment.Age = strings.TrimSpace(cs.Find("time").First().AttrOr("title", "unknown age"))
						if comment.Author != "" && comment.Text != "" {
							post.TopComments = append(post.TopComments, comment)
							commentsFound++
						}
						return true
					})
				} else {
					fmt.Printf("WARN: Failed to fetch comments for post '%s': %v\n", post.Title, comErr)
				}
			}

			if post.Title != "" {
				allPosts = append(allPosts, post)
				postsCollected++
				newPostsOnPage++
			}
			return true
		})

		if newPostsOnPage == 0 && postsCollected < maxPosts {
			fmt.Printf("INFO: No new posts found on page %s, stopping.\n", pageURL)
			break
		}
		if postsCollected >= maxPosts {
			break
		}

		lastItemFullname := ""
		doc.Find(postSelector).Last().Each(func(i int, s *goquery.Selection) {
			lastItemFullname = s.AttrOr("data-fullname", "")
		})

		if lastItemFullname == "" {
			fmt.Println("INFO: Could not find 'data-fullname' for pagination. Stopping.")
			break
		}
		nextPageAfterParam = lastItemFullname
		result.NextPageURLHint = fmt.Sprintf("%s?%s", baseURL, fmt.Sprintf("count=%d&after=%s", postsCollected, nextPageAfterParam))

		fmt.Printf("INFO: Delaying for %dms before next page fetch...\n", requestDelayMilliseconds)
		time.Sleep(time.Duration(requestDelayMilliseconds) * time.Millisecond)
	}

	result.ScrapedPosts = allPosts
	if len(allPosts) == 0 && result.Error == "" {
		result.Error = "no posts found for the given criteria, or scraping failed."
	}

	return rst.formatResult(&result, startTime)
}

func (rst *RedditSubredditScraperTool) fetchPage(ctx context.Context, pageURL string) (*goquery.Document, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", pageURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	res, err := rst.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP GET: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		bodyBytes, _ := SizedRead(res.Body, 512)
		return nil, fmt.Errorf("bad status: %s (URL: %s). Body snippet: %s", res.Status, pageURL, string(bodyBytes))
	}

	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return nil, fmt.Errorf("parse HTML: %w", err)
	}
	return doc, nil
}

func formatCommentText(s *goquery.Selection) string {
	var commentBuilder strings.Builder
	s.Find("p").Each(func(i int, p *goquery.Selection) {
		commentBuilder.WriteString(strings.TrimSpace(p.Text()))
		commentBuilder.WriteString("\n")
	})
	text := strings.TrimSpace(commentBuilder.String())
	if text == "" {
		text = strings.TrimSpace(s.Text())
	}
	text = regexp.MustCompile(`\n\s*\n`).ReplaceAllString(text, "\n")
	return text
}

func (rst *RedditSubredditScraperTool) formatResult(result *RedditScrapeResult, start time.Time) (string, error) {
	result.ProcessingTimeMs = time.Since(start).Milliseconds()
	if result.Error != "" {
		fmt.Printf("ERROR in %s for Subreddit:'%s' Query:'%s': %s (Took %dms)\n", rst.Name(), result.SubredditName, result.SearchQuery, result.Error, result.ProcessingTimeMs)
	} else {
		fmt.Printf("PERF: Total %s for Subreddit:'%s' Query:'%s' took %dms, found %d posts\n", rst.Name(), result.SubredditName, result.SearchQuery, result.ProcessingTimeMs, len(result.ScrapedPosts))
	}

	jsonData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		jsonDataSimple, simpleErr := json.Marshal(result)
		if simpleErr != nil {
			return "", fmt.Errorf("failed to marshal result (indent and simple): %v / %v. Original error: %s", err, simpleErr, result.Error)
		}
		return string(jsonDataSimple), nil
	}
	return string(jsonData), nil
}

func getStringArg(args map[string]any, key string, defaultValue string) string {
	if val, ok := args[key].(string); ok && val != "" {
		return val
	}
	return defaultValue
}

func getIntArg(args map[string]any, key string, defaultValue int) int {
	if val, ok := args[key]; ok {
		switch v := val.(type) {
		case float64:
			return int(v)
		case int:
			return v
		case string:
			i, err := strconv.Atoi(v)
			if err == nil {
				return i
			}
		}
	}
	return defaultValue
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return string(runes[:maxLen])
	}
	return string(runes[:maxLen-3]) + "..."
}

func cloneURLValues(v url.Values) url.Values {
	if v == nil {
		return url.Values{}
	}
	clone := url.Values{}
	for key, values := range v {
		clone[key] = slices.Clone(values)
	}
	return clone
}

func SizedRead(r io.Reader, size int64) ([]byte, error) {
	limitedReader := io.LimitReader(r, size)
	return io.ReadAll(limitedReader)
}
