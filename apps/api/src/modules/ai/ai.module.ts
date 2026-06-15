import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { RepositoryEntity } from '../../entities/repository.entity';
import { ChunkEntity } from '../../entities/chunk.entity';
import { ChatModule } from '../chat.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([RepositoryEntity, ChunkEntity]),
    ChatModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
