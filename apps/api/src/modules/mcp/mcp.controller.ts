import { Controller, Post, Body, Get, Param, Delete, UseInterceptors, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { McpService } from './mcp.service';
import { IndexRepoDto } from './dto/index-repo.dto';
import { QueryDto } from './dto/query.dto';
import { RateLimiterInterceptor } from '../../common/rate-limiter.interceptor';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

// Security fix: Apply ApiKeyGuard to enforce API key authentication on all MCP endpoints.
// Without this guard, endpoints like repos.index, repos.list, repos/:id/query, and
// repos/:id (DELETE) were unauthenticated, allowing any user to perform destructive
// or resource-intensive actions (indexing, querying, deletion).
@Controller('mcp/v1')
@UseGuards(ApiKeyGuard)
@UseInterceptors(RateLimiterInterceptor)
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Post('repos.index')
  async indexRepo(@Body() body: IndexRepoDto) {
    const repo = await this.mcpService.indexRepo(body);
    return {
      request_id: '',
      job_id: repo.jobId,
      repo_id: repo.id,
      status: repo.status,
    };
  }

  @Get('repos.list')
  async list() {
    const items = await this.mcpService.listRepos();
    return { request_id: '', repos: items };
  }

  @Get('repos/:id/status')
  async status(@Param('id') id: string) {
    const s = await this.mcpService.getStatus(id);
    return { request_id: '', ...s };
  }

  @Post('repos/:id/query')
  async query(@Param('id') id: string, @Body() body: QueryDto) {
    const res = await this.mcpService.query(id, body.query, body.options?.top_k);
    return {
      request_id: '',
      answer: res.answer,
      sources: res.sources,
      raw_completion: null,
    };
  }

  @Post('repos/:id.reindex')
  async reindex(@Param('id') id: string) {
    const jobId = await this.mcpService.reindex(id);
    return { request_id: '', job_id: jobId, status: 'queued' };
  }

  @Delete('repos/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.mcpService.remove(id);
    return { request_id: '', deleted: true };
  }
}
