import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { RepositoryEntity } from '../../entities/repository.entity';
import { ChunkEntity } from '../../entities/chunk.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([RepositoryEntity, ChunkEntity]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
