export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  isValid: boolean;
}

/**
 * Parse a GitHub repository URL to extract owner and repo name
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('github.com')) {
      return { owner: '', repo: '', isValid: false };
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length < 2) {
      return { owner: '', repo: '', isValid: false };
    }

    const owner = pathParts[0];
    // Remove .git suffix if present
    const repo = pathParts[1].replace(/\.git$/, '');

    return { owner, repo, isValid: true };
  } catch {
    return { owner: '', repo: '', isValid: false };
  }
}

/**
 * Normalize a GitHub URL to a standard format
 */
export function normalizeGitHubUrl(url: string): string {
  const { owner, repo, isValid } = parseGitHubUrl(url);
  if (!isValid) {
    throw new Error('Invalid GitHub URL');
  }
  return `https://github.com/${owner}/${repo}`;
}

/**
 * Build a raw content URL for a file in a GitHub repository
 */
export function buildRawContentUrl(
  owner: string,
  repo: string,
  branch: string,
  path: string
): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}
