# GitHub Scrawler

AI-powered GitHub repository intelligence platform. Analyze any public GitHub repository and ask questions about the codebase using natural language.

## Features

- **Repository Analysis**: Index any public GitHub repository
- **AI-Powered Q&A**: Ask questions about code and get context-aware answers
- **Semantic Search**: Find relevant code using vector similarity search
- **Background Processing**: Async indexing with job queue
- **Modern UI**: Clean, responsive React frontend

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + TypeScript |
| Frontend | React + Vite + TailwindCSS |
| Database | PostgreSQL + pgvector |
| Queue | BullMQ + Redis |
| AI/ML | LangChain + OpenAI |
| GitHub API | Octokit |

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- OpenAI API Key
- GitHub Personal Access Token (optional, for higher rate limits)

## Quick Start

### 1. Clone and Install

```bash
cd scrawlrepo
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scrawler
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-your-api-key-here
GITHUB_TOKEN=ghp_your-token-here  # Optional
```

### 3. Start Infrastructure

```bash
npm run docker:up
```

This starts PostgreSQL (with pgvector) and Redis.

### 4. Run Database Migrations

```bash
cd apps/api
npm run build
npm run migration:run
cd ../..
```

### 5. Start Development Servers

In separate terminals:

```bash
# Terminal 1: API Server
npm run dev:api

# Terminal 2: Frontend
npm run dev:web
```

- API: http://localhost:3000
- Frontend: http://localhost:5173

## Project Structure

```
github-scrawler/
├── apps/
│   ├── api/                  # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── repo/     # Repository CRUD
│   │   │   │   ├── indexing/ # Background jobs
│   │   │   │   ├── ai/       # RAG pipeline
│   │   │   │   └── health/   # Health checks
│   │   │   ├── entities/     # TypeORM entities
│   │   │   └── database/     # Migrations
│   │   └── package.json
│   │
│   └── web/                  # React Frontend
│       ├── src/
│       │   ├── pages/        # Route pages
│       │   ├── components/   # UI components
│       │   └── api/          # API client
│       └── package.json
│
├── packages/
│   ├── shared/               # Types, schemas, constants
│   ├── crawler/              # GitHub API wrapper
│   ├── parser/               # Code chunking
│   └── embeddings/           # LangChain integration
│
├── infra/
│   └── docker/               # Docker configs
│
├── docker-compose.yml
└── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/repos` | Add repository for indexing |
| GET | `/api/repos` | List all repositories |
| GET | `/api/repos/:id` | Get repository details |
| DELETE | `/api/repos/:id` | Remove repository |
| GET | `/api/repos/:id/status` | Get indexing status |
| POST | `/api/repos/:id/query` | Ask question about code |
| POST | `/api/repos/:id/reindex` | Trigger re-indexing |
| GET | `/api/health` | Health check |

## How It Works

### Indexing Pipeline

```
1. User submits GitHub URL
2. API validates and creates repository record
3. Job added to BullMQ queue
4. Worker fetches repository file tree
5. Worker downloads file contents
6. Parser chunks code into semantic units
7. Embeddings generated via OpenAI
8. Chunks + embeddings stored in pgvector
9. Status updated to "ready"
```

### Query Pipeline (RAG)

```
1. User asks question
2. Question converted to embedding
3. pgvector finds similar code chunks
4. Top chunks used as context
5. GPT-4 generates answer with references
6. Response includes answer + sources
```

## Configuration

### Chunking

Edit `packages/shared/src/constants/config.ts`:

```typescript
export const CHUNK_CONFIG = {
  TARGET_CHUNK_SIZE: 1500,
  MAX_CHUNK_SIZE: 3000,
  MIN_CHUNK_SIZE: 100,
  CHUNK_OVERLAP: 200,
};
```

### LLM Settings

```typescript
export const LLM_CONFIG = {
  MODEL: 'gpt-4-turbo-preview',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.7,
  TOP_K_CHUNKS: 10,
};
```

## Development

### Build All Packages

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

### Stop Docker

```bash
npm run docker:down
```

## Troubleshooting

### pgvector Extension Error

If you see "extension vector does not exist", ensure you're using the `pgvector/pgvector:pg16` Docker image and restart:

```bash
npm run docker:down
docker volume rm scrawlrepo_postgres_data
npm run docker:up
```

### Rate Limiting

GitHub API has rate limits:
- Unauthenticated: 60 requests/hour
- Authenticated: 5,000 requests/hour

Set `GITHUB_TOKEN` in `.env` for higher limits.

### Large Repositories

For repos with 1000+ files, indexing may take several minutes. Check progress via the status endpoint or UI.

## Future Roadmap

- [ ] Multi-repository context
- [ ] Organization-level analysis
- [ ] Security scanning
- [ ] MCP server integration
- [ ] User authentication
- [ ] Private repository support

## License

MIT
