package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"go.uber.org/zap"
)

type SSEStreamer struct {
	w      http.ResponseWriter
	rc     *http.ResponseController
	logger *zap.Logger
}

func NewSSEStreamer(w http.ResponseWriter, logger *zap.Logger) (*SSEStreamer, error) {
	if _, ok := w.(http.Flusher); !ok {
		return nil, fmt.Errorf("http.ResponseWriter does not implement http.Flusher")
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	rc := http.NewResponseController(w)

	if err := rc.Flush(); err != nil {
		logger.Error("Initial SSE flush failed", zap.Error(err))
		return nil, err
	}

	return &SSEStreamer{
		w:      w,
		rc:     rc,
		logger: logger,
	}, nil
}

func (s *SSEStreamer) Send(event string, payload any) error {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		s.logger.Error("error marshalling SSE payload", zap.String("event", event), zap.Error(err))
		return err
	}
	return s.writeAndFlush(event, jsonData)
}

func (s *SSEStreamer) SendRaw(event string, rawData string) error {
	return s.writeAndFlush(event, []byte(rawData))
}

func (s *SSEStreamer) writeAndFlush(event string, data []byte) error {
	var buffer strings.Builder
	if event != "" {
		buffer.WriteString(fmt.Sprintf("event: %s\n", event))
	}
	buffer.WriteString(fmt.Sprintf("data: %s\n\n", data))

	_, err := s.w.Write([]byte(buffer.String()))
	if err != nil {
		s.logger.Error("error writing SSE data", zap.String("event", event), zap.Error(err))
		return err
	}

	if err := s.rc.Flush(); err != nil {
		s.logger.Warn("error flushing SSE data", zap.String("event", event), zap.Error(err))
		return err
	}

	return nil
}
