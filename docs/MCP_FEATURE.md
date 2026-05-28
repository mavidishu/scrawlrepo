# Feature: MCP Server Integration — GitHub Scrawler

Summary
-------
Expose the core capabilities of GitHub Scrawler (repository indexing, semantic search / Q&A, reindexing, and status) via a small, well-documented MCP-compatible interface so other services (agents, automation pipelines, or platforms) can integrate programmatically.

Goals
-----
- Provide a stable, versioned MCP API surface that maps to existing functionality (index, query, status, reindex, delete).
- Support both synchronous query flows and asynchronous indexing flows (events/webhooks or pub/sub).
- Minimal infra changes: reuse existing NestJS API and BullMQ workers, add an MCP adapter layer.
- Provide clear auth, rate-limiting, and observability requirements.

Non-goals
---------
- Rewriting core indexing or embeddings pipelines.
- Implementing new ML models or changing OpenAI integration.

Actors / Personas
-----------------
- Automated agent (MCP client) that indexes repos and asks queries.
- DevOps/Platform operator who provisions credentials and monitors the MCP service.
- Product user who expects consistent responses and attribution to sources.

User Stories
------------
- As an MCP client, I can submit a repository URL and receive an indexing job id.
- As an MCP client, I can ask a natural-language question against a repository and receive a structured answer with source citations.
- As an MCP client, I can receive events (indexing.started, indexing.completed, indexing.failed) for job lifecycle.
- As an operator, I can query indexing status and list repositories via MCP.

MCP API Surface (proposal)
--------------------------
Version: mcp.v1

Endpoints (HTTP/JSON; prefer gRPC/Protobuf in future)
- POST /mcp/v1/repos.index
  - Request: { "repo_url": "https://github.com/owner/repo", "options": { "depth": 1 } }
  - Response: { "job_id": "uuid", "repo_id": "uuid", "status": "queued" }

- GET /mcp/v1/repos.list
  - Response: { "repos": [{"id":"uuid","url":"...","status":"ready"}] }

- GET /mcp/v1/repos/:id/status
  - Response: { "id": "uuid", "status": "indexing|ready|failed", "progress": {"files":100,"processed":45} }

- POST /mcp/v1/repos/:id/query
  - Request: { "query": "How is authentication implemented?", "options": { "top_k": 5 } }
  - Response: { "answer": "...", "sources":[{"path":"src/auth.ts","score":0.94}], "raw_completion": {...} }

- POST /mcp/v1/repos/:id.reindex
  - Response: { "job_id": "uuid", "status": "queued" }

- DELETE /mcp/v1/repos/:id
  - Response: { "deleted": true }

Events (webhook/pubsub)
- Topic: scrawler.repo.indexing
- Payloads: indexing.started, indexing.progress, indexing.completed, indexing.failed
- Delivery: webhook (HMAC-signed) and Redis pub/sub (optional)

Authentication & Authorization
------------------------------
- Primary: API Key (Bearer) with scoped capabilities (index, query, admin).
- Secondary: mTLS or JWT for internal platform-to-platform trust.
- Rate limiting: per-key QPS and daily quota; configurable via env.

Mapping to existing endpoints
----------------------------
The MCP endpoints map directly to the current REST endpoints listed in README:
- repos.index => POST /api/repos
- repos.list => GET /api/repos
- repos/:id/query => POST /api/repos/:id/query
- status endpoints reuse /api/repos/:id/status

Implementation Plan (high-level tasks)
-------------------------------------
1. Add "mcp" adapter module in apps/api that exposes /mcp/v1/* routes and translates to internal service calls. (non-invasive)
2. Add API key auth guard and configuration (env: MCP_API_KEYS, MCP_RATE_LIMIT).
3. Implement event publishing for job lifecycle (HMAC-signed webhooks + Redis pub/sub topic). Reuse BullMQ job events.
4. Add lightweight request/response schema (OpenAPI contract) and examples in docs.
5. Add E2E scenarios (curl examples) to README and automated smoke test.
6. Update infra docs: expose /mcp port in docker-compose (same API port is OK; document route prefix).

Milestones / Deliverables
-------------------------
- M1: MCP adapter routes + API key auth + mapping to index/query (implementation ready)
- M2: Eventing (webhooks + Redis topic) + HMAC signing
- M3: Documentation: OpenAPI + example clients + rollout notes
- M4: QA + smoke tests + monitoring dashboards (health, QPS, errors)

Acceptance Criteria
-------------------
- MCP endpoints return consistent responses matching contract.
- Indexing jobs created through MCP produce identical results as existing API flows.
- Events emitted for all job lifecycle transitions and can be verified by a webhook receiver.
- Auth keys enforce rate-limits and access-scopes.

Observability & Metrics
-----------------------
- Track: indexing_jobs_total, queries_total, query_latency_seconds (p95/p99), webhook_delivery_success, auth_failures.
- Instrument request ids and include them in logs for traceability.

Risks & Mitigations
-------------------
- Sensitive data exposure: ensure webhooks are HMAC-signed and only accept known URLs. Use scoped keys.
- Scaling: queries are LLM-bound; add per-key rate-limits and queue controls.

Open Questions
--------------
- Preferred transport: stick with HTTP+JSON or add gRPC/Protobuf for stronger typing?
- Should MCP support multi-repo context queries in v1 or defer to v2?

Next Steps
----------
- Align on API contract (comment on this doc) and preferred auth model.
- Implement small adapter (mcp module) that reuses existing services.
- Add example MCP client (Node) in docs/examples.

Appendix: Quick curl examples
----------------------------
Index request:

curl -X POST -H "Authorization: Bearer ${MCP_KEY}" -H "Content-Type: application/json" \
  --data '{"repo_url":"https://github.com/owner/repo"}' \
  http://localhost:3000/mcp/v1/repos.index

Query request:

curl -X POST -H "Authorization: Bearer ${MCP_KEY}" -H "Content-Type: application/json" \
  --data '{"query":"How to run tests?"}' \
  http://localhost:3000/mcp/v1/repos/REPO_ID/query


---
Notes: this feature reuses existing codepaths (indexing pipeline, embedding storage, query pipeline). The work is primarily adapter, auth, and eventing.
