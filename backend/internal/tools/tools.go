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

// Parameter represents a parameter of a tool.
type Parameter struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Type        genai.Type `json:"type"`
	Required    bool       `json:"required,omitempty"`
	Optional    bool       `json:"optional,omitempty"`
	Enum        []string   `json:"enum,omitempty"`
}

// ToolRegistry is a registry of tools.
type ToolRegistry struct {
	tools map[string]Tool
}

// NewToolRegistry creates a new ToolRegistry.
func NewToolRegistry() *ToolRegistry {
	return &ToolRegistry{
		tools: make(map[string]Tool),
	}
}

// Register registers a tool in the registry.
func (r *ToolRegistry) Register(tool Tool) {
	r.tools[tool.Name()] = tool
}

// GetTool returns the tool with the given name, if it exists.
func (r *ToolRegistry) GetTool(name string) (Tool, bool) {
	tool, ok := r.tools[name]
	return tool, ok
}

// GetAllTools returns all the tools registered in the registry.
func (r *ToolRegistry) GetAllTools() []Tool {
	tools := make([]Tool, 0, len(r.tools))
	for _, tool := range r.tools {
		tools = append(tools, tool)
	}
	return tools
}

// ConvertToGenaiTools converts the tools registered in the registry to the
// genai.Tool format.
func (r *ToolRegistry) ConvertToGenaiTools() []*genai.Tool {
	genaiTools := make([]*genai.Tool, 0, len(r.tools))
	for _, customTool := range r.tools {
		functionDecl := genai.FunctionDeclaration{
			Name:        customTool.Name(),
			Description: customTool.Description(),
			Parameters:  &genai.Schema{Type: genai.TypeObject},
		}

		properties := make(map[string]*genai.Schema)
		var requiredParams []string

		for _, param := range customTool.Parameters() {
			schema := &genai.Schema{
				Type:        param.Type,
				Description: param.Description,
			}
			if len(param.Enum) > 0 {
				schema.Enum = param.Enum
			}
			properties[param.Name] = schema

			if param.Required {
				requiredParams = append(requiredParams, param.Name)
			}
		}
		functionDecl.Parameters.Properties = properties
		if len(requiredParams) > 0 {
			functionDecl.Parameters.Required = requiredParams
		} else {
			functionDecl.Parameters.Required = []string{}
		}

		genaiTool := genai.Tool{
			FunctionDeclarations: []*genai.FunctionDeclaration{&functionDecl},
		}
		genaiTools = append(genaiTools, &genaiTool)
	}
	return genaiTools
}
