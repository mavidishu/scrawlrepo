import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IndexingService } from './indexing.service';
import { QUEUE_CONFIG } from '@scrawler/shared';
import type { IndexingJobData, IndexingJobResult } from '@scrawler/shared';
import { McpEventService } from '../mcp/mcp-event.service';

@Processor(QUEUE_CONFIG.INDEXING_QUEUE)
export class IndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(IndexingProcessor.name);

  constructor(
    private readonly indexingService: IndexingService,
    private readonly mcpEventService: McpEventService,
  ) {
    super();
  }

  async process(job: Job<IndexingJobData>): Promise<IndexingJobResult> {
    const { repositoryId, owner, name } = job.data;

    this.logger.log(`Starting indexing job for ${owner}/${name} (${repositoryId})`);

    try {
      let lastProgress = -1;
      const result = await this.indexingService.indexRepository(
        repositoryId,
        owner,
        name,
        async (progress) => {
          // Update job progress
          const progressPercent = Math.floor(
            (progress.current / progress.total) * 100
          );
          
          if (progressPercent !== lastProgress) {
            await job.updateProgress(progressPercent);
            lastProgress = progressPercent;
          }
          
          await job.log(`[${progress.stage}] ${progress.message}`);

          // Emit a progress event to MCP event log
          try {
            await this.mcpEventService.logEvent('indexing.progress', {
              repoId: repositoryId,
              jobId: String(job.id),
              payload: { percent: progressPercent, stage: progress.stage, message: progress.message },
            });
          } catch (err) {
            this.logger.warn(`Failed to log MCP progress event: ${err?.message || err}`);
          }
        }
      );


      this.logger.log(
        `Indexing complete for ${owner}/${name}: ${result.filesProcessed} files, ${result.chunksCreated} chunks`
      );

      // Emit completed event
      try {
        await this.mcpEventService.logEvent('indexing.completed', {
          repoId: repositoryId,
          jobId: String(job.id),
          payload: { result },
        });
      } catch (err) {
        this.logger.warn(`Failed to log MCP completed event: ${err?.message || err}`);
      }

      return {
        success: true,
        filesProcessed: result.filesProcessed,
        chunksCreated: result.chunksCreated,
      };
    } catch (error) {
      this.logger.error(`Indexing failed for ${owner}/${name}:`, error);

      // Emit failed event
      try {
        await this.mcpEventService.logEvent('indexing.failed', {
          repoId: job.data.repositoryId,
          jobId: String(job.id),
          payload: { error: error instanceof Error ? error.message : String(error) },
        });
      } catch (err) {
        this.logger.warn(`Failed to log MCP failed event: ${err?.message || err}`);
      }

      return {
        success: false,
        filesProcessed: 0,
        chunksCreated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<IndexingJobData>) {
    this.logger.log(`Job ${job.id} completed for ${job.data.owner}/${job.data.name}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<IndexingJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for ${job.data.owner}/${job.data.name}: ${error.message}`
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<IndexingJobData>, progress: number | object) {
    this.logger.debug(`Job ${job.id} progress: ${JSON.stringify(progress)}`);
  }
}
