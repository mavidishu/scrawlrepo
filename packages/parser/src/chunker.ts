import { CHUNK_CONFIG } from '@scrawler/shared';
import type { CodeChunk, ChunkingOptions } from './types';

export class Chunker {
  private targetSize: number;
  private maxSize: number;
  private minSize: number;
  private overlap: number;

  constructor(options: ChunkingOptions = {}) {
    this.targetSize = options.targetSize ?? CHUNK_CONFIG.TARGET_CHUNK_SIZE;
    this.maxSize = options.maxSize ?? CHUNK_CONFIG.MAX_CHUNK_SIZE;
    this.minSize = options.minSize ?? CHUNK_CONFIG.MIN_CHUNK_SIZE;
    this.overlap = options.overlap ?? CHUNK_CONFIG.CHUNK_OVERLAP;
  }

  /**
   * Chunk code content into smaller pieces
   */
  chunk(
    content: string,
    filePath: string,
    language: string | null
  ): CodeChunk[] {
    const lines = content.split('\n');

    // For small files, return as single chunk
    if (content.length <= this.maxSize) {
      return [
        {
          content,
          startLine: 1,
          endLine: lines.length,
          metadata: {
            filePath,
            language: language ?? undefined,
            type: 'module',
          },
        },
      ];
    }

    // Try language-aware chunking first
    const semanticChunks = this.chunkBySemanticBoundaries(lines, language);
    if (semanticChunks.length > 0) {
      return this.addMetadata(semanticChunks, filePath, language);
    }

    // Fall back to character-based chunking
    return this.chunkBySize(lines, filePath, language);
  }

  /**
   * Chunk by semantic boundaries (functions, classes, etc.)
   */
  private chunkBySemanticBoundaries(
    lines: string[],
    language: string | null
  ): Array<{ content: string; startLine: number; endLine: number }> {
    const chunks: Array<{ content: string; startLine: number; endLine: number }> = [];
    const boundaryPatterns = this.getBoundaryPatterns(language);

    if (boundaryPatterns.length === 0) {
      return [];
    }

    let currentChunk: string[] = [];
    let currentStartLine = 1;
    let inBlock = false;
    let blockDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for function/class boundaries
      const isNewBoundary = boundaryPatterns.some((p) => p.test(line));

      if (isNewBoundary && !inBlock && currentChunk.length > 0) {
        // Save current chunk if it meets minimum size
        const chunkContent = currentChunk.join('\n');
        if (chunkContent.length >= this.minSize) {
          chunks.push({
            content: chunkContent,
            startLine: currentStartLine,
            endLine: lineNum - 1,
          });
        }
        currentChunk = [];
        currentStartLine = lineNum;
      }

      currentChunk.push(line);

      // Track block depth for languages with braces
      if (language && ['typescript', 'javascript', 'java', 'csharp', 'go', 'rust', 'cpp', 'c'].includes(language)) {
        blockDepth += (line.match(/{/g) || []).length;
        blockDepth -= (line.match(/}/g) || []).length;
        inBlock = blockDepth > 0;
      }

      // If current chunk is too large, force a split
      const chunkSize = currentChunk.join('\n').length;
      if (chunkSize >= this.maxSize && !inBlock) {
        chunks.push({
          content: currentChunk.join('\n'),
          startLine: currentStartLine,
          endLine: lineNum,
        });
        currentChunk = [];
        currentStartLine = lineNum + 1;
      }
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join('\n');
      if (chunkContent.length >= this.minSize) {
        chunks.push({
          content: chunkContent,
          startLine: currentStartLine,
          endLine: lines.length,
        });
      }
    }

