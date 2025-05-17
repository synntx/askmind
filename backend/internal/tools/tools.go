package tools

import (
	"context"

	"github.com/google/generative-ai-go/genai"
)

type Tool interface {
	Name() string
	Description() string
	Execute(ctx context.Context, args map[string]any) (string, error)
	Parameters() []Parameter
}

type Parameter struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Type        genai.Type `json:"type"`
}

type ToolRegistry struct {
	tools map[string]Tool
}

func NewToolRegistry() *ToolRegistry {
	return &ToolRegistry{
		tools: make(map[string]Tool),
	}
}

func (r *ToolRegistry) Register(tool Tool) {
	r.tools[tool.Name()] = tool
}

func (r *ToolRegistry) GetTool(name string) (Tool, bool) {
	tool, ok := r.tools[name]
	return tool, ok
}

func (r *ToolRegistry) GetAllTools() []Tool {
	tools := make([]Tool, 0, len(r.tools))
	for _, tool := range r.tools {
		tools = append(tools, tool)
	}
	return tools
}

func (r *ToolRegistry) ConvertToGenaiTools() []*genai.Tool {
	genaiTools := make([]*genai.Tool, 0, len(r.tools))
	for _, customTool := range r.tools {
		functionDecl := genai.FunctionDeclaration{
			Name:        customTool.Name(),
			Description: customTool.Description(),
			Parameters:  &genai.Schema{Type: genai.TypeObject},
		}

		properties := make(map[string]*genai.Schema)
		required := []string{}
		for _, param := range customTool.Parameters() {
			properties[param.Name] = &genai.Schema{
				Type:        param.Type,
				Description: param.Description,
			}
			required = append(required, param.Name)
		}
		functionDecl.Parameters.Properties = properties
		functionDecl.Parameters.Required = required

		genaiTool := genai.Tool{
			FunctionDeclarations: []*genai.FunctionDeclaration{&functionDecl},
		}
		genaiTools = append(genaiTools, &genaiTool)
	}
	return genaiTools
}
