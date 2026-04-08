### scrawlrepo - a monorepo architecture
A full stack AI repo scrawler app.
- Node 20+
- Docker Compose (PostgreSQL + pgvector + Redis)
- OpenAI + optional Github token
- BullMQ queue + background processor

## Folder structure
`apps/api` - NestJS backend
`apps/web` - React + Vite frontend

`packages` - shared logic:
    - crawler
    - parser
    - embeddings
    - shared (types/config/schemas)

`docker-compose.yml` - PostgreSQL + Redis for dev env
`.env` - config for DATABASE_URL, REDIS_URL, OPENAI_API_KEY, GITHUB_TOKEN

# How to run it locally
1. Clone + install deps
```
cd c:\Dishu Mavi\webDev\scrawlrepo\scrawlrepo
npm install
```

2. Configure env vars
```
cp .env.example .env
```

Edit .env:

- DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scrawler
- REDIS_URL=redis://localhost:6379
- OPENAI_API_KEY=sk-...
- GITHUB_TOKEN=ghp_... (optional, but recommended for GitHub rate limit)

3. Start infra (Postgres + Redis)
```
npm run docker:up
```

4. Build + DB migration ( api folder )
```from root
npm run build:api
npm run db:migrate
```

5. Start API + webdev servers
```
npm run dev:api
```

```
npm run dev:web
```

### Other useful root scripts
- npm run dev — run workspace devs (dev:api, dev:web)
- npm run build:packages — compile shared packages
- npm run build:apps — compile API + web
- npm run lint
- npm run format
- npm run clean (remove node_modules/dist)
- npm run docker:down (stop infra)