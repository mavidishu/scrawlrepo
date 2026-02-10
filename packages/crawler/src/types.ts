export interface CrawlerOptions {
  token?: string;
  maxConcurrent?: number;
  maxFileSize?: number;
}

export interface RepositoryInfo {
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  size: number;
  isPrivate: boolean;
  updatedAt: string;
}

export interface FileTreeItem {
  path: string;
  type: 'file' | 'dir';
  size: number;
  sha: string;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
  sha: string;
  encoding: string;
}

export interface CrawlResult {
  repository: RepositoryInfo;
  files: FileTreeItem[];
  totalSize: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}
