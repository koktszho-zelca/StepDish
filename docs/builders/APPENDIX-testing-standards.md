# Appendix A — Testing Standards

> **Scope:** Applies to all StepDish backend services, API routes, and frontend components across every task (T-01 to T-20).

---

## 1. Testing Philosophy

Tests exist to give the team confidence to ship. Every test must:
- Assert **observable behaviour**, not implementation details
- Be **readable** — a developer unfamiliar with the feature should understand what it tests in under 30 seconds
- Be **deterministic** — no flakiness, no external network calls, no real database in unit tests
- Be **fast** — unit tests < 50 ms, integration tests < 2 s

---

## 2. Test Types & Coverage Targets

| Type | Tool | Coverage Target | What it tests |
|---|---|---|---|
| **Unit** | Vitest | 80% line coverage | Pure functions, utilities, data transformers, AI extraction helpers |
| **Integration** | Vitest + Supertest | Critical paths 100% | API route handlers, DB queries, auth middleware |
| **Component** | React Testing Library | Core UI 70% | Form inputs, Step editor, Cook Mode, recipe card |
| **E2E** | Playwright | Happy path per feature | Full user flows: register → create recipe → publish → browse |
| **Contract** | Custom schema tests | All external APIs | BigOven / Edamam response shapes validated against saved fixtures |

---

## 3. Unit Testing Rules

```ts
// ✅ Good — tests behaviour
it('splits compound instruction into two atomic steps', () => {
  const result = splitStep('Chop onions then sauté in oil');
  expect(result).toHaveLength(2);
  expect(result[0].action).toBe('chop');
});

// ❌ Bad — tests implementation detail
it('calls splitOnConjunctions internally', () => {
  const spy = vi.spyOn(helpers, 'splitOnConjunctions');
  splitStep('Chop onions then sauté in oil');
  expect(spy).toHaveBeenCalled();
});
```

- Mock all I/O (DB, fetch, timers) with `vi.mock` / `vi.useFakeTimers`
- One `describe` block per module; one `it` per behaviour
- Use `beforeEach` reset, not shared mutable state

---

## 4. Integration Testing Rules

- Use a **test database** (separate `DATABASE_URL_TEST` env var) seeded via `prisma db seed` before each suite
- Wrap each test in a transaction rolled back after — never leave dirty state
- Test the full HTTP stack: `POST /api/recipes` → assert status, body, and database row
- Always test **auth boundaries**: unauthenticated request must return `401`, wrong-user request must return `403`

```ts
describe('POST /api/recipes', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/recipes').send(validPayload);
    expect(res.status).toBe(401);
  });

  it('creates recipe and returns 201 with id', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${testToken}`)
      .send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
```

---

## 5. Component Testing Rules

- Use React Testing Library — **no Enzyme**, no direct DOM manipulation
- Query by **accessible roles/labels** (`getByRole`, `getByLabelText`), not CSS selectors or `data-testid` unless no semantic alternative exists
- Test user interactions with `userEvent`, not `fireEvent`
- Mock Next.js router with `jest-environment-jsdom` + `next-router-mock`

```tsx
it('adds a new step when Add Step button is clicked', async () => {
  render(<StepEditor steps={[]} onChange={mockOnChange} />);
  await userEvent.click(screen.getByRole('button', { name: /add step/i }));
  expect(mockOnChange).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ action: '' })])
  );
});
```

---

## 6. E2E Testing Rules

- Located in `/e2e/` directory, run against a local `next dev` server seeded with fixture data
- Each spec is fully **self-contained** — creates its own user, its own recipe
- Use `page.getByRole` and `page.getByLabel` — never XPath or CSS class selectors
- Run in CI on every PR targeting `main`; locally on demand via `pnpm e2e`

**Core E2E suites (mandatory):**
1. Auth — register, login, logout, session expiry
2. Recipe CRUD — create, edit, publish, delete
3. Step editor — add, reorder, set timer, set reminder
4. Import flow — URL import, AI extraction review, save
5. Browse + Detail — search, filter by tag/equipment, open detail page
6. Cook Mode — step through recipe, timer fires, mark complete

---

## 7. AI Extraction Testing

Because LLM outputs are non-deterministic, AI tests use **golden-file snapshots**:

```
tests/fixtures/extraction/
  carbonara-article.html       # raw input
  carbonara-expected.json      # expected normalised recipe
```

- Run with `OPENAI_API_KEY` mocked — never hit real LLM in CI
- If the extraction prompt changes, regenerate golden files and commit the diff for review
- Acceptance threshold: ≥ 90% field match on a set of 20 fixture recipes

---

## 8. CI Pipeline

```yaml
# .github/workflows/test.yml (summary)
jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    steps:
      - pnpm install
      - pnpm db:migrate:test
      - pnpm test --coverage
      - upload-artifact: coverage/

  e2e:
    runs-on: ubuntu-latest
    needs: unit-and-integration
    steps:
      - pnpm install
      - pnpm build
      - pnpm e2e
```

- PRs cannot merge if any test fails
- Coverage report posted as PR comment
- E2E runs only after unit/integration pass (fail-fast)

---

## 9. File Naming Conventions

| Type | Location | Pattern |
|---|---|---|
| Unit | `src/**/__tests__/` | `*.test.ts` |
| Component | `src/components/**/__tests__/` | `*.test.tsx` |
| Integration | `tests/integration/` | `*.integration.test.ts` |
| E2E | `e2e/` | `*.spec.ts` |
| Fixtures | `tests/fixtures/` | descriptive folder per feature |
