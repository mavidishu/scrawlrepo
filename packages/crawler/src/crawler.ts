import { Octokit } from '@octokit/rest';
import JSZip from 'jszip';
import { GITHUB_CONFIG, IGNORED_PATTERNS, isCodeFile } from '@scrawler/shared';
import { RateLimiter } from './rate-limiter';
import type {
  CrawlerOptions,
  RepositoryInfo,
  FileTreeItem,
  FileContent,
  CrawlResult,
  RateLimitInfo,
} from './types.js';

export class GitHubCrawler {
  private octokit: Octokit;
  private rateLimiter: RateLimiter;
  private maxFileSize: number;

  constructor(options: CrawlerOptions = {}) {
    this.octokit = new Octokit({
      auth: options.token,
    });

    this.rateLimiter = new RateLimiter({
      maxConcurrent: options.maxConcurrent ?? GITHUB_CONFIG.CONCURRENT_REQUESTS,
    });

    this.maxFileSize = options.maxFileSize ?? GITHUB_CONFIG.MAX_FILE_SIZE;
  }

  /**
   * Fetch repository metadata
   */
  async getRepository(owner: string, repo: string): Promise<RepositoryInfo> {
    const response = await this.rateLimiter.schedule(() =>
      this.octokit.repos.get({ owner, repo })
    );

    await this.updateRateLimitFromHeaders(response.headers);

    const data = response.data;

    return {
      owner: data.owner.login,
      name: data.name,
      defaultBranch: data.default_branch,
      description: data.description,
      language: data.language,
      stars: data.stargazers_count,
      forks: data.forks_count,
      size: data.size,
      isPrivate: data.private,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Fetch the complete file tree of a repository
   */
  async getFileTree(
    owner: string,
    repo: string,
    branch?: string
  ): Promise<FileTreeItem[]> {
    const targetBranch = branch || (await this.getDefaultBranch(owner, repo));

    const response = await this.rateLimiter.schedule(() =>
      this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: targetBranch,
        recursive: 'true',
      })
    );

    await this.updateRateLimitFromHeaders(response.headers);

    const files: FileTreeItem[] = [];

    for (const item of response.data.tree) {
      if (!item.path || !item.sha) continue;

      // Skip ignored patterns
      if (this.shouldIgnore(item.path)) continue;

      files.push({
        path: item.path,
        type: item.type === 'blob' ? 'file' : 'dir',
        size: item.size ?? 0,
        sha: item.sha,
      });
    }

    return files;
  }

  /**
   * Fetch the content of a specific file
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    branch?: string
  ): Promise<FileContent | null> {
    try {
      const response = await this.rateLimiter.schedule(() =>
        this.octokit.repos.getContent({
          owner,
          repo,
          path,
          ref: branch,
        })
      );

      await this.updateRateLimitFromHeaders(response.headers);

      const data = response.data;

      // Handle file response (not directory)
      if ('content' in data && data.type === 'file') {
        // Skip files that are too large
        if (data.size > this.maxFileSize) {
          console.log(`Skipping large file: ${path} (${data.size} bytes)`);
          return null;
        }

        const content = Buffer.from(data.content, 'base64').toString('utf-8');

        return {
          path: data.path,
          content,
          size: data.size,
          sha: data.sha,
          encoding: data.encoding,
        };
      }

      return null;
    } catch (error) {
      // Handle 404 or other errors gracefully
      if ((error as { status?: number }).status === 404) {
        console.log(`File not found: ${path}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetch multiple files by downloading the repository archive (ZIP)
   * This is much more efficient for rate limits than individual file requests
   */
  async getFilesContent(
    owner: string,
    repo: string,
    paths: string[],
    branch?: string,
    onProgress?: (processed: number, total: number) => void
  ): Promise<FileContent[]> {
    const targetBranch = branch || (await this.getDefaultBranch(owner, repo));
    
    console.log(`Downloading archive for ${owner}/${repo} (${targetBranch})...`);
    
    try {
      // Download ZIP archive
      const response = await this.rateLimiter.schedule(() => 
        this.octokit.repos.downloadZipballArchive({
          owner,
          repo,
          ref: targetBranch,
        })
      );

      // In some Octokit versions, data might be in different formats
      const zipData = response.data as any;
      const zip = await JSZip.loadAsync(zipData);
      
      const files: FileContent[] = [];
      
      // The ZIP entries are prefixed with "owner-repo-sha/"
      // We need to find the root directory name
      const rootDir = Object.keys(zip.files).find(f => f.endsWith('/') && f.split('/').length === 2)?.split('/')[0] 
                   || Object.keys(zip.files)[0].split('/')[0];
      
      let processed = 0;
      const totalToProcess = paths.length;

      for (const path of paths) {
        const zipPath = `${rootDir}/${path}`;
        const file = zip.files[zipPath];
        
        if (file && !file.dir) {
          const content = await file.async('string');
          
          files.push({
            path,
            content,
            size: content.length,
            sha: '', // SHA not directly available in ZIP
            encoding: 'utf-8',
          });
        }
        
        processed++;
        if (processed % 10 === 0 || processed === totalToProcess) {
          onProgress?.(processed, totalToProcess);
        }
      }

      return files;
    } catch (error) {
      console.error('Failed to download or extract archive:', error);
      // Fallback to individual requests if archive fails
      return this.getFilesContentLegacy(owner, repo, paths, targetBranch, onProgress);
    }
  }

