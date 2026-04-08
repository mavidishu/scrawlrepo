import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RepositoryEntity } from '../../entities/repository.entity';
import { FileEntity } from '../../entities/file.entity';
import { ChunkEntity } from '../../entities/chunk.entity';
import { GitHubCrawler } from '@scrawler/crawler';
import { CodeParser } from '@scrawler/parser';
import { EmbeddingService } from '@scrawler/embeddings';
import { EMBEDDING_CONFIG } from '@scrawler/shared';

export interface IndexingProgress {
  stage: 'crawling' | 'parsing' | 'embedding' | 'storing';
  current: number;
  total: number;
  message: string;
}

@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);

  constructor(
    @InjectRepository(RepositoryEntity)
    private readonly repoRepository: Repository<RepositoryEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(ChunkEntity)
    private readonly chunkRepository: Repository<ChunkEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService
  ) {}

  async indexRepository(
    repositoryId: string,
    owner: string,
    name: string,
    onProgress?: (progress: IndexingProgress) => void
  ): Promise<{ filesProcessed: number; chunksCreated: number }> {
    const githubToken = this.configService.get<string>('GITHUB_TOKEN');
    const openAiKey = this.configService.get<string>('OPENAI_API_KEY');

    // Initialize services
    const crawler = new GitHubCrawler({ token: githubToken });
    const parser = new CodeParser();
    const embeddingService = new EmbeddingService({ apiKey: openAiKey });

    try {
      // Update status to indexing
      await this.repoRepository.update(repositoryId, { status: 'indexing' });

      // Step 1: Crawl repository
      this.logger.log(`Crawling repository: ${owner}/${name}`);
      onProgress?.({
        stage: 'crawling',
        current: 0,
        total: 100,
        message: 'Fetching repository structure...',
      });

      const crawlResult = await crawler.crawlRepository(owner, name);
      const { files: fileTree, repository: repoInfo } = crawlResult;

      // Update default branch
      await this.repoRepository.update(repositoryId, {
        defaultBranch: repoInfo.defaultBranch,
      });

      this.logger.log(`Found ${fileTree.length} code files`);
      onProgress?.({
        stage: 'crawling',
        current: 50,
        total: 100,
        message: `Found ${fileTree.length} code files`,
      });

      // Step 2: Fetch file contents
      const filePaths = fileTree.map((f: { path:string }) => f.path);
      const fileContents = await crawler.getFilesContent(
        owner,
        name,
        filePaths,
        repoInfo.defaultBranch,
        (processed: number, total: number) => {
          onProgress?.({
            stage: 'crawling',
            current: 50 + Math.floor((processed / total) * 50),
            total: 100,
            message: `Fetching files: ${processed}/${total}`,
          });
        }
      );

      this.logger.log(`Fetched ${fileContents.length} file contents`);

      // Step 3: Parse files, create chunks, generate embeddings, and store in batches
      this.logger.log(`Processing ${fileContents.length} files...`);
      
      let totalFilesProcessed = 0;
      let totalChunksCreated = 0;
      const fileBatchSize = 20; // Process 20 files at a time to keep transactions short

      for (let i = 0; i < fileContents.length; i += fileBatchSize) {
        const fileBatch = fileContents.slice(i, i + fileBatchSize);
        const batchChunks: Array<{
          fileId: string;
          content: string;
          startLine: number;
          endLine: number;
          metadata: Record<string, unknown>;
        }> = [];

        // Transaction for this batch of files
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          for (const fileContent of fileBatch) {
            const parsed = parser.parse(fileContent.path, fileContent.content);

            // Create file record
            const fileEntity = queryRunner.manager.create(FileEntity, {
              repositoryId,
              path: fileContent.path,
              language: parsed.language,
              size: fileContent.size,
              sha: fileContent.sha,
            });

            const savedFile = await queryRunner.manager.save(fileEntity);

            // Prepare chunks for this file
            for (const chunk of parsed.chunks) {
              batchChunks.push({
                fileId: savedFile.id,
                content: chunk.content,
                startLine: chunk.startLine,
                endLine: chunk.endLine,
                metadata: {
                  ...chunk.metadata,
                  filePath: fileContent.path,
                },
              });
            }
          }

          await queryRunner.commitTransaction();
          totalFilesProcessed += fileBatch.length;
          
          // Update file count in repository incrementally
          await this.repoRepository.update(repositoryId, {
            fileCount: totalFilesProcessed,
          });

        } catch (error) {
          await queryRunner.rollbackTransaction();
          this.logger.error(`Failed to process file batch starting at index ${i}:`, error);
          throw error;
        } finally {
          await queryRunner.release();
        }

        // Process chunks for this batch of files
        if (batchChunks.length > 0) {
          onProgress?.({
            stage: 'embedding',
            current: i,
            total: fileContents.length,
            message: `Generating embeddings for batch ${Math.floor(i / fileBatchSize) + 1}...`,
          });

          const chunkTexts = batchChunks.map((c) => c.content);
          const embeddings = await embeddingService.embedBatch(chunkTexts);

          // Store chunks with embeddings in batches
          const storeBatchSize = 50;
          for (let j = 0; j < batchChunks.length; j += storeBatchSize) {
            const chunkBatch = batchChunks.slice(j, j + storeBatchSize);
            const embeddingBatch = embeddings.slice(j, j + storeBatchSize);

            const values = chunkBatch.map((chunk, idx) => {
              const embedding = embeddingBatch[idx].embedding;
              const vectorStr = `[${embedding.join(',')}]`;
              return {
                fileId: chunk.fileId,
                content: chunk.content,
                startLine: chunk.startLine,
                endLine: chunk.endLine,
                embedding: vectorStr,
                metadata: chunk.metadata,
              };
            });

            await this.insertChunksWithEmbeddings(values);
          }
          
          totalChunksCreated += batchChunks.length;
        }

        onProgress?.({
          stage: 'parsing',
          current: Math.min(i + fileBatchSize, fileContents.length),
          total: fileContents.length,
          message: `Processed ${Math.min(i + fileBatchSize, fileContents.length)}/${fileContents.length} files`,
        });
      }

      // Update status to ready
      await this.repoRepository.update(repositoryId, {
        status: 'ready',
        indexedAt: new Date(),
      });

      this.logger.log(`Indexing complete for ${owner}/${name}: ${totalFilesProcessed} files, ${totalChunksCreated} chunks`);

      return {
        filesProcessed: totalFilesProcessed,
        chunksCreated: totalChunksCreated,
      };

    } catch (error) {
      this.logger.error(`Indexing failed for ${owner}/${name}:`, error);

      // Update status to failed
      await this.repoRepository.update(repositoryId, { status: 'failed' });

      throw error;
    } finally {
      crawler.stop();
    }
  }

  private async insertChunksWithEmbeddings(
    chunks: Array<{
      fileId: string;
      content: string;
      startLine: number;
      endLine: number;
      embedding: string;
      metadata: Record<string, unknown>;
    }>
  ): Promise<void> {
    // Use parameterized query for safety
    const values = chunks
      .map(
        (_, i) =>
          `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}::vector, $${i * 6 + 6}::jsonb)`
      )
      .join(', ');

    const params = chunks.flatMap((c) => [
      c.fileId,
      c.content,
      c.startLine,
      c.endLine,
      c.embedding,
      JSON.stringify(c.metadata),
    ]);

    const query = `
      INSERT INTO chunks (file_id, content, start_line, end_line, embedding, metadata)
      VALUES ${values}
    `;

    await this.dataSource.query(query, params);
  }
}
