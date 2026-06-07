import { Injectable } from '@nestjs/common';
import { RepoService } from '../repo/repo.service';
import { AiService } from '../ai/ai.service';
import { IndexRepoDto } from './dto/index-repo.dto';

@Injectable()
export class McpService {
  constructor(private readonly repoService: RepoService, private readonly aiService: AiService) {}

  async indexRepo(dto: IndexRepoDto) {
    // Translate MCP DTO to internal CreateRepoDto
    const createDto = { githubUrl: dto.repo_url };
    const repo = await this.repoService.create(createDto as any);
    return repo;
  }

  async listRepos() {
    const result = await this.repoService.findAll({ page: 1, limit: 100 });
    return result.items.map((r) => ({ id: r.id, url: r.githubUrl, status: r.status, created_at: r.createdAt }));
  }

  async getStatus(id: string) {
    return this.repoService.getStatus(id);
  }

  async query(repositoryId: string, question: string, topK?: number) {
    return this.aiService.query(repositoryId, question, topK);
  }

  async reindex(id: string) {
    await this.repoService.triggerReindex(id);
    // repoService.triggerReindex sets jobId on repo; return a generic queued id
    const repo = await this.repoService.findOne(id);
    return repo.jobId;
  }

  async remove(id: string) {
    await this.repoService.remove(id);
  }
}
