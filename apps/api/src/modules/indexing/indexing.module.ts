import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { IndexingService } from './indexing.service';
import { IndexingProcessor } from './indexing.processor';
import { RepositoryEntity } from '../../entities/repository.entity';
import { FileEntity } from '../../entities/file.entity';
import { ChunkEntity } from '../../entities/chunk.entity';
import { QUEUE_CONFIG } from '@scrawler/shared';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([RepositoryEntity, FileEntity, ChunkEntity]),
    BullModule.registerQueue({
      name: QUEUE_CONFIG.INDEXING_QUEUE,
    }),
  ],
  providers: [IndexingService, IndexingProcessor],
  exports: [IndexingService],
})
export class IndexingModule {}
