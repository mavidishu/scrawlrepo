import { EmbeddingService } from './embedding-service.js';
import type { SearchResult, ChunkWithEmbedding } from './types';

export interface VectorSearchOptions {
  apiKey?: string;
}

export class VectorSearch {
  private embeddingService: EmbeddingService;

  constructor(options: VectorSearchOptions = {}) {
    this.embeddingService = new EmbeddingService({
      apiKey: options.apiKey,
    });
  }

  /**
   * Search for similar chunks using in-memory comparison
   * Note: For production, use the database's vector search capabilities
   */
  async search(
    query: string,
    chunks: ChunkWithEmbedding[],
    topK: number = 10
  ): Promise<SearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.embeddingService.embedQuery(query);

    // Calculate similarity scores
    const scored = chunks.map((chunk) => ({
      ...chunk,
      score: EmbeddingService.cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // Sort by score and take top K
    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, topK);

    return topResults.map((result) => ({
      id: result.id,
      content: result.content,
      score: result.score,
      metadata: result.metadata,
    }));
  }

  /**
   * Build a PostgreSQL query for vector similarity search
   * Returns the SQL query and parameters
   */
  static buildPgVectorQuery(
    embedding: number[],
    repositoryId: string,
    topK: number = 10
  ): { query: string; params: (string | number)[] } {
    // Format embedding as PostgreSQL vector literal
    const vectorLiteral = `[${embedding.join(',')}]`;

    const query = `
      SELECT 
        c.id,
        c.content,
        c.start_line as "startLine",
        c.end_line as "endLine",
        c.metadata,
        f.path as "filePath",
        1 - (c.embedding <=> $1::vector) as score
      FROM chunks c
      JOIN files f ON c.file_id = f.id
      WHERE f.repository_id = $2
      AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> $1::vector
      LIMIT $3
    `;

    return {
      query,
      params: [vectorLiteral, repositoryId, topK],
    };
  }

  /**
   * Get the embedding service for direct use
   */
  getEmbeddingService(): EmbeddingService {
    return this.embeddingService;
  }
}
