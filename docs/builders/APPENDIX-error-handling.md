# Appendix C — Error Handling

> **Scope:** Server-side API routes, client-side React components, AI extraction pipeline, and external API integrations across all StepDish tasks.

---

## 1. Principles

1. **Fail visibly, fail gracefully** — every error must be caught, logged, and surfaced to the user in a clear, non-technical way
2. **Never swallow errors silently** — a caught error that goes unreported is worse than an uncaught one
3. **Never expose internals** — stack traces, SQL queries, and env var names must never reach the client
4. **Errors are first-class features** — design empty/error states with the same care as the happy path

---

## 2. Error Code Registry

All API errors use a `SCREAMING_SNAKE_CASE` code. Codes are stable across versions.

### Auth
| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | No valid session or token |
| `FORBIDDEN` | 403 | Authenticated but lacks permission |
| `TOKEN_EXPIRED` | 401 | JWT has expired — client should refresh |
| `SESSION_INVALID` | 401 | Session revoked or corrupted |

### Recipe & Steps
| Code | HTTP | Meaning |
|---|---|---|
| `RECIPE_NOT_FOUND` | 404 | Recipe ID doesn't exist |
| `RECIPE_DUPLICATE_TITLE` | 409 | User already has a recipe with that title |
| `RECIPE_LIMIT_REACHED` | 422 | User hit recipe quota (free tier) |
| `STEP_ORDER_INVALID` | 422 | Step order array has gaps or duplicates |
| `STEP_NOT_FOUND` | 404 | Step ID not in recipe |
| `REVISION_NOT_FOUND` | 404 | Revision ID doesn't exist |

### Import & AI
| Code | HTTP | Meaning |
|---|---|---|
| `IMPORT_URL_UNREACHABLE` | 422 | URL could not be fetched |
| `IMPORT_PARSE_FAILED` | 422 | Page fetched but no recipe content found |
| `AI_EXTRACTION_FAILED` | 502 | LLM returned unparseable output |
| `AI_RATE_LIMIT` | 429 | AI extraction rate limit hit |
| `AI_TIMEOUT` | 504 | LLM did not respond within timeout |

### External APIs
| Code | HTTP | Meaning |
|---|---|---|
| `EXTERNAL_API_ERROR` | 502 | BigOven / Edamam returned an error |
| `EXTERNAL_API_TIMEOUT` | 504 | Vendor API did not respond in time |
| `EXTERNAL_QUOTA_EXCEEDED` | 429 | Vendor API quota exhausted |

### Validation & General
| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod schema validation failed |
| `NOT_FOUND` | 404 | Generic resource not found |
| `CONFLICT` | 409 | Generic conflict |
| `RATE_LIMITED` | 429 | Rate limit hit (see Appendix B) |
| `INTERNAL_ERROR` | 500 | Unexpected server fault |

---

## 3. Server-Side Error Handling

### Global API Error Handler

All Next.js route handlers are wrapped with a `withErrorHandler` HOF:

```ts
// src/lib/api/withErrorHandler.ts
export function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (err) {
      return handleError(err);
    }
  };
}

function handleError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    logger.warn({ code: err.code, message: err.message });
    return NextResponse.json(
      { ok: false, error: { code: err.code, message: err.message } },
      { status: err.httpStatus }
    );
  }
  // Unknown error — log full details server-side, return generic client message
  logger.error({ err }, 'Unhandled error');
  return NextResponse.json(
    { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } },
    { status: 500 }
  );
}
```

### AppError Class

```ts
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly httpStatus: number = 400,
    public readonly field?: string
  ) {
    super(message);
  }
}

// Usage
throw new AppError('RECIPE_NOT_FOUND', 'Recipe not found.', 404);
throw new AppError('VALIDATION_ERROR', 'Title is required.', 400, 'title');
```

---

## 4. AI Pipeline Error Handling

AI extraction has multiple potential failure points. Each is handled explicitly:

