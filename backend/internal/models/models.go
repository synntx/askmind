package models

import "time"

type User struct {
	UserId     string    `json:"user_id"`
	FirstName  string    `json:"first_name"`
	LastName   string    `json:"last_name"`
	Email      string    `json:"email"`
	Password   string    `json:"-"`
	SpaceLimit int       `json:"space_limit"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Space struct {
	SpaceId     string    `json:"space_id"`
	UserId      string    `json:"user_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	SourceLimit int       `json:"source_limit"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type SourceType string

const (
	SourceTypeDocument SourceType = "document"
	SourceTypeYouTube  SourceType = "youtube"
	SourceTypeWebPage  SourceType = "webpage"
)

type Source struct {
	SourceId   string     `json:"source_id"`
	SpaceId    string     `json:"space_id"`
	SourceType SourceType `json:"source_type"`
	Location   string     `json:"location;omitempty"` // url of the source destination
	Metadata   string     `json:"metadata"`
	Text       string     `json:"text"` // WARN: not sure should I save or not complete extracted text
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type DocumentMetadata struct {
	Filename  string `json:"filename"`
	FileSize  int64  `json:"file_size"`
	PageCount int    `json:"page_count"`
}

type YouTubeMetadata struct {
	VideoTitle    string `json:"video_title"`
	ChannelName   string `json:"channel_name"`
	VideoDuration string `json:"video_duration"`
}

type WebPageMetadata struct {
	PageTitle       string `json:"page_title"`
	WebsiteName     string `json:"website_name"`
	MetaDescription string `json:"meta_description"`
}

type Chunk struct {
	ChunkId         string `json:"chunk_id"`
	SourceId        string `json:"source_id"`
	Text            string `json:"text"`
	ChunkIndex      int32  `json:"chunk_index"`
	ChunkTokenCount int32  `json:"chunk_token_count"`
}

type UpdateName struct {
	FirstName *string `json:"first_name,omitempty"`
	LastName  *string `json:"last_name,omitempty"`
}

type UpdateSpace struct {
	SpaceId     string  `json:"space_id"` // required
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
}
