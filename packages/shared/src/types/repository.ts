export type RepositoryStatus = 'pending' | 'indexing' | 'ready' | 'failed';

export interface Repository {
  id: string;
  githubUrl: string;
  owner: string;
  name: string;
  defaultBranch: string;
  status: RepositoryStatus;
  fileCount: number;
  indexedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepositoryWithStats extends Repository {
  chunkCount: number;
  totalSize: number;
}

export interface CreateRepositoryInput {
  githubUrl: string;
}

export interface RepositoryListResponse {
  repositories: Repository[];
  total: number;
}
