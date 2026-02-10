// Chunking configuration
export const CHUNK_CONFIG = {
  // Target size for each chunk (in characters)
  TARGET_CHUNK_SIZE: 1500,
  // Maximum size for a chunk
  MAX_CHUNK_SIZE: 3000,
  // Minimum size for a chunk
  MIN_CHUNK_SIZE: 100,
  // Overlap between chunks (in characters)
  CHUNK_OVERLAP: 200,
} as const;

// Embedding configuration
export const EMBEDDING_CONFIG = {
  // OpenAI embedding model
  MODEL: 'text-embedding-3-small',
  // Embedding dimension
  DIMENSION: 1536,
  // Batch size for embedding generation
  BATCH_SIZE: 100,
} as const;

// LLM configuration
export const LLM_CONFIG = {
  // Default model for chat
  MODEL: 'gpt-4-turbo-preview',
  // Max tokens for response
  MAX_TOKENS: 2000,
  // Temperature for response generation
  TEMPERATURE: 0.7,
  // Number of chunks to retrieve for context
  TOP_K_CHUNKS: 10,
} as const;

// GitHub API configuration
export const GITHUB_CONFIG = {
  // Maximum file size to process (in bytes)
  MAX_FILE_SIZE: 500_000, // 500KB
  // Rate limit buffer (requests per hour to leave unused)
  RATE_LIMIT_BUFFER: 100,
  // Concurrent requests limit
  CONCURRENT_REQUESTS: 5,
} as const;

// Queue configuration
export const QUEUE_CONFIG = {
  // Queue name for indexing jobs
  INDEXING_QUEUE: 'indexing',
  // Job retry attempts
  MAX_RETRIES: 3,
  // Backoff delay in ms
  BACKOFF_DELAY: 5000,
  // Job timeout in ms (30 minutes)
  JOB_TIMEOUT: 30 * 60 * 1000,
} as const;