```
URL fetch
  └─ NetworkError     → IMPORT_URL_UNREACHABLE (422)
HTML parse
  └─ NoContentError   → IMPORT_PARSE_FAILED (422)
LLM call
  ├─ Timeout (>15s)   → AI_TIMEOUT (504) — retry once, then fail
  ├─ RateLimit        → AI_RATE_LIMIT (429) — return Retry-After
  └─ BadOutput        → AI_EXTRACTION_FAILED (502) — return partial if possible
Schema validation
  └─ ValidationError  → Return raw text for manual editing
```

- **Partial extraction is always preferred over full failure** — if title + ingredients are found but steps failed, return what was extracted and mark `extractionConfidence: 'partial'`
- Every LLM response must be validated through a Zod schema before being written to DB
- Retry strategy: 1 automatic retry with 2s back-off for `AI_TIMEOUT` only

---

## 5. External API Error Handling

```ts
async function fetchBigOvenRecipe(id: string) {
  const res = await fetchWithTimeout(`${BIGOVEN_BASE}/recipe/${id}`, {
    headers: { 'X-Api-Key': process.env.BIGOVEN_KEY },
    timeoutMs: 8000,
  });

  if (res.status === 429) throw new AppError('EXTERNAL_QUOTA_EXCEEDED', 'Recipe source quota reached.', 429);
  if (res.status === 404) throw new AppError('RECIPE_NOT_FOUND', 'Recipe not found in source.', 404);
  if (!res.ok) throw new AppError('EXTERNAL_API_ERROR', 'Recipe source is unavailable.', 502);

  return res.json();
}
```

- Timeout on all external calls: **8 seconds**
- Never propagate vendor error messages to the client
- Cache successful responses to reduce blast radius of vendor outages

---

## 6. Client-Side Error Handling

### API Fetch Wrapper

```ts
// src/lib/client/api.ts
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const body = await res.json();
  if (!body.ok) throw new ApiError(body.error.code, body.error.message, res.status);
  return body.data as T;
}
```

### React Error Boundaries

- Every top-level page route wrapped in `<PageErrorBoundary>` — shows friendly full-page error with retry button
- Cook Mode wrapped in `<CookModeErrorBoundary>` — preserves step progress, shows inline error
- Recipe editor wrapped in `<EditorErrorBoundary>` — auto-saves draft to memory before surfacing error

### Toast vs Inline Errors

| Error type | UI pattern |
|---|---|
| Form validation | Inline, below the relevant field, in `--color-error` |
| Failed save (network) | Inline banner above form with retry button |
| Import failure | Inline in import panel with actionable message |
| Background job failure | Toast notification (low urgency) |
| Session expired | Full-page redirect to login with return URL |
| 500 from server | Inline error banner — "Something went wrong, please try again" |

---

## 7. Logging Standards

- Logger: **Pino** (structured JSON)
- Log levels: `error` (unhandled), `warn` (AppError), `info` (key actions), `debug` (dev only)
- Every log entry must include: `timestamp`, `level`, `requestId`, `userId` (if auth'd), `code`, `message`
- **Never log**: passwords, tokens, full request bodies containing PII, raw LLM prompts with user content

```ts
logger.warn({ requestId, userId, code: 'RECIPE_NOT_FOUND' }, 'Recipe lookup failed');
logger.error({ requestId, err }, 'Unhandled error in recipe handler');
```

---

## 8. Monitoring & Alerting

| Signal | Threshold | Action |
|---|---|---|
| `INTERNAL_ERROR` rate | > 1% of requests / 5 min | PagerDuty alert |
| `AI_EXTRACTION_FAILED` rate | > 20% of extractions / 1 hr | Slack alert |
| `EXTERNAL_API_ERROR` rate | > 10% of vendor calls / 5 min | Slack alert |
| P99 API latency | > 2 s | Slack warning |
| DB connection pool exhausted | Any occurrence | PagerDuty alert |
