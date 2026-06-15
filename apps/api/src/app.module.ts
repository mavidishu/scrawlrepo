import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { HealthModule } from './modules/health/health.module';
import { RepoModule } from './modules/repo/repo.module';
import { IndexingModule } from './modules/indexing/indexing.module';
import { AiModule } from './modules/ai/ai.module';
import { McpModule } from './modules/mcp/mcp.module';
import { ChatModule } from './modules/chat.module';

import { RepositoryEntity } from './entities/repository.entity';
import { FileEntity } from './entities/file.entity';
import { ChunkEntity } from './entities/chunk.entity';
import { McpEventEntity } from './entities/mcp-event.entity';
import { ChatSessionEntity } from './entities/chat-session.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';

import * as path from 'path';


// Resolve to monorepo root
const rootDir = path.resolve(__dirname,'..','..','..');

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.join(rootDir, '.env.local'),
        path.join(rootDir, '.env'),
        '.env.local',
        '.env',
      ],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [RepositoryEntity, FileEntity, ChunkEntity, McpEventEntity, ChatSessionEntity, ChatMessageEntity],
        synchronize: false, // Use migrations in production
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),

    // Queue (BullMQ)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL'),
        },
      }),
    }),

    // Feature modules
    HealthModule,
    RepoModule,
    IndexingModule,
    AiModule,
    McpModule,
    ChatModule,
  ],
})
export class AppModule {}
