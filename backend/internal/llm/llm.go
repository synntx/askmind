package llm

type LLM interface {
	GenerateContent(input string) string
}

// create client
func CreateGeminiClient() {}
