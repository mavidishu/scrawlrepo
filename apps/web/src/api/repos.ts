import { apiClient } from './client';

export interface Repository {
  id: string;
  githubUrl: string;
  owner: string;
  name: string;
  defaultBranch: string;
  status: 'pending' | 'indexing' | 'ready' | 'failed';
  fileCount: number;
  indexedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryWithStats extends Repository {
  chunkCount: number;
  totalSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IndexingStatus {
  repositoryId: string;
  status: string;
  progress: number;
  fileCount: number;
  indexedAt: string | null;
}

export interface QueryResponse {
  answer: string;
  sources: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    content: string;
    score: number;
  }>;
  tokensUsed: number;
}

export const reposApi = {
  list: (page = 1, limit = 20) =>
    apiClient.get<PaginatedResponse<Repository>>(`/repos?page=${page}&limit=${limit}`),

  get: (id: string) => apiClient.get<RepositoryWithStats>(`/repos/${id}`),

  create: (githubUrl: string) =>
    apiClient.post<Repository>('/repos', { githubUrl }),

  delete: (id: string) => apiClient.delete<void>(`/repos/${id}`),

  getStatus: (id: string) => apiClient.get<IndexingStatus>(`/repos/${id}/status`),

  reindex: (id: string) => apiClient.post<void>(`/repos/${id}/reindex`),

  query: (id: string, question: string, maxChunks = 10) =>
    apiClient.post<QueryResponse>(`/repos/${id}/query`, { question, maxChunks }),
};
