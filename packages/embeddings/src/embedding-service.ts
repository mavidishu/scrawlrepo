import { OpenAIEmbeddings } from '@langchain/openai';
import { EMBEDDING_CONFIG } from '@scrawler/shared';
import type { EmbeddingOptions, EmbeddingResult } from './types';

export class EmbeddingService {
  private embeddings: OpenAIEmbeddings;
  private batchSize: number;

  constructor(options: EmbeddingOptions = {}) {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: options.apiKey || process.env.OPENAI_API_KEY,
      modelName: options.model || EMBEDDING_CONFIG.MODEL,
    });
    this.batchSize = options.batchSize || EMBEDDING_CONFIG.BATCH_SIZE;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<EmbeddingResult> {
    const embedding = await this.embeddings.embedQuery(text);
    return {
      text,
      embedding,
    };
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async embedBatch(
    texts: string[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const batches = this.createBatches(texts);

    let processed = 0;
    for (const batch of batches) {
      const embeddings = await this.embeddings.embedDocuments(batch);

      for (let i = 0; i < batch.length; i++) {
        results.push({
          text: batch[i],
          embedding: embeddings[i],
        });
      }

      processed += batch.length;
      onProgress?.(processed, texts.length);
    }

    return results;
  }

  /**
   * Generate embedding for a query (optimized for search)
   */
  async embedQuery(query: string): Promise<number[]> {
    return this.embeddings.embedQuery(query);
  }

  /**
   * Split texts into batches
   */
  private createBatches<T>(items: T[]): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    return batches;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
