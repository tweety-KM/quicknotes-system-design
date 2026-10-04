# QuickNotes API Design

This is the REST API the backend team should build for QuickNotes. It is not JSONPlaceholder. The base URL is `https://api.quicknotes.example/v1`. All requests and responses use JSON, and every endpoint except login needs the header `Authorization: Bearer <token>`.

## Endpoints

| Method | Path | Description | Success status |
|---|---|---|---|
| POST | `/auth/login` | Log in with email and password and receive a token | 200 OK |
| GET | `/notes` | List the logged-in user's notes (newest first, paginated) | 200 OK |
| GET | `/notes/{id}` | Get one note by id | 200 OK |
| POST | `/notes` | Create a new note | 201 Created |
| PUT | `/notes/{id}` | Replace the title, body, category and tags of a note | 200 OK |
| DELETE | `/notes/{id}` | Delete a note | 204 No Content |
| GET | `/notes?tag=urgent` | List the user's notes that have a given tag | 200 OK |
| GET | `/tags` | List all tags | 200 OK |

Query parameters for `GET /notes`: `page` (default 1), `limit` (default 10, maximum 50), `tag` (filter by tag name) and `q` (search words in the title or body).

## Examples

### Create a note: `POST /notes`

Request body:

```json
{
  "title": "Revise SQL joins",
  "body": "Practise INNER JOIN and LEFT JOIN with the school database.",
  "category": "study",
  "tags": ["exams", "urgent"]
}
```

Response (`201 Created`):

```json
{
  "id": 42,
  "user_id": 7,
  "title": "Revise SQL joins",
  "body": "Practise INNER JOIN and LEFT JOIN with the school database.",
  "category": "study",
  "tags": ["exams", "urgent"],
  "created_at": "2026-10-04T09:30:00Z"
}
```

### List notes: `GET /notes?page=1&limit=2`

Response (`200 OK`):

```json
{
  "data": [
    {
      "id": 42,
      "title": "Revise SQL joins",
      "body": "Practise INNER JOIN and LEFT JOIN with the school database.",
      "category": "study",
      "tags": ["exams", "urgent"],
      "created_at": "2026-10-04T09:30:00Z"
    },
    {
      "id": 41,
      "title": "Buy groceries",
      "body": "",
      "category": "personal",
      "tags": [],
      "created_at": "2026-10-03T16:10:00Z"
    }
  ],
  "page": 1,
  "limit": 2,
  "total": 17
}
```

## Error codes

Errors use the same JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The title is required and must be 100 characters or fewer."
  }
}
```

| Status | Meaning | Example |
|---|---|---|
| 400 Bad Request | The request is invalid | `POST /notes` with an empty title, or a title over 100 characters |
| 401 Unauthorized | The user is not logged in | Any `/notes` request with no token, or an expired token |
| 403 Forbidden | Logged in but not allowed | `DELETE /notes/9` where note 9 belongs to another user |
| 404 Not Found | The resource does not exist | `GET /notes/9999` when no note has that id |
| 500 Internal Server Error | The server failed unexpectedly | The database is unreachable while saving a note |