export interface EmbeddingOptions {
  model?: string;
  batchSize?: number;
  apiKey?: string;
}

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  tokenCount?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface ChunkWithEmbedding {
  id: string;
  content: string;
  embedding: number[];
  startLine: number;
  endLine: number;
  metadata: Record<string, unknown>;
}
