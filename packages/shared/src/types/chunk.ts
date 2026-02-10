export interface Chunk {
  id: string;
  fileId: string;
  content: string;
  startLine: number;
  endLine: number;
  embedding: number[] | null;
  metadata: ChunkMetadata;
  createdAt: Date;
}

export interface ChunkMetadata {
  language?: string;
  filePath?: string;
  functionName?: string;
  className?: string;
  imports?: string[];
  exports?: string[];
}

export interface ChunkWithScore extends Chunk {
  score: number;
  filePath: string;
}

export interface CreateChunkInput {
  fileId: string;
  content: string;
  startLine: number;
  endLine: number;
  metadata: ChunkMetadata;
}
