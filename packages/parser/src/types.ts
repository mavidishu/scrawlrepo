export interface ParsedFile {
  path: string;
  language: string | null;
  content: string;
  size: number;
  lineCount: number;
  chunks: CodeChunk[];
}

export interface CodeChunk {
  content: string;
  startLine: number;
  endLine: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  language?: string;
  filePath?: string;
  type?: 'function' | 'class' | 'module' | 'block';
  name?: string;
  imports?: string[];
  exports?: string[];
}

export interface ChunkingOptions {
  targetSize?: number;
  maxSize?: number;
  minSize?: number;
  overlap?: number;
}
