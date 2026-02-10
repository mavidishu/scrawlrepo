export const SUPPORTED_LANGUAGES: Record<string, string[]> = {
  typescript: ['.ts', '.tsx', '.mts', '.cts'],
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  python: ['.py', '.pyw', '.pyi'],
  java: ['.java'],
  csharp: ['.cs'],
  cpp: ['.cpp', '.cc', '.cxx', '.c++', '.hpp', '.hh', '.h'],
  c: ['.c', '.h'],
  go: ['.go'],
  rust: ['.rs'],
  ruby: ['.rb', '.rake'],
  php: ['.php'],
  swift: ['.swift'],
  kotlin: ['.kt', '.kts'],
  scala: ['.scala'],
  html: ['.html', '.htm'],
  css: ['.css', '.scss', '.sass', '.less'],
  sql: ['.sql'],
  shell: ['.sh', '.bash', '.zsh'],
  yaml: ['.yml', '.yaml'],
  json: ['.json'],
  markdown: ['.md', '.mdx'],
  xml: ['.xml'],
  dockerfile: ['Dockerfile'],
};

export const EXTENSION_TO_LANGUAGE: Record<string, string> = Object.entries(
  SUPPORTED_LANGUAGES
).reduce((acc, [language, extensions]) => {
  extensions.forEach((ext) => {
    acc[ext] = language;
  });
  return acc;
}, {} as Record<string, string>);

export function getLanguageByExtension(filePath: string): string | null {
  const ext = filePath.includes('.')
    ? '.' + filePath.split('.').pop()!.toLowerCase()
    : filePath;
  return EXTENSION_TO_LANGUAGE[ext] || null;
}

export function isCodeFile(filePath: string): boolean {
  return getLanguageByExtension(filePath) !== null;
}

// Files to always skip
export const IGNORED_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.pytest_cache',
  'coverage',
  '.nyc_output',
  'vendor',
  '.idea',
  '.vscode',
  '*.min.js',
  '*.min.css',
  '*.map',
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'Thumbs.db',
];
