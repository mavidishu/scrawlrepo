import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { McpController } from './mcp.controller';
import { McpEventsController } from './mcp.events.controller';
import { McpService } from './mcp.service';
import { RepoModule } from '../repo/repo.module';
import { AiModule } from '../ai/ai.module';
import { ApiKeyGuard } from '../../auth/api-key.guard';
import { McpEventService } from './mcp-event.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpEventEntity } from '../../entities/mcp-event.entity';

@Module({
  imports: [RepoModule, AiModule, ConfigModule, TypeOrmModule.forFeature([McpEventEntity])],
  controllers: [McpController, McpEventsController],
  providers: [
    McpService,
    McpEventService,
    ApiKeyGuard,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
  exports: [McpEventService],
})
export class McpModule {}