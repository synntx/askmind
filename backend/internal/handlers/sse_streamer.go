package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/synntx/askmind/internal/utils"
	"go.uber.org/zap"
)

type SSEStreamer struct {
	w      http.ResponseWriter
	rc     *http.ResponseController
	logger *zap.Logger
}

func NewSSEStreamer(w http.ResponseWriter, logger *zap.Logger) (*SSEStreamer, error) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		return nil, fmt.Errorf("expected http.ResponseWriter to be an http.Flusher")
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	rc := http.NewResponseController(w)
	flusher.Flush()

	return &SSEStreamer{
		w:      w,
		rc:     rc,
		logger: logger,
	}, nil
}

func (s *SSEStreamer) SendEvent(event string, data string) error {
	_, err := fmt.Fprintf(s.w, "event: %s\ndata: %s\n\n", event, data)
	if err != nil {
		s.logger.Error("error writing SSE event", zap.String("event", event), zap.Error(err))
		return err
	}
	if err := s.rc.Flush(); err != nil {
		s.logger.Error("error flushing SSE data", zap.String("event", event), zap.Error(err))
		return err
	}
	return nil
}

func (s *SSEStreamer) SendDeltaEvent(delta map[string]any) error {
	deltaJSON, err := json.Marshal(delta)
	if err != nil {
		s.logger.Error("error marshalling delta event", zap.Error(err))
		return err
	}
	return s.SendEvent("delta", string(deltaJSON))
}

func (s *SSEStreamer) SendCompletionEvent(data map[string]any) error {
	completionJSON, err := json.Marshal(data)
	if err != nil {
		s.logger.Error("error marshalling completion event data", zap.Error(err))
		return err
	}
	return s.SendEvent("", string(completionJSON)) // No event name for standard data events
}

func (s *SSEStreamer) SendErrorEvent(errorType string, errorMessage string, details map[string]any) error {
	return utils.SendErrorEvent(s.w, s.rc, errorType, errorMessage, details)
}
