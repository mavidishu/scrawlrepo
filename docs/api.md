# API Documentation

Base URL: `http://localhost:3000/api`

## Endpoints

### Health

#### GET /health

Check API health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5
}
```

---

### Repositories

#### POST /repos

Add a new repository for indexing.

**Request Body:**
```json
{
  "githubUrl": "https://github.com/owner/repo"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "githubUrl": "https://github.com/owner/repo",
    "owner": "owner",
    "name": "repo",
    "defaultBranch": "main",
    "status": "pending",
    "fileCount": 0,
    "indexedAt": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid GitHub URL
- `409` - Repository already exists

---

#### GET /repos

List all repositories.

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

#### GET /repos/:id

Get repository details with stats.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "githubUrl": "https://github.com/owner/repo",
    "owner": "owner",
    "name": "repo",
    "defaultBranch": "main",
    "status": "ready",
    "fileCount": 150,
    "chunkCount": 450,
    "totalSize": 1250000,
    "indexedAt": "2024-01-15T10:35:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**Errors:**
- `404` - Repository not found

---

#### DELETE /repos/:id

Remove a repository and all its data.

**Response:** `204 No Content`

**Errors:**
- `404` - Repository not found

---

#### GET /repos/:id/status

Get indexing status.

**Response:**
```json
{
  "success": true,
  "data": {
    "repositoryId": "uuid",
    "status": "indexing",
    "progress": 45,
    "fileCount": 150,
    "indexedAt": null
  }
}
```

Status values:
- `pending` - Waiting in queue
- `indexing` - Currently processing
- `ready` - Indexing complete
- `failed` - Indexing failed

---

#### POST /repos/:id/reindex

Trigger re-indexing of a repository.

**Response:**
```json
{
  "success": true,
  "message": "Re-indexing started"
}
```

**Errors:**
- `404` - Repository not found

---

### AI Queries

#### POST /repos/:id/query

Ask a question about the repository code.

**Request Body:**
```json
{
  "question": "How does authentication work?",
  "maxChunks": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Authentication is implemented using JWT tokens...",
    "sources": [
      {
        "filePath": "src/auth/auth.service.ts",
        "startLine": 15,
        "endLine": 45,
        "content": "async validateUser(email: string, password: string)...",
        "score": 0.92
      }
    ],
    "tokensUsed": 1250
  }
}
```

**Errors:**
- `400` - Repository not ready
- `404` - Repository not found

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Repository not found"
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Invalid request data
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists
- `BAD_REQUEST` - Invalid operation
