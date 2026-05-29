# Appendix D — Definition of Done (DoD)

> **Scope:** A task (T-01 through T-20 and beyond) is only **Done** when every item on this checklist is satisfied. "It works on my machine" is not Done.

---

## 1. Why This Matters

The DoD is the team's shared contract. Without it, "done" means different things to different people, leading to debt that compounds with every sprint. Every item exists because it has caused a real problem on a real project.

---

## 2. The Checklist

### Code Quality
- [ ] Code follows the project's ESLint + Prettier config — `pnpm lint` passes with zero warnings
- [ ] TypeScript strict mode — `pnpm typecheck` passes with zero errors
- [ ] No `any` types introduced without a `// TODO: remove any` comment and linked issue
- [ ] No `console.log` left in production code paths
- [ ] No commented-out code blocks committed
- [ ] All new environment variables documented in `.env.example` with a description comment

### Testing
- [ ] Unit tests written for all new pure functions and data transformers
- [ ] Integration tests written for all new API routes (happy path + auth boundary + key error cases)
- [ ] Component tests written for new interactive UI components
- [ ] `pnpm test` passes locally with no failures
- [ ] Code coverage did not decrease from the pre-task baseline
- [ ] If AI extraction logic changed: golden-file fixtures updated and diff reviewed

### API & Data
- [ ] New endpoints follow the conventions in [Appendix B — API Conventions](./APPENDIX-api-conventions.md)
- [ ] All error cases use codes from the registry in [Appendix C — Error Handling](./APPENDIX-error-handling.md)
- [ ] New DB migrations are reversible (`down` migration written and tested)
- [ ] No raw SQL — all queries go through Prisma ORM
- [ ] Sensitive fields (passwords, tokens) are never returned in API responses

### UI & Accessibility
- [ ] Feature works at 375px (mobile) and 1280px (desktop)
- [ ] Dark mode verified — no hardcoded colours, all surfaces use CSS tokens
- [ ] All interactive elements have visible focus rings (keyboard navigable)
- [ ] All images have descriptive `alt` text; decorative images have `alt=""`
- [ ] Icon-only buttons have `aria-label`
- [ ] New form inputs have associated `<label>` elements
- [ ] Empty state designed and implemented — no bare "No items" text
- [ ] Loading state designed and implemented — skeleton or spinner present
- [ ] Error state designed and implemented — actionable message, not raw error code

### Performance
- [ ] New images use `loading="lazy"` and have explicit `width` / `height`
- [ ] No new synchronous blocking operations on the main thread
- [ ] Lighthouse score on affected pages did not drop below: Performance 85, Accessibility 95, Best Practices 95
- [ ] No N+1 queries introduced — DB queries verified with Prisma query log in dev

### Security
- [ ] All user-supplied input is validated with Zod before use
- [ ] No direct object references — resource ownership verified server-side before every mutating operation
- [ ] No new secrets hardcoded — all credentials via env vars
- [ ] CSP headers not relaxed without security review

### Documentation
- [ ] The corresponding task spec file (e.g., `T-04-recipe-editor.md`) updated if implementation diverged from spec
- [ ] Any new environment variables added to the onboarding section of `README.md`
- [ ] Public-facing API changes documented in `APPENDIX-api-conventions.md` or the relevant task spec
- [ ] Complex business logic has inline comments explaining *why*, not *what*

### Review & Merge
- [ ] PR description includes: what changed, why, how to test it, screenshots/recordings for UI changes
- [ ] At least 1 peer review approval received
- [ ] All PR review comments resolved or explicitly deferred with a linked issue
- [ ] CI pipeline passes: lint, typecheck, unit/integration tests, E2E tests
- [ ] Branch is rebased on (or merged from) latest `main` — no unresolved conflicts
- [ ] PR is squash-merged with a conventional commit message: `feat(T-04): recipe editor drag-and-drop step reordering`

---

## 3. Conventional Commit Reference

```
feat(T-XX):    new feature
fix(T-XX):     bug fix
docs(T-XX):    documentation only
refactor(T-XX): code change, no behaviour change
test(T-XX):    adding or correcting tests
perf(T-XX):    performance improvement
chore:         tooling, deps, config (no task number needed)
```

---

## 4. Fast-Track Exception

For urgent hotfixes to production, items may be deferred **only with explicit async approval from the tech lead**. Deferred items must be tracked as issues and resolved within the next sprint. The following items can **never** be deferred:
- Security validation
- Auth boundary tests
- No secrets hardcoded
- CI must pass

---

## 5. DoD Review Cadence

The DoD is a living document. It is reviewed at the start of every milestone and updated when:
- A recurring bug class reveals a missing check
- A new tool or standard is adopted by the team
- An item is consistently satisfied automatically by tooling (it can be removed)

Changes to the DoD require agreement from at least 2 team members and are committed with a `docs: update definition of done` commit.
