# 📋 StepDish — AI Agent Progress Board

> **This is the single source of truth for build progress.**
>
> 🤖 **If you are an AI agent:**
> 1. Read this file at the start of every session.
> 2. Find the **first unchecked task** `[ ]` in the lowest-numbered phase.
> 3. Read its linked spec doc before writing any code.
> 4. When done, **edit this file** and change `[ ]` → `[x]` for that task.
> 5. Commit the update with message: `progress(T-XXX): mark complete`.
>
> ⚠️ Never skip a task. Never mark done without passing all test cases in [`docs/builders/TASK_SPEC.md`](./docs/builders/TASK_SPEC.md).

---

## 🔦 Current Assignment

> **Auto-derived:** The next task is the first `[ ]` below.
> AI agents: scan down from Phase 1 → Phase 2 → Phase 3 and take the first open task.

---

## Phase 1 — Core MVP

> **Goal:** Working recipe editor with auth, structured steps, timers, and a public browse page.
> **Target:** T-001 → T-022

### 🏗️ Setup & Infrastructure

| ID | Task | Spec | Status | Notes |
|---|---|---|---|---|
| T-001 | Initialise Next.js project (TypeScript, ESLint, Prettier) | [T-01](./docs/builders/T-01-project-setup.md) | `[ ]` | Start here |
| T-002 | Configure CockroachDB Serverless + Prisma ORM | [T-03 schema](./docs/builders/T-03-database-schema.md) | `[ ]` | Requires T-001 |
| T-003 | Define & run database schema migrations | [T-03 schema](./docs/builders/T-03-database-schema.md) | `[ ]` | Requires T-002 |
| T-004 | Integrate Clerk authentication | [T-02 auth](./docs/builders/T-02-auth.md) | `[ ]` | Requires T-003 |
| T-005 | Set up Cloudflare R2 storage client & image upload | [T-18 api](./docs/builders/T-18-api-integration.md) | `[ ]` | Requires T-003 |

### 🍳 Recipe Editor

| ID | Task | Spec | Status | Notes |
|---|---|---|---|---|
| T-006 | Recipe CRUD API routes (`/api/recipes`) | [TASK_SPEC](./docs/builders/TASK_SPEC.md) | `[ ]` | Requires T-003 |
| T-007 | Recipe Step CRUD API routes | [T-05 step](./docs/builders/T-05-step-model.md) | `[ ]` | Requires T-006 |
| T-008 | Equipment tag API routes + seed data | [TASK_SPEC](./docs/builders/TASK_SPEC.md) | `[ ]` | Requires T-003 |
| T-009 | Recipe Editor UI — header form | [T-04 editor](./docs/builders/T-04-recipe-editor.md) | `[ ]` | Requires T-004 + T-008 |
| T-010 | Recipe Editor UI — step list with drag-and-drop | [T-04 editor](./docs/builders/T-04-recipe-editor.md) | `[ ]` | Requires T-009 |
| T-011 | Step Edit Drawer UI | [T-05 step](./docs/builders/T-05-step-model.md) | `[ ]` | Requires T-010 |
| T-012 | Recipe-level equipment list (auto-compiled) | [T-12 equipment](./docs/builders/T-12-equipment-filter.md) | `[ ]` | Requires T-011 |
| T-013 | Revision history — API + UI | [T-09 revision](./docs/builders/T-09-revision-history.md) | `[ ]` | Requires T-011 |
| T-014 | Auto-save draft (debounced) | [T-04 editor](./docs/builders/T-04-recipe-editor.md) | `[ ]` | Requires T-011 |

### 🧑‍🍳 Cook Mode

| ID | Task | Spec | Status | Notes |
|---|---|---|---|---|
| T-015 | Cook Mode UI — step-by-step view | [T-08 detail](./docs/builders/T-08-recipe-detail.md) | `[ ]` | Requires T-009 |
| T-016 | Per-step countdown timer | [T-06 timers](./docs/builders/T-06-timers-reminders.md) | `[ ]` | Requires T-015 |
| T-017 | Parallel timers — floating timer bar | [T-06 timers](./docs/builders/T-06-timers-reminders.md) | `[ ]` | Requires T-016 |
| T-018 | Reminder alert overlay | [T-06 timers](./docs/builders/T-06-timers-reminders.md) | `[ ]` | Requires T-017 |

### 🔍 Browse & Discover

| ID | Task | Spec | Status | Notes |
|---|---|---|---|---|
| T-019 | Public recipe gallery page | [T-07 browse](./docs/builders/T-07-public-browse.md) | `[ ]` | Requires T-005 |
| T-020 | Recipe detail page | [T-08 detail](./docs/builders/T-08-recipe-detail.md) | `[ ]` | Requires T-019 |
| T-021 | Search bar (debounced full-text) | [T-07 browse](./docs/builders/T-07-public-browse.md) | `[ ]` | Requires T-019 |
| T-022 | Filter panel (time, cuisine, equipment, ingredients) | [T-13 ingredient](./docs/builders/T-13-ingredient-filter.md) | `[ ]` | Requires T-019 |

---

## Phase 2 — Import & AI Enrichment

> **Goal:** AI-powered URL/article import with structured step extraction and review.
> **Target:** T-023 → T-031
> ⛔ Do not start Phase 2 until all Phase 1 tasks are `[x]`.

