import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IndexingService } from './indexing.service';
import { QUEUE_CONFIG } from '@scrawler/shared';
import type { IndexingJobData, IndexingJobResult } from '@scrawler/shared';

@Processor(QUEUE_CONFIG.INDEXING_QUEUE)
export class IndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(IndexingProcessor.name);

  constructor(private readonly indexingService: IndexingService) {
    super();
  }

  async process(job: Job<IndexingJobData>): Promise<IndexingJobResult> {
    const { repositoryId, owner, name } = job.data;

    this.logger.log(`Starting indexing job for ${owner}/${name} (${repositoryId})`);

    try {
      const result = await this.indexingService.indexRepository(
        repositoryId,
        owner,
        name,
        async (progress) => {
          // Update job progress
          const progressPercent = Math.floor(
            (progress.current / progress.total) * 100
          );
          await job.updateProgress(progressPercent);
          await job.log(`[${progress.stage}] ${progress.message}`);
        }
      );

      this.logger.log(
        `Indexing complete for ${owner}/${name}: ${result.filesProcessed} files, ${result.chunksCreated} chunks`
      );

      return {
        success: true,
        filesProcessed: result.filesProcessed,
        chunksCreated: result.chunksCreated,
      };
    } catch (error) {
      this.logger.error(`Indexing failed for ${owner}/${name}:`, error);

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
