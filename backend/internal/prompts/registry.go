// Package prompts contains the Template for the LLM prompts.
package prompts

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// think.tmpl  tools.tmpl

//go:embed general.tmpl research.tmpl
var fs embed.FS

// Template cache
var tpl = template.Must(
	template.
		New("").
		Funcs(template.FuncMap{
			"formatDate": func(t time.Time, layout string) string {
				return t.Format(layout)
			},
		}).
		ParseFS(fs, "*.tmpl"),
)

type Data struct {
	Now time.Time
}

// Render returns the rendered prompt text.
func Render(name string, data Data) (string, error) {
	var buf bytes.Buffer
	t := tpl.Lookup(name + ".tmpl")
	if t == nil {
		return "", fmt.Errorf("unknown prompt %q", name)
	}
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// List returns available prompt names
func List() []string {
	var names []string
	for _, t := range tpl.Templates() {
		n := t.Name()
		if !strings.HasSuffix(n, ".tmpl") {
			continue
		}
		base := strings.TrimSuffix(filepath.Base(n), ".tmpl")
		names = append(names, base)
	}
	sort.Strings(names)
	return names
}
