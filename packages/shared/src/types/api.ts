export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryRequest {
  question: string;
  maxChunks?: number;
}

export interface QueryResponse {
  answer: string;
  sources: QuerySource[];
  tokensUsed: number;
}

export interface QuerySource {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
}

export interface IndexingStatus {
  repositoryId: string;
  status: 'pending' | 'crawling' | 'parsing' | 'embedding' | 'completed' | 'failed';
  progress: number;
  totalFiles: number;
  processedFiles: number;
  error?: string;
}
