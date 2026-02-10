export interface IndexingJobData {
  repositoryId: string;
  githubUrl: string;
  owner: string;
  name: string;
}

export interface IndexingJobResult {
  success: boolean;
  filesProcessed: number;
  chunksCreated: number;
  error?: string;
}

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

export interface JobInfo {
  id: string;
  name: string;
  status: JobStatus;
  progress: number;
  data: IndexingJobData;
  result?: IndexingJobResult;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  failedReason?: string;
}
