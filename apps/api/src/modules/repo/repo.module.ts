import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { RepoController } from './repo.controller';
import { RepoService } from './repo.service';
import { RepositoryEntity } from '../../entities/repository.entity';
import { FileEntity } from '../../entities/file.entity';
import { ChunkEntity } from '../../entities/chunk.entity';
import { QUEUE_CONFIG } from '@scrawler/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([RepositoryEntity, FileEntity, ChunkEntity]),
    BullModule.registerQueue({
      name: QUEUE_CONFIG.INDEXING_QUEUE,
    }),
  ],
  controllers: [RepoController],
  providers: [RepoService],
  exports: [RepoService],
})
export class RepoModule {}
