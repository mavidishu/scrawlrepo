import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RepositoryEntity } from '../../entities/repository.entity';
import { ChunkEntity } from '../../entities/chunk.entity';
import { EmbeddingService } from '@scrawler/embeddings';
import { LLM_CONFIG } from '@scrawler/shared';

export interface QueryResult {
  answer: string;
  sources: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    content: string;
    score: number;
  }>;
  tokensUsed: number;
}

export interface ChunkSearchResult {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
  filePath: string;
  score: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly llm: ChatOpenAI;
  private readonly embeddingService: EmbeddingService;

  constructor(
    @InjectRepository(RepositoryEntity)
    private readonly repoRepository: Repository<RepositoryEntity>,
    @InjectRepository(ChunkEntity)
    private readonly chunkRepository: Repository<ChunkEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService
  ) {
    const openAiKey = this.configService.get<string>('OPENAI_API_KEY');
    const llmModel = this.configService.get<string>('OPENAI_MODEL') || LLM_CONFIG.MODEL;

    this.llm = new ChatOpenAI({
      openAIApiKey: openAiKey,
      modelName: llmModel,
      temperature: LLM_CONFIG.TEMPERATURE,
      modelKwargs: {
        max_completion_tokens: LLM_CONFIG.MAX_TOKENS,
      },
    });

    this.embeddingService = new EmbeddingService({ apiKey: openAiKey });
  }

  async query(
    repositoryId: string,
    question: string,
    maxChunks: number = LLM_CONFIG.TOP_K_CHUNKS
  ): Promise<QueryResult> {
    // Verify repository exists and is ready
    const repository = await this.repoRepository.findOne({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    if (repository.status !== 'ready') {
      throw new BadRequestException(
        `Repository is not ready for queries. Current status: ${repository.status}`
      );
    }

    // Step 1: Generate query embedding
    this.logger.debug(`Generating embedding for query: "${question}"`);
    const queryEmbedding = await this.embeddingService.embedQuery(question);

    // Step 2: Search for similar chunks using pgvector
    const chunks = await this.searchChunks(repositoryId, queryEmbedding, maxChunks);

    if (chunks.length === 0) {
      return {
        answer: 'I could not find any relevant code in this repository to answer your question.',
        sources: [],
        tokensUsed: 0,
      };
    }

    // Step 3: Build context from chunks
    const context = this.buildContext(chunks);

    // Step 4: Generate answer using LLM
    const { answer, tokensUsed } = await this.generateAnswer(
      repository.name,
      repository.owner,
      question,
      context
    );

    // Step 5: Return answer with sources
    return {
      answer,
      sources: chunks.map((chunk) => ({
        filePath: chunk.filePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        content: chunk.content.slice(0, 200) + (chunk.content.length > 200 ? '...' : ''),
        score: chunk.score,
      })),
      tokensUsed,
    };
  }

  private async searchChunks(
    repositoryId: string,
    embedding: number[],
    limit: number
  ): Promise<ChunkSearchResult[]> {
    const vectorStr = `[${embedding.join(',')}]`;

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

    const results = await this.dataSource.query(query, [vectorStr, repositoryId, limit]);

    return results.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      content: row.content as string,
      startLine: row.startLine as number,
      endLine: row.endLine as number,
      filePath: row.filePath as string,
      score: parseFloat(row.score as string),
      metadata: row.metadata as Record<string, unknown>,
    }));
  }

  private buildContext(chunks: ChunkSearchResult[]): string {
    return chunks
      .map((chunk) => {
        return `--- File: ${chunk.filePath} (lines ${chunk.startLine}-${chunk.endLine}) ---\n${chunk.content}`;
      })
      .join('\n\n');
  }

  private async generateAnswer(
    repoName: string,
    repoOwner: string,
    question: string,
    context: string
  ): Promise<{ answer: string; tokensUsed: number }> {
    const systemPrompt = `You are a helpful code assistant analyzing the GitHub repository "${repoOwner}/${repoName}".

Your role is to:
1. Answer questions based ONLY on the provided code context
2. Be specific and reference file paths and line numbers when relevant
3. If the answer isn't in the provided context, say so clearly
4. Provide code examples when helpful
5. Be concise but thorough

Important: Only use information from the provided code context. Do not make assumptions about code that isn't shown.`;

    const userPrompt = `Here is the relevant code context from the repository:

${context}

---

Question: ${question}

Please provide a clear, helpful answer based on the code context above.`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      const answer = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

      // Estimate tokens (rough approximation)
      const tokensUsed = Math.ceil((systemPrompt.length + userPrompt.length + answer.length) / 4);

      return { answer, tokensUsed };
    } catch (error) {
      this.logger.error('Error generating answer:', error);
      throw new Error('Failed to generate answer from LLM');
    }
  }
}
