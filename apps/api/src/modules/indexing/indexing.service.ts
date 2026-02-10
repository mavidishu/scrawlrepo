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

      // Step 3: Parse files and create chunks
      onProgress?.({
        stage: 'parsing',
        current: 0,
        total: fileContents.length,
        message: 'Parsing files...',
      });

      const allChunks: Array<{
        fileId: string;
        content: string;
        startLine: number;
        endLine: number;
        metadata: Record<string, unknown>;
      }> = [];

      // Use a transaction for file and chunk creation
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        for (let i = 0; i < fileContents.length; i++) {
          const fileContent = fileContents[i];
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
            allChunks.push({
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

          onProgress?.({
            stage: 'parsing',
            current: i + 1,
            total: fileContents.length,
            message: `Parsing: ${fileContent.path}`,
          });
        }

        // Update file count
        await queryRunner.manager.update(RepositoryEntity, repositoryId, {
          fileCount: fileContents.length,
        });

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

      this.logger.log(`Created ${allChunks.length} chunks`);

      // Step 4: Generate embeddings in batches
      onProgress?.({
        stage: 'embedding',
        current: 0,
        total: allChunks.length,
        message: 'Generating embeddings...',
      });

      const chunkTexts = allChunks.map((c) => c.content);
      const embeddings = await embeddingService.embedBatch(
        chunkTexts,
        (processed:number , total:number) => {
          onProgress?.({
            stage: 'embedding',
            current: processed,
            total,
            message: `Generating embeddings: ${processed}/${total}`,
          });
        }
      );

      // Step 5: Store chunks with embeddings
      onProgress?.({
        stage: 'storing',
        current: 0,
        total: allChunks.length,
        message: 'Storing chunks...',
      });

      const batchSize = 100;
      for (let i = 0; i < allChunks.length; i += batchSize) {
        const batch = allChunks.slice(i, i + batchSize);
        const batchEmbeddings = embeddings.slice(i, i + batchSize);

        // Use raw query to insert with vector type
        const values = batch.map((chunk, idx) => {
          const embedding = batchEmbeddings[idx].embedding;
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

        onProgress?.({
          stage: 'storing',
          current: Math.min(i + batchSize, allChunks.length),
          total: allChunks.length,
          message: `Storing chunks: ${Math.min(i + batchSize, allChunks.length)}/${allChunks.length}`,
        });
      }

      // Update status to ready
      await this.repoRepository.update(repositoryId, {
        status: 'ready',
        indexedAt: new Date(),
      });

      this.logger.log(`Indexing complete for ${owner}/${name}`);

      return {
        filesProcessed: fileContents.length,
        chunksCreated: allChunks.length,
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
