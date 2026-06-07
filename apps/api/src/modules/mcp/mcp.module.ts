import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { RepoModule } from '../repo/repo.module';
import { AiModule } from '../ai/ai.module';
import { ApiKeyGuard } from '../../auth/api-key.guard';

@Module({
  imports: [RepoModule, AiModule, ConfigModule],
  controllers: [McpController],
  providers: [
    McpService,
    ApiKeyGuard,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class McpModule {}