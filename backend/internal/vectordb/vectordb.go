package vectordb

type VectorDB interface {
	Connect() error
	InsertEmbedding(id string, vector []float32) error
	SearchSimilarEmbeddings(query []float32, k int) ([]string, error)
}
