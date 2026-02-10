# Architecture Overview

## System Design

GitHub Scrawler follows a modular monorepo architecture with clear separation between:

1. **Apps** - Deployable applications (API, Web)
2. **Packages** - Shared libraries (crawler, parser, embeddings, shared)
3. **Infrastructure** - Docker and deployment configs

## Data Flow

### Repository Import Flow

```
User → React Frontend → NestJS API → PostgreSQL (metadata)
                                   → BullMQ Queue (job)
                                   
Background Worker:
Queue → GitHub Crawler → Parser → Embedding Service → pgvector
```

### Query Flow

```
User Question → API → Embedding Service (query vector)
                    → pgvector (similarity search)
                    → Context Builder
                    → LLM (GPT-4)
                    → Response with Sources
```

## Core Components

### 1. GitHub Crawler (`packages/crawler`)

Responsible for:
- Fetching repository metadata via Octokit
- Retrieving file tree structure
- Downloading file contents
- Rate limiting with Bottleneck

Key classes:
- `GitHubCrawler` - Main crawler interface
- `RateLimiter` - Request throttling

### 2. Code Parser (`packages/parser`)

Responsible for:
- Language detection by file extension
- Semantic code chunking
- Metadata extraction (imports, exports)

Chunking strategies:
- Semantic boundaries (functions, classes)
- Character-based fallback with overlap

### 3. Embedding Service (`packages/embeddings`)

Responsible for:
- Generating embeddings via OpenAI
- Batch processing for efficiency
- Vector similarity calculations

Uses:
- LangChain.js for LLM orchestration
- text-embedding-3-small model (1536 dimensions)

### 4. API Layer (`apps/api`)

NestJS modules:
- **RepoModule** - CRUD operations for repositories
- **IndexingModule** - Background job processing
- **AiModule** - RAG query pipeline
- **HealthModule** - Health checks

### 5. Frontend (`apps/web`)

React components:
- **HomePage** - Repository input and list
- **RepoPage** - Details and chat interface
- **ChatInterface** - Q&A UI

## Database Schema

### Tables

```sql
repositories
├── id (UUID, PK)
├── github_url (TEXT, UNIQUE)
├── owner (VARCHAR)
├── name (VARCHAR)
├── status (VARCHAR)
├── file_count (INT)
└── timestamps

files
├── id (UUID, PK)
├── repository_id (FK)
├── path (TEXT)
├── language (VARCHAR)
├── size (INT)
└── sha (VARCHAR)

chunks
├── id (UUID, PK)
├── file_id (FK)
├── content (TEXT)
├── start_line (INT)
├── end_line (INT)
├── embedding (vector(1536))
└── metadata (JSONB)
```

### Indexes

- `idx_repositories_status` - Status filtering
- `idx_files_repository_id` - Repository lookup
- `idx_chunks_file_id` - File lookup
- `idx_chunks_embedding` - IVFFlat for vector search

## Queue Architecture

Using BullMQ with Redis:

```
indexing (queue)
├── index-repository (job type)
    ├── repositoryId
    ├── githubUrl
    ├── owner
    └── name
```

Job features:
- 3 retry attempts
- Exponential backoff
- Progress tracking
- Job logging

## Security Considerations

### Current (MVP)

- Input validation (class-validator)
- Rate limiting via crawler
- No authentication (public repos only)

### Planned

- GitHub OAuth
- JWT authentication
- API rate limiting
- Private repository support

## Scalability Notes

### Horizontal Scaling

- API: Stateless, can run multiple instances
- Workers: Can scale independently
- Frontend: Static files, CDN-ready

### Bottlenecks

1. **GitHub API** - Rate limited, mitigated by caching
2. **OpenAI API** - Batched requests, retry logic
3. **Database** - pgvector indexes, connection pooling

### Recommendations for Scale

- Add Redis caching for frequent queries
- Implement chunk-level caching
- Consider dedicated vector DB (Qdrant) for large scale
- Add CDN for static assets
