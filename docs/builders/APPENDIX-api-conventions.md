# Appendix B — API Conventions

> **Scope:** All StepDish REST API routes under `/api/`. Applies to every task that exposes an endpoint.

---

## 1. Base URL & Versioning

```
https://stepdish.app/api/v1/
```

- Version prefix (`v1`) is **mandatory** from day one — no unversioned public routes
- Breaking changes require a new version (`v2`); additive changes (new optional fields) do not
- Deprecated versions return `Sunset` header with removal date

---

## 2. URL Structure

```
/api/v1/{resource}                  # collection
/api/v1/{resource}/{id}             # single item
/api/v1/{resource}/{id}/{sub}       # sub-resource
```

**Examples:**
```
GET    /api/v1/recipes
POST   /api/v1/recipes
GET    /api/v1/recipes/:id
PATCH  /api/v1/recipes/:id
DELETE /api/v1/recipes/:id
GET    /api/v1/recipes/:id/steps
POST   /api/v1/recipes/:id/revisions
GET    /api/v1/recipes/:id/revisions/:revId
POST   /api/v1/import/url
POST   /api/v1/import/text
```

- Resource names are **plural nouns** — never verbs
- IDs are **UUIDs** — never auto-increment integers in URLs
- Use **kebab-case** for multi-word resources: `/recipe-steps` not `/recipeSteps`

---

## 3. HTTP Methods

| Method | Use | Body | Idempotent |
|---|---|---|---|
| `GET` | Read — single or list | None | ✅ |
| `POST` | Create resource | JSON payload | ❌ |
| `PATCH` | Partial update | JSON patch fields only | ✅ |
| `PUT` | Full replacement | Complete resource | ✅ |
| `DELETE` | Remove | None | ✅ |

- **Never use `POST` for reads** — always `GET` with query params
- **Prefer `PATCH` over `PUT`** for recipe/step updates — only send changed fields
- `DELETE` returns `204 No Content` on success, never `200` with a body

---

## 4. Standard Response Envelope

All responses (success and error) use this shape:

```jsonc
// Success
{
  "ok": true,
  "data": { /* resource or array */ },
  "meta": { /* pagination, counts — present only on list responses */ }
}

// Error
{
  "ok": false,
  "error": {
    "code": "RECIPE_NOT_FOUND",      // machine-readable, SCREAMING_SNAKE
    "message": "Recipe not found.",   // human-readable sentence
    "field": "id",                   // optional — field that caused the error
    "details": []                     // optional — validation error array
  }
}
```

**Never** return a raw array at the top level. Always wrap in `{ ok, data }`.

---

## 5. Pagination

All list endpoints use **cursor-based pagination** (not offset):

```
GET /api/v1/recipes?cursor=<base64-cursor>&limit=20
```

```jsonc
{
  "ok": true,
  "data": [ /* items */ ],
  "meta": {
    "limit": 20,
    "count": 20,
    "nextCursor": "eyJpZCI6Ijg3YWYifQ==",   // null if last page
    "prevCursor": "eyJpZCI6IjEyM2YifQ=="    // null if first page
  }
}
```

- Default `limit`: 20; max `limit`: 100
- Cursor encodes the `id` + sort field of the last seen item (base64 JSON)
- **Never expose raw DB row IDs** in cursor — always encode

---

## 6. Filtering, Sorting & Search

```
GET /api/v1/recipes?cuisine=italian&dietary=vegan&sort=createdAt&order=desc&q=pasta
```

| Param | Type | Example |
|---|---|---|
| `q` | string | Full-text search query |
| `cuisine` | string | `italian`, `japanese` |
| `dietary` | string (multi, comma-sep) | `vegan,gluten-free` |
| `equipment` | string (multi, comma-sep) | `oven,blender` |
| `sort` | enum | `createdAt`, `updatedAt`, `title`, `cookTime` |
| `order` | `asc` \| `desc` | Default `desc` |

- Unknown filter params → ignored silently (no 400)
- Invalid enum values → `400` with `error.field` identifying the param

---

## 7. Authentication

- All mutating routes (`POST`, `PATCH`, `PUT`, `DELETE`) require auth
- Public `GET` routes (browse, recipe detail) do **not** require auth
- Auth header: `Authorization: Bearer <jwt>`
- JWT verified server-side via NextAuth session or API key (for external integrations)
- Expired token → `401 UNAUTHORIZED`; valid token, wrong owner → `403 FORBIDDEN`

---

## 8. Status Code Reference

| Code | When |
|---|---|
| `200 OK` | Successful `GET` or `PATCH` |
| `201 Created` | Successful `POST` — include `Location` header |
| `204 No Content` | Successful `DELETE` |
| `400 Bad Request` | Validation failure, malformed JSON |
| `401 Unauthorized` | Missing or invalid auth token |
| `403 Forbidden` | Authenticated but not authorised for this resource |
| `404 Not Found` | Resource doesn't exist |
| `409 Conflict` | Duplicate (e.g., username taken) |
| `422 Unprocessable Entity` | Semantically invalid payload (e.g., step order out of range) |
| `429 Too Many Requests` | Rate limit hit — include `Retry-After` header |
| `500 Internal Server Error` | Unexpected server fault — never expose stack traces |

---

## 9. Rate Limiting

| Route group | Limit | Window |
|---|---|---|
| Public browse / search | 120 req | 1 min per IP |
| Authenticated mutations | 60 req | 1 min per user |
| Import (URL / text) | 10 req | 1 min per user |
| AI extraction | 5 req | 1 min per user |

Headers on every response:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 1717000000
```

---

## 10. Request Validation

- All incoming payloads validated with **Zod** schemas before hitting business logic
- Schema files live in `src/lib/schemas/{resource}.schema.ts`
- On validation failure, return `400` with `error.details` array:

```jsonc
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request payload is invalid.",
    "details": [
      { "field": "title", "message": "Title is required." },
      { "field": "steps[0].durationSec", "message": "Must be a positive integer." }
    ]
  }
}
```

---

## 11. Dates & Times

- All timestamps in **ISO 8601 UTC**: `2026-05-29T05:00:00.000Z`
- All durations in **seconds** (integer): `durationSec: 300`
- Never return Unix epoch integers — always ISO strings
- Timezone conversion is a client responsibility

---

## 12. External API Proxying (BigOven / Edamam)

- External API calls always go through `/api/v1/external/{provider}/...` proxy routes
- Proxy strips the vendor API key before forwarding to the client
- Proxy adds `X-StepDish-Source: bigoven` header to cached responses
- Client **never** calls vendor APIs directly
- Proxy responses cached in Redis with TTL: search results 5 min, recipe detail 1 hr
