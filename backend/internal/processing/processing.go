package processing

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func ProcessFile(filePath string) (string, error) {
	fileExtension := filepath.Ext(filePath)
	switch {
	case fileExtension == ".txt":
		return readFile(filePath)
	case fileExtension == ".pdf":
		return readPDF(filePath)
	default:
		return "", fmt.Errorf("unsupported file type: %s", fileExtension)
	}
}

// readFile reads the file given in input as arg (filePath)
func readFile(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("readFile: error reading file '%s': %w", filePath, err)
	}
	return string(content), nil
}

func readPDF(pdfPath string) (string, error) {
	return fmt.Sprintf("Text extracted from PDF (%s)", pdfPath), nil
}

// simulateGemini returns the output generated by gemini
func SimulateGemini(prompt string) (string, error) {
	if prompt == "" {
		return "", errors.New("simulateGemini: prompt can not be empty")
	}
	return fmt.Sprintf("Simulated Summary: This document contains the following information: %s", prompt), nil
}

func ChunkText(text string, chunkSize int) []string {
	var chunks []string

	words := strings.Fields(text)

	for i := 0; i < len(words); i += chunkSize {
		end := i + chunkSize
		if end > len(words) {
			end = len(words)
		}
		chunks = append(chunks, strings.Join(words[i:end], " "))
	}

	return chunks
}
