import { getLanguageByExtension } from '@scrawler/shared';

export class LanguageDetector {
  /**
   * Detect language by file extension
   */
  static detectByExtension(filePath: string): string | null {
    return getLanguageByExtension(filePath);
  }

  /**
   * Detect language by content patterns (fallback)
   */
  static detectByContent(content: string): string | null {
    // Simple heuristic-based detection for common patterns
    const patterns: Array<{ pattern: RegExp; language: string }> = [
      { pattern: /^#!.*python/m, language: 'python' },
      { pattern: /^#!.*node/m, language: 'javascript' },
      { pattern: /^#!.*bash/m, language: 'shell' },
      { pattern: /^package\s+\w+/m, language: 'go' },
      { pattern: /^import\s+React/m, language: 'javascript' },
      { pattern: /^from\s+\w+\s+import/m, language: 'python' },
      { pattern: /^def\s+\w+\s*\(/m, language: 'python' },
      { pattern: /^class\s+\w+.*:\s*$/m, language: 'python' },
      { pattern: /^fn\s+\w+/m, language: 'rust' },
      { pattern: /^func\s+\w+/m, language: 'go' },
      { pattern: /^interface\s+\w+/m, language: 'typescript' },
      { pattern: /^type\s+\w+\s*=/m, language: 'typescript' },
    ];

    for (const { pattern, language } of patterns) {
      if (pattern.test(content)) {
        return language;
      }
    }

    return null;
  }

  /**
   * Detect language using both file extension and content
   */
  static detect(filePath: string, content?: string): string | null {
    // First try extension-based detection
    const byExtension = this.detectByExtension(filePath);
    if (byExtension) {
      return byExtension;
    }

    // Fall back to content-based detection
    if (content) {
      return this.detectByContent(content);
    }

    return null;
  }
}
