import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RepositoryEntity, RepositoryStatus } from '../../entities/repository.entity';
import { FileEntity } from '../../entities/file.entity';
import { ChunkEntity } from '../../entities/chunk.entity';
import { CreateRepoDto, PaginationDto } from '../../dto';
import { parseGitHubUrl, normalizeGitHubUrl, QUEUE_CONFIG } from '@scrawler/shared';

@Injectable()
export class RepoService {
  constructor(
    @InjectRepository(RepositoryEntity)
    private readonly repoRepository: Repository<RepositoryEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(ChunkEntity)
    private readonly chunkRepository: Repository<ChunkEntity>,
    @InjectQueue(QUEUE_CONFIG.INDEXING_QUEUE)
    private readonly indexingQueue: Queue
  ) {}

  async create(createRepoDto: CreateRepoDto): Promise<RepositoryEntity> {
    const normalizedUrl = normalizeGitHubUrl(createRepoDto.githubUrl);
    const { owner, repo, isValid } = parseGitHubUrl(normalizedUrl);

    if (!isValid) {
      throw new ConflictException('Invalid GitHub URL');
    }

    // Check if repository already exists
    const existing = await this.repoRepository.findOne({
      where: { githubUrl: normalizedUrl },
    });

    if (existing) {
      throw new ConflictException('Repository already exists');
    }

    // Create repository record
    const repository = this.repoRepository.create({
      githubUrl: normalizedUrl,
      owner,
      name: repo,
      status: 'pending',
    });

    const saved = await this.repoRepository.save(repository);

    // Queue indexing job
    const job = await this.indexingQueue.add(
      'index-repository',
      {
        repositoryId: saved.id,
        githubUrl: normalizedUrl,
        owner,
        name: repo,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    // Save job ID
    await this.repoRepository.update(saved.id, { jobId: job.id });

    return { ...saved, jobId: job.id } as RepositoryEntity;
  }


  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [repositories, total] = await this.repoRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items: repositories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<RepositoryEntity> {
    const repository = await this.repoRepository.findOne({
      where: { id },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    return repository;
  }

  async findOneWithStats(id: string) {
    const repository = await this.findOne(id);

    // Get chunk count
    const chunkCount = await this.chunkRepository
      .createQueryBuilder('chunk')
      .innerJoin('chunk.file', 'file')
      .where('file.repositoryId = :id', { id })
      .getCount();

    // Get total size
    const sizeResult = await this.fileRepository
      .createQueryBuilder('file')
      .select('SUM(file.size)', 'totalSize')
      .where('file.repositoryId = :id', { id })
      .getRawOne();

    return {
      ...repository,
      chunkCount,
      totalSize: parseInt(sizeResult?.totalSize || '0', 10),
    };
  }

  async remove(id: string): Promise<void> {
    const repository = await this.findOne(id);
    await this.repoRepository.remove(repository);
  }

  async updateStatus(id: string, status: RepositoryStatus): Promise<void> {
    await this.repoRepository.update(id, {
      status,
      ...(status === 'ready' ? { indexedAt: new Date() } : {}),
    });
  }

  async updateFileCount(id: string, fileCount: number): Promise<void> {
    await this.repoRepository.update(id, { fileCount });
  }

  async getStatus(id: string) {
    const repository = await this.findOne(id);

    // Get job status from queue directly if jobId exists
    let jobProgress = 0;
    if (repository.jobId) {
      const job = await this.indexingQueue.getJob(repository.jobId);
      const progress = job?.progress;
      if (typeof progress === 'number') {
        jobProgress = progress;
      } else if (typeof progress === 'object' && progress !== null) {
        // Handle object progress if needed, though we usually store a percentage number
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jobProgress = (progress as any).percentage ?? 0;
      }
    }


    return {
      repositoryId: id,
      status: repository.status,
      progress: repository.status === 'ready' ? 100 : jobProgress,
      fileCount: repository.fileCount,
      indexedAt: repository.indexedAt,
    };
  }


  async triggerReindex(id: string): Promise<void> {
    const repository = await this.findOne(id);

    // Delete existing files and chunks
    await this.fileRepository.delete({ repositoryId: id });

    // Update status and reset
    await this.repoRepository.update(id, {
      status: 'pending',
      fileCount: 0,
      indexedAt: null,
    });

    // Queue new indexing job
    const job = await this.indexingQueue.add(
      'index-repository',
      {
        repositoryId: id,
        githubUrl: repository.githubUrl,
        owner: repository.owner,
        name: repository.name,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    // Save job ID
    await this.repoRepository.update(id, { jobId: job.id });
  }

}