    return chunks;
  }

  /**
   * Chunk by size with line boundaries
   */
  private chunkBySize(
    lines: string[],
    filePath: string,
    language: string | null
  ): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;
    let startLine = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineSize = line.length + 1; // +1 for newline

      if (currentSize + lineSize > this.targetSize && currentChunk.length > 0) {
        // Create chunk
        chunks.push({
          content: currentChunk.join('\n'),
          startLine,
          endLine: i,
          metadata: {
            filePath,
            language: language ?? undefined,
            type: 'block',
          },
        });

        // Start new chunk with overlap
        const overlapLines = this.getOverlapLines(currentChunk);
        currentChunk = [...overlapLines, line];
        currentSize = currentChunk.join('\n').length;
        startLine = i - overlapLines.length + 1;
      } else {
        currentChunk.push(line);
        currentSize += lineSize;
      }
    }

    // Add remaining content
    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join('\n'),
        startLine,
        endLine: lines.length,
        metadata: {
          filePath,
          language: language ?? undefined,
          type: 'block',
        },
      });
    }

    return chunks;
  }

  /**
   * Get overlap lines from the end of a chunk
   */
  private getOverlapLines(lines: string[]): string[] {
    const overlapLines: string[] = [];
    let overlapSize = 0;

    for (let i = lines.length - 1; i >= 0 && overlapSize < this.overlap; i--) {
      overlapLines.unshift(lines[i]);
      overlapSize += lines[i].length + 1;
    }

    return overlapLines;
  }

  /**
   * Add metadata to chunks
   */
  private addMetadata(
    chunks: Array<{ content: string; startLine: number; endLine: number }>,
    filePath: string,
    language: string | null
  ): CodeChunk[] {
    return chunks.map((chunk) => ({
      ...chunk,
      metadata: {
        filePath,
        language: language ?? undefined,
        type: this.detectChunkType(chunk.content, language),
        name: this.extractName(chunk.content, language),
      },
    }));
  }

  /**
   * Detect the type of a chunk (function, class, etc.)
   */
  private detectChunkType(
    content: string,
    language: string | null
  ): 'function' | 'class' | 'module' | 'block' {
    if (!language) return 'block';

    const firstLine = content.split('\n')[0];

    // Check for class
    if (/\bclass\s+\w+/.test(firstLine)) {
      return 'class';
    }

    // Check for function patterns
    const functionPatterns: Record<string, RegExp> = {
      typescript: /^(?:export\s+)?(?:async\s+)?(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(|(?:public|private|protected)?\s*(?:async\s*)?\w+\s*\()/,
      javascript: /^(?:export\s+)?(?:async\s+)?(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\()/,
      python: /^(?:async\s+)?def\s+\w+/,
      go: /^func\s+/,
      rust: /^(?:pub\s+)?(?:async\s+)?fn\s+/,
      java: /^(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)+\w+\s*\(/,
    };

    const pattern = functionPatterns[language];
    if (pattern && pattern.test(firstLine)) {
      return 'function';
    }

    return 'block';
  }

  /**
   * Extract the name of a function or class from code
   */
  private extractName(content: string, language: string | null): string | undefined {
    if (!language) return undefined;

    const firstLine = content.split('\n')[0];

    // Extract class name
    const classMatch = firstLine.match(/class\s+(\w+)/);
    if (classMatch) return classMatch[1];

    // Extract function name based on language
    const patterns: Record<string, RegExp> = {
      typescript: /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=|(\w+)\s*\()/,
      javascript: /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=)/,
      python: /def\s+(\w+)/,
      go: /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/,
      rust: /fn\s+(\w+)/,
    };

    const pattern = patterns[language];
    if (pattern) {
      const match = firstLine.match(pattern);
      if (match) {
        return match[1] || match[2] || match[3];
      }
    }

    return undefined;
  }

  /**
   * Get boundary patterns for semantic chunking based on language
   */
  private getBoundaryPatterns(language: string | null): RegExp[] {
    if (!language) return [];

    const patterns: Record<string, RegExp[]> = {
      typescript: [
        /^(?:export\s+)?(?:async\s+)?function\s+\w+/,
        /^(?:export\s+)?class\s+\w+/,
        /^(?:export\s+)?interface\s+\w+/,
        /^(?:export\s+)?type\s+\w+/,
        /^(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(/,
      ],
      javascript: [
        /^(?:export\s+)?(?:async\s+)?function\s+\w+/,
        /^(?:export\s+)?class\s+\w+/,
        /^(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(/,
      ],
      python: [
        /^class\s+\w+/,
        /^(?:async\s+)?def\s+\w+/,
      ],
      go: [
        /^func\s+/,
        /^type\s+\w+\s+struct/,
        /^type\s+\w+\s+interface/,
      ],
      rust: [
        /^(?:pub\s+)?(?:async\s+)?fn\s+/,
        /^(?:pub\s+)?struct\s+/,
        /^(?:pub\s+)?enum\s+/,
        /^(?:pub\s+)?trait\s+/,
        /^impl\s+/,
      ],
      java: [
        /^(?:public|private|protected)?\s*class\s+\w+/,
        /^(?:public|private|protected)?\s*interface\s+\w+/,
        /^(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)+\w+\s*\(/,
      ],
    };

    return patterns[language] || [];
  }
}
