MCP Integration — Detailed Building Blocks
==========================================

Purpose
-------
Turn the MCP feature proposal into concrete, implementable building blocks to guide engineering: components, data models, API schemas, event contracts, infra/migrations, tests, monitoring, rollout and estimate.

1. High-level architecture
--------------------------
Components:
- MCP Adapter Module (apps/api/src/modules/mcp): HTTP routes (/mcp/v1/*) that validate requests, authenticate, authorize, translate to internal services, and standardize responses.
- Auth Layer: API Key store + guard, scope enforcement middleware, rate-limiter per key.
- Adapter Service: thin service that calls existing RepoService, QueryService, and JobService; handles translation of internal entities to MCP schemas.
- Event Publisher: listens to BullMQ job events and emits MCP events via (a) webhook dispatcher and (b) Redis pub/sub topic.
- Webhook Dispatcher: reliable delivery, HMAC signing, retry/backoff, dead-letter log.
- Admin Dashboard (optional): list keys, toggle scopes, view webhook deliveries.
- Observability: metrics exporter, structured logs with request_id, traces (X-Request-Id -> correlate to job_id).

2. API surface & schemas (mcp.v1)
--------------------------------
Common conventions:
- All endpoints require Authorization: Bearer <MCP_API_KEY>
- All responses include: request_id, timestamp, version
- Error format: { code, message, details? }

Endpoints (HTTP JSON examples)
- POST /mcp/v1/repos.index
  Req: { repo_url: string, options?: { depth?: number, private?: boolean } }
  Resp: { request_id, job_id, repo_id, status: "queued" }

- GET /mcp/v1/repos.list
  Resp: { request_id, repos: [{ id, url, status, created_at }] }

- GET /mcp/v1/repos/:id/status
  Resp: { request_id, id, status: "indexing|ready|failed", progress: { total_files, processed_files, percent } }

- POST /mcp/v1/repos/:id/query
  Req: { query: string, options?: { top_k?: number, temperature?: number } }
  Resp: {
    request_id,
    answer: string,
    sources: [{ path, line_range?, score }],
    tokens: { prompt_tokens, completion_tokens, total_tokens },
    raw_completion: object
  }

- POST /mcp/v1/repos/:id.reindex
  Resp: { request_id, job_id, status }

- DELETE /mcp/v1/repos/:id
  Resp: { request_id, deleted: boolean }

Contract notes:
- IDs are UUIDv4 strings.
- Include X-Request-Id header echo in response when provided.

3. Data models & DB migrations
------------------------------
Add three new tables (TypeORM entities + migration):

- mcp_api_keys
  - id: uuid primary
  - key_hash: string (store hashed key, e.g., bcrypt)
  - name: string
  - scopes: string[] (jsonb: ["index","query","admin"])
  - rate_limit_qps: integer (nullable)
  - daily_quota: integer (nullable)
  - created_at, revoked_at

- mcp_webhook_subscriptions
  - id: uuid
  - url: string
  - secret: string (hashed)
  - events: string[] (jsonb)
  - active: boolean
  - created_at, last_delivery_at

- mcp_event_log (audit)
  - id: uuid
  - event_type: string
  - payload: jsonb
  - dest: string (webhook_url or "redis")
  - status: string (pending, delivered, failed)
  - attempts: integer
  - last_error: text
  - created_at, updated_at

Migration notes:
- Add indexes on mcp_event_log.status and mcp_api_keys.key_hash
- Add foreign key to repo table if repo_id available

4. Auth & Security
------------------
- API Key issuance: generate strong random token; store hash in DB; return token only once.
- Guard: ApiKeyGuard that extracts token, verifies hash, loads scopes, attaches to request context.
- Scope enforcement: middleware to deny by-scope for endpoints.
- Rate limiting: bucket/Leaky-bucket in Redis keyed by api_key_id; configurable per key and global fallback.
- Webhook signing: use HMAC-SHA256(secret, payload) header X-SC-Webhook-Signature. Validate on receiver.
- Secrets rotation: admin endpoint to rotate webhook secret (create new secret, mark old secret expired).

5. Eventing: lifecycle and delivery
----------------------------------
Event types:
- indexing.started { job_id, repo_id, repo_url, timestamp }
- indexing.progress { job_id, progress: { processed_files, total_files } }
- indexing.completed { job_id, repo_id, stats }
- indexing.failed { job_id, repo_id, error }

Delivery mechanisms:
- Webhooks: On job events, enqueue event in mcp_event_log and attempt delivery via Webhook Dispatcher. Use exponential backoff, record attempts. Offer a delivery TTL, then mark dead-letter.
- Redis Pub/Sub: publish to channel scrawler.repo.indexing with event payload; useful for internal consumers.
- Optional: support SNS / Kafka in future.

Webhook dispatcher behavior:
- Pull events from event_log where status=pending
- For each subscription interested in event_type:
  - POST JSON payload to subscription.url with headers: X-SC-Event, X-SC-Signature, X-Request-Id
  - On success: mark event_log delivered for that dest
  - On failure: increment attempts, store last_error, schedule next attempt with backoff

6. Adapter implementation mapping
---------------------------------
- mcp.controller.ts -> validate request, call mcp.service methods
- mcp.service.ts -> calls RepoService.createRepo / JobService.enqueue / QueryService.query
- Use DTOs to map incoming requests to internal DTOs; handle optional params mapping
- Reuse validation pipes and class-validator

7. Rate limiting and quotas
---------------------------
- Use Redis keys: rate:{apiKeyId} and quota:{apiKeyId}:{YYYYMMDD}
- For QPS: use sliding window or token-bucket in Redis (Lua script recommended)
- For daily quotas: decrement on each successful query/index attempt; deny when exhausted

8. Metrics and observability
---------------------------
Primary metrics (Prometheus):
- mcp_index_requests_total{status,api_key}
- mcp_query_requests_total{status,api_key}
- mcp_query_latency_seconds_bucket
- mcp_webhook_deliveries_total{status}
- mcp_event_queue_depth
- auth_failures_total

Logs:
- JSON structured logs: include request_id, api_key_id (hashed / masked), job_id
- Correlate BullMQ job logs with request_id

Tracing:
- Add X-Request-Id propagation through HTTP and jobs. Optionally integrate with OpenTelemetry for traces.

9. Testing strategy
-------------------
Unit tests
- ApiKeyGuard, rate-limiter Lua script behavior mock, webhook signature verification logic.

Integration tests (CI)
- Start test postgres + redis (docker-compose.ci), seed a test api key, run through index flow via /mcp/v1/repos.index and assert job queued and events emitted.

Smoke tests
- Simple script that calls index + waits for indexing.completed event via webhook receiver test endpoint.

Acceptance tests
- Contract tests for request/response shapes using schema validator

10. CI / CD
-----------
- Add lint/test step to GH Actions. Use matrix with Node 20.
- Add migration step that runs TypeORM migrations in staging before deploying new code that relies on new tables.

11. Infra changes
-----------------
- Env vars:
  - MCP_API_KEYS (bootstrap), MCP_RATE_LIMIT_DEFAULT, MCP_WEBHOOK_RETRY_MAX
- docker-compose: no port changes needed. Document route prefix /mcp/v1/ in README.
- Add small worker (or reuse existing worker) to run webhook dispatcher (cron/consumer).

12. Backwards compatibility & rollout
------------------------------------
- Adapter is additive: existing /api/* endpoints remain unchanged.
- Feature flag the MCP routes behind env var MCP_ENABLED=true.
- Rollout plan: enable in staging, run smoke tests, enable in prod. Monitor metrics.
- Rollback: flip MCP_ENABLED=false and clear pending webhook deliveries (or let them expire).

13. Tasks & estimated effort (rough)
-----------------------------------
- M1 (2-3 days): scaffold mcp module, basic endpoints, mapping to internal services, unit tests
- M2 (2-3 days): API key model + guard, admin scripts to create keys, rate-limiter
- M3 (3 days): eventing + webhook dispatcher + event_log + retries
- M4 (1-2 days): docs/openapi, examples, smoke tests, observability
- Total: ~8–11 developer-days

14. Acceptance criteria (detailed mapping)
-----------------------------------------
- POST /mcp/v1/repos.index returns job_id and repo_id and persists a job.
- When indexing completes via existing worker, webhook for indexing.completed is emitted and deliverable.
- POST /mcp/v1/repos/:id/query returns answer + sources for a sample repository.
- API key with only "query" scope is unable to call repos.index (403).
- Rate-limits enforced: >QPS results in 429.

Appendix A — Example DB migration SQL (TypeORM friendly)
------------------------------------------------------
-- mcp_api_keys
CREATE TABLE IF NOT EXISTS mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL,
  name TEXT,
  scopes JSONB NOT NULL,
  rate_limit_qps INT,
  daily_quota INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- mcp_webhook_subscriptions
CREATE TABLE IF NOT EXISTS mcp_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_delivery_at TIMESTAMP WITH TIME ZONE
);

-- mcp_event_log
CREATE TABLE IF NOT EXISTS mcp_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  dest TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

Appendix B — Webhook signature example
-------------------------------------
X-SC-Webhook-Signature: sha256=HEX(HMAC_SHA256(secret, body))

Receiver verifies signature matches secret stored for subscription.

Appendix C — Example Prometheus rules
-------------------------------------
- Alert: HighErrorRate
  expr: increase(mcp_index_requests_total{status=~"5.."}[5m]) > 10
  for: 2m



Notes
-----
This file is intentionally implementation-focused. Next logical steps: pick a first milestone (M1), create a small plan.md with tasks and assign owners, then implement the API key model and a minimal adapter for index + query to demonstrate the end-to-end flow.
