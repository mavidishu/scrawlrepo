import { LanguageDetector } from './language-detector';
import { Chunker } from './chunker';
import type { ParsedFile, ChunkingOptions } from './types';

export class CodeParser {
  private chunker: Chunker;

  constructor(chunkingOptions?: ChunkingOptions) {
    this.chunker = new Chunker(chunkingOptions);
  }

  /**
   * Parse a single file into chunks
   */
  parse(filePath: string, content: string): ParsedFile {
    const language = LanguageDetector.detect(filePath, content);
    const lines = content.split('\n');
    const chunks = this.chunker.chunk(content, filePath, language);

    return {
      path: filePath,
      language,
      content,
      size: content.length,
      lineCount: lines.length,
      chunks,
    };
  }

  /**
   * Parse multiple files
   */
  parseMultiple(
    files: Array<{ path: string; content: string }>
  ): ParsedFile[] {
    return files.map((file) => this.parse(file.path, file.content));
  }

  /**
   * Extract imports from code
   */
  extractImports(content: string, language: string | null): string[] {
    if (!language) return [];

    const imports: string[] = [];
    const patterns: Record<string, RegExp> = {
      typescript: /^import\s+.*?from\s+['"](.+?)['"]/gm,
      javascript: /^(?:import\s+.*?from\s+['"](.+?)['"]|const\s+\w+\s*=\s*require\(['"](.+?)['"]\))/gm,
      python: /^(?:from\s+(\S+)\s+import|import\s+(\S+))/gm,
      go: /^import\s+(?:\(\s*)?["'](.+?)["']/gm,
      rust: /^use\s+(\S+)/gm,
    };

    const pattern = patterns[language];
    if (!pattern) return [];

    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (importPath) {
        imports.push(importPath);
      }
    }

    return imports;
  }

  /**
   * Extract exports from code
   */
  extractExports(content: string, language: string | null): string[] {
    if (!language) return [];

    const exports: string[] = [];
    const patterns: Record<string, RegExp> = {
      typescript: /^export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)/gm,
      javascript: /^export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/gm,
      python: /^(?:def|class)\s+(\w+)(?!.*#\s*private)/gm,
      go: /^func\s+(\p{Lu}\w*)/gmu, // Exported functions start with uppercase
      rust: /^pub\s+(?:fn|struct|enum|trait)\s+(\w+)/gm,
    };

    const pattern = patterns[language];
    if (!pattern) return [];

    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        exports.push(match[1]);
      }
    }

    return exports;
  }
}
