export interface File {
  id: string;
  repositoryId: string;
  path: string;
  language: string | null;
  size: number;
  sha: string;
  createdAt: Date;
}

export interface FileWithContent extends File {
  content: string;
}

export interface FileTreeNode {
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha?: string;
  children?: FileTreeNode[];
}
