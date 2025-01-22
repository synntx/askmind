package vectordb

import (
	"context"
	"fmt"
	"strings"

	"github.com/milvus-io/milvus-sdk-go/v2/client"
	"github.com/milvus-io/milvus-sdk-go/v2/entity"
)

type MilvusDB struct {
	client     client.Client
	uri        string
	username   string
	password   string
	collection string
	dim        int
}

func NewMilvusDB(uri, username, password, collection string, dim int) *MilvusDB {
	return &MilvusDB{
		uri:        uri,
		username:   username,
		password:   password,
		collection: collection,
		dim:        dim,
	}
}

func (z *MilvusDB) Connect() error {
	ctx := context.Background()

	c, err := client.NewClient(ctx, client.Config{
		Address:  z.uri,
		Username: z.username,
		Password: z.password,
	})

	if err != nil {
		return err
	}

	z.client = c

	has, err := z.client.HasCollection(ctx, z.collection)
	if err != nil {
		return err
	}

	if !has {
		schema := &entity.Schema{
			CollectionName: z.collection,
			Description:    "vector collection for embeddings",
			Fields: []*entity.Field{
				{
					Name:       "id",
					DataType:   entity.FieldTypeVarChar,
					PrimaryKey: true,
					TypeParams: map[string]string{
						"max_length": "256",
					},
				},
				{
					Name:     "vector",
					DataType: entity.FieldTypeFloatVector,
					TypeParams: map[string]string{
						"dim": fmt.Sprintf("%d", z.dim),
					},
				},
				{Name: "text", DataType: entity.FieldTypeString},
				{Name: "user_id", DataType: entity.FieldTypeString},

				// TODO:  Store metadata in psql db

				// {Name: "source_id", DataType: entity.FieldTypeString},
				// {Name: "source_type", DataType: entity.FieldTypeString},
				// {Name: "source_metadata", DataType: entity.FieldTypeJSON},
				// {Name: "chunk_index", DataType: entity.FieldTypeInt32},
				// {Name: "chunk_token_count", DataType: entity.FieldTypeInt32},
				// {Name: "created_at", DataType: entity.FieldTypeString},
				// {Name: "last_updated_at", DataType: entity.FieldTypeString},
			},
		}
		err := z.client.CreateCollection(ctx, schema, 0)
		if err != nil {
			return err
		}

		// NewIndexIvfFlat :
		// Ivf (inverted file index) - flat Index
		// one of the indexing method in Milvus for efficient vector similarity search
		// for more info visit https://milvus.io/docs/index.md#Indexes-supported-in-Milvus
		// entity.COSINE -> Distance metric (Cosine similarity)
		// 1024 -> Number of cluster
		// More cluster : Faster search with less accuracy,
		// Less Clusters : Slower search but potentially more accurate
		idx, err := entity.NewIndexIvfFlat(entity.COSINE, 1024)
		if err != nil {
			return err
		}

		err = z.client.CreateIndex(ctx, z.collection, "vector", idx, false)
		if err != nil {
			return err
		}

		err = z.client.LoadCollection(ctx, z.collection, false)
		if err != nil {
			return err
		}

	}

	return nil
}

func (z *MilvusDB) InsertEmbedding(id, text, userId string, vector []float32) error {
	ctx := context.Background()

	ids := []string{id}
	vectors := [][]float32{vector}

	idColumn := entity.NewColumnVarChar("id", ids)
	vectorColumn := entity.NewColumnFloatVector("vector", z.dim, vectors)
	textColumn := entity.NewColumnString("text", []string{text})
	userIdColumn := entity.NewColumnString("user_id", []string{userId})

	_, err := z.client.Insert(ctx, z.collection, "", idColumn, vectorColumn, textColumn, userIdColumn)
	if err != nil {
		return err
	}

	return nil
}

type VectorSearchResults struct {
	ID     string
	UserId string
	Score  float32
	Text   string
}

func (z *MilvusDB) SearchSimilarEmbeddings(query []float32, k int, userId string) ([]VectorSearchResults, error) {
	ctx := context.Background()

	// nprobe is a search param for IVF indexes that determines how many clusters (cells) to search during a query
	// Higher nprobe: Better search accuracy, Slower search speed, More resource usage
	// Lower nprobe: Faster search speed, Less resource usage, Lower search accuracy
	sp, err := entity.NewIndexIvfFlatSearchParam(10)
	if err != nil {
		return nil, err
	}

	expr := fmt.Sprintf("user_id = '%s'", strings.ReplaceAll(userId, "'", "''"))

	// sp (searchParam) parameter defines how the search is performed particularly for index-specific search optimizations
	searchResults, err := z.client.Search(
		ctx, z.collection, nil, expr, []string{"id", "text", "user_id"}, []entity.Vector{entity.FloatVector(query)}, "vector", entity.COSINE, k, sp)

	if err != nil {
		return nil, err
	}

	var results = make([]VectorSearchResults, 0, len(searchResults))
	for _, searchResult := range searchResults {

		if searchResult.Err != nil {
			return nil, searchResult.Err
		}

		textCol := searchResult.Fields.GetColumn("text")
		if textCol == nil {
			return nil, fmt.Errorf("column 'text' not found in results")
		}

		userIdCol := searchResult.Fields.GetColumn("user_id")
		if userIdCol == nil {
			return nil, fmt.Errorf("column 'user_id' not found in results")
		}

		for i := 0; i < searchResult.ResultCount; i++ {
			idStr, err := searchResult.IDs.GetAsString(i)
			if err != nil {
				return nil, fmt.Errorf("error getting ID as string: %w", err)
			}

			text, err := textCol.GetAsString(i)
			if err != nil {
				return nil, fmt.Errorf("error getting text as string: %w", err)
			}

			userId, err := userIdCol.GetAsString(i)
			if err != nil {
				return nil, fmt.Errorf("error getting user_id as string: %w", err)
			}

			score := searchResult.Scores[i]

			results = append(results, VectorSearchResults{
				ID:     idStr,
				UserId: userId,
				Score:  score,
				Text:   text,
			})
		}

	}

	return results, nil
}