  /**
   * Individual file fetching (Legacy/Fallback)
   */
  private async getFilesContentLegacy(
    owner: string,
    repo: string,
    paths: string[],
    branch?: string,
    onProgress?: (processed: number, total: number) => void
  ): Promise<FileContent[]> {
    const files: FileContent[] = [];
    let processed = 0;

    const results = await Promise.allSettled(
      paths.map(async (path) => {
        const content = await this.getFileContent(owner, repo, path, branch);
        processed++;
        onProgress?.(processed, paths.length);
        return content;
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        files.push(result.value);
      }
    }

    return files;
  }

  /**
   * Crawl an entire repository - get metadata and file tree
   */
  async crawlRepository(owner: string, repo: string): Promise<CrawlResult> {
    const repository = await this.getRepository(owner, repo);
    const allFiles = await this.getFileTree(owner, repo, repository.defaultBranch);

    // Filter to only include code files
    const codeFiles = allFiles.filter(
      (f) => f.type === 'file' && isCodeFile(f.path) && f.size <= this.maxFileSize
    );

    const totalSize = codeFiles.reduce((sum, f) => sum + f.size, 0);

    return {
      repository,
      files: codeFiles,
      totalSize,
    };
  }

  /**
   * Get current rate limit status
   */
  async getRateLimit(): Promise<RateLimitInfo> {
    const response = await this.octokit.rateLimit.get();

    return {
      limit: response.data.rate.limit,
      remaining: response.data.rate.remaining,
      reset: new Date(response.data.rate.reset * 1000),
      used: response.data.rate.used,
    };
  }

  /**
   * Get the default branch of a repository
   */
  private async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const info = await this.getRepository(owner, repo);
    return info.defaultBranch;
  }

  /**
   * Check if a path should be ignored
   */
  private shouldIgnore(path: string): boolean {
    const pathLower = path.toLowerCase();
    return IGNORED_PATTERNS.some((pattern) => {
      // Handle glob patterns
      if (pattern.startsWith('*.')) {
        const ext = pattern.slice(1);
        return pathLower.endsWith(ext);
      }
      // Handle directory patterns
      return pathLower.includes(pattern.toLowerCase());
    });
  }

  /**
   * Update rate limiter based on GitHub API headers
   */
  private async updateRateLimitFromHeaders(
    headers: Record<string, string | number | undefined>
  ): Promise<void> {
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];

    if (remaining !== undefined && reset !== undefined) {
      const resetDate = new Date(Number(reset) * 1000);
      await this.rateLimiter.updateReservoir(Number(remaining), resetDate);
    }
  }

  /**
   * Stop the crawler and cleanup
   */
  stop(): void {
    this.rateLimiter.stop();
  }
}