| ID | Task | Spec | Status | Notes |
|---|---|---|---|---|
| T-023 | Import UI — URL / text input form | [T-10 import](./docs/builders/T-10-import-flow.md) | `[ ]` | Requires Phase 1 done |
| T-024 | AI extraction service (fetch, clean, classify) | [T-11 AI](./docs/builders/T-11-ai-extraction-tuning.md) | `[ ]` | Requires T-023 |
| T-025 | Confidence scoring & flagging logic | [T-11 AI](./docs/builders/T-11-ai-extraction-tuning.md) | `[ ]` | Requires T-024 |
| T-026 | AI Review Queue UI | [T-11 AI](./docs/builders/T-11-ai-extraction-tuning.md) | `[ ]` | Requires T-025 |
| T-027 | Save imported recipe to user collection | [T-10 import](./docs/builders/T-10-import-flow.md) | `[ ]` | Requires T-026 |
| T-028 | Ingredient normalization (unit, quantity, synonym) | [T-13 ingredient](./docs/builders/T-13-ingredient-filter.md) | `[ ]` | Requires T-024 |
| T-029 | Save-to-collection (bookmark public recipe) | [T-07 browse](./docs/builders/T-07-public-browse.md) | `[ ]` | Requires T-020 |
| T-030 | Remix (copy any recipe to personal editor) | [T-04 editor](./docs/builders/T-04-recipe-editor.md) | `[ ]` | Requires T-029 |
| T-031 | Ingredient match scoring for browse filter | [T-13 ingredient](./docs/builders/T-13-ingredient-filter.md) | `[ ]` | Requires T-028 |

---

## Phase 3 — Discovery & Scale

> **Goal:** Ratings, comments, analytics, SEO, push notifications, and search scale.
> **Target:** T-032 → T-040
> ⛔ Do not start Phase 3 until all Phase 2 tasks are `[x]`.
> 🔄 **Migrate DB** from CockroachDB Serverless → Supabase (Singapore) before T-035. See [`docs/infra/INFRA.md`](./docs/infra/INFRA.md).

| ID | Task | Spec | Status | Notes |
|---|---|---|---|---|
| T-032 | Recipe rating system (1–5 stars) | [TASK_SPEC](./docs/builders/TASK_SPEC.md) | `[ ]` | Requires Phase 2 done |
| T-033 | Comment threads (create, edit, delete, pin) | [TASK_SPEC](./docs/builders/TASK_SPEC.md) | `[ ]` | Requires T-032 |
| T-034 | Author analytics dashboard | [T-15 analytics](./docs/builders/T-15-analytics-dashboard.md) | `[ ]` | Requires T-032 |
| T-035 | Typesense search integration | [TASK_SPEC](./docs/builders/TASK_SPEC.md) | `[ ]` | Requires DB migration |
| T-036 | Publisher / API source connector (BigOven/Edamam) | [T-18 api](./docs/builders/T-18-api-integration.md) | `[ ]` | Requires T-035 |
| T-037 | Offline cook mode (Service Worker) | [T-14 cook mode](./docs/builders/T-14-cook-mode-polish.md) | `[ ]` | Requires T-018 |
| T-038 | Push notifications for timer alerts | [T-20 push](./docs/builders/T-20-push-notifications.md) | `[ ]` | Requires T-037 |
| T-039 | Recipe image generation + `pgvector` similarity search | [T-11 AI](./docs/builders/T-11-ai-extraction-tuning.md) | `[ ]` | Requires Supabase migration |
| T-040 | Admin content moderation panel | [TASK_SPEC](./docs/builders/TASK_SPEC.md) | `[ ]` | Requires T-033 |

---

## ✅ Completion Checklist (per task)

Before changing any task from `[ ]` to `[x]`, confirm all of the following:

- [ ] All test cases in [`docs/builders/TASK_SPEC.md`](./docs/builders/TASK_SPEC.md) pass for this task ID
- [ ] Definition of Done in [`docs/builders/APPENDIX-definition-of-done.md`](./docs/builders/APPENDIX-definition-of-done.md) is met
- [ ] TypeScript strict mode — no unresolved errors
- [ ] API conventions followed per [`docs/builders/APPENDIX-api-conventions.md`](./docs/builders/APPENDIX-api-conventions.md)
- [ ] No secrets committed (all in `.env.local`)
- [ ] Commit message format: `feat(T-XXX): short description`
- [ ] `PROGRESS.md` updated: task marked `[x]`, committed with `progress(T-XXX): mark complete`

---

## 📊 Progress Summary

> Auto-count: update these numbers each time you mark a task done.

| Phase | Total | Done | Remaining |
|---|---|---|---|
| Phase 1 — Core MVP | 22 | 0 | 22 |
| Phase 2 — Import & AI | 9 | 0 | 9 |
| Phase 3 — Discovery & Scale | 9 | 0 | 9 |
| **Total** | **40** | **0** | **40** |

---

## 🗂️ Status Legend

| Symbol | Meaning |
|---|---|
| `[ ]` | Not started — available to pick up |
| `[~]` | In progress — currently being worked on |
| `[x]` | Complete — all tests passed |
| `[!]` | Blocked — dependency not yet complete |

---

*Board initialised 2026-05-29. Maintained by AI agents — update on every task completion.*
