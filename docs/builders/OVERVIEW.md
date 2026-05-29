# StepDish — AI Builder Task Overview

> **For AI coding agents.** This document is the entry point. Read this first, then open the relevant `TASK_SPEC.md` section before writing any code.
>
> **Version 1.1 | May 2026**

---

## How to Use These Documents

1. Read `OVERVIEW.md` (this file) to understand scope, phases, and task order.
2. Read `CONVENTIONS.md` before writing a single line of code.
3. For each task, open `TASK_SPEC.md` and find the matching Task ID.
4. Complete the task, run the test cases listed, then mark the task done.
5. Never skip a task or reorder tasks within a phase without checking dependencies.
6. For infrastructure decisions, region choices, and cost estimates see [`docs/infra/INFRA.md`](../infra/INFRA.md).

---

## Project Summary

StepDish is a structured recipe management web application. Users create, update, and browse recipes as step-by-step workflows with ingredients, equipment, timers, and reminders. Recipes can also be imported from URLs and processed by an AI extraction pipeline.

**Core tech stack:**
- **Frontend:** Next.js 14 (App Router, TypeScript)
- **Backend:** Next.js API Routes (REST)
- **Database:** PostgreSQL via Prisma ORM — deploy on **Railway or Supabase, Singapore region** (`ap-southeast-1`) for low latency from Hong Kong
- **Auth:** Clerk (50,000 MAU free tier)
- **AI:** OpenAI GPT-4o — called **server-side via Vercel API routes only** (never from client). Vercel servers originate the request outside HK, making this HK-safe. See [`docs/infra/INFRA.md`](../infra/INFRA.md) for details and Azure OpenAI fallback.
- **Storage:** Cloudflare R2 (images) — zero egress fees, HK edge PoP
- **Search:** PostgreSQL full-text (Phase 1), Typesense (Phase 3)
- **Hosting:** Vercel — deploy to **Singapore (`sin1`) region** for optimal HK latency

> ⚠️ **HK Developer Note:** OpenAI blocks direct API calls originating from Hong Kong IP addresses. This is a non-issue for production (API calls come from Vercel servers, not your machine), but you cannot test AI extraction locally without a VPN or Azure OpenAI fallback. See [`docs/infra/INFRA.md § OpenAI & HK`](../infra/INFRA.md) for the full solution.

---

## Task Status Legend

| Symbol | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |
| `[!]` | Blocked (dependency not met) |

---

## Phase 1 — Core (Tasks T-001 to T-022)

> Goal: A working recipe editor with auth, structured steps, timers, and a public browse page.

### Setup & Infrastructure

- [ ] **T-001** — Initialise Next.js project with TypeScript, ESLint, Prettier
- [ ] **T-002** — Configure PostgreSQL database and Prisma ORM
- [ ] **T-003** — Define and run database schema migrations (all Phase 1 tables)
- [ ] **T-004** — Integrate Clerk authentication (sign up, log in, session)
- [ ] **T-005** — Set up Cloudflare R2 storage client and image upload utility

### Recipe Editor

- [ ] **T-006** — Recipe CRUD API routes (`/api/recipes`)
- [ ] **T-007** — Recipe Step CRUD API routes (`/api/recipes/[id]/steps`)
- [ ] **T-008** — Equipment tag API routes and canonical tag seed data
- [ ] **T-009** — Recipe Editor UI — header form (title, cuisine, servings, time, visibility)
- [ ] **T-010** — Recipe Editor UI — step list with drag-and-drop reorder
- [ ] **T-011** — Step Edit Drawer UI (action, ingredients, duration, equipment, reminder, notes)
- [ ] **T-012** — Recipe-level equipment list (auto-compiled from steps)
- [ ] **T-013** — Revision history — API and UI (create revision on save, list, preview, restore)
- [ ] **T-014** — Auto-save draft (debounced, no data loss on close)

### Cook Mode

- [ ] **T-015** — Cook Mode UI — step-by-step view with step progress bar
- [ ] **T-016** — Per-step countdown timer (start, pause, resume, complete alert)
- [ ] **T-017** — Parallel timers — floating timer bar with multiple active timers
- [ ] **T-018** — Reminder alert overlay (fires at timer completion, dismissible)

### Browse & Discover

- [ ] **T-019** — Public recipe gallery page (cards, pagination, mobile layout)
- [ ] **T-020** — Recipe detail page (full steps, ingredients, equipment, check-off)
- [ ] **T-021** — Search bar with debounced full-text query
- [ ] **T-022** — Filter panel (time, cuisine, difficulty, equipment, ingredients on hand)

---

## Phase 2 — Import & Enrichment (Tasks T-023 to T-031)

> Goal: AI-powered URL/article import with structured step extraction and review.

- [ ] **T-023** — Import UI — URL/text input form
- [ ] **T-024** — AI extraction service (fetch, clean, segment, classify, equipment detection)
- [ ] **T-025** — Confidence scoring and flagging logic
- [ ] **T-026** — AI Review Queue UI (step cards with confidence indicators, edit flagged steps)
- [ ] **T-027** — Save imported recipe to user collection
- [ ] **T-028** — Ingredient normalization (unit conversion, quantity parsing, synonym matching)
- [ ] **T-029** — Save-to-collection (bookmark public recipe)
- [ ] **T-030** — Remix (copy any recipe to personal editor)
- [ ] **T-031** — Ingredient match scoring for browse filter (full / partial / no match)

---

## Phase 3 — Discovery & Scale (Tasks T-032 to T-040)

> Goal: Ratings, comments, analytics, and search scale.

- [ ] **T-032** — Recipe rating system (1–5 stars, one per user, editable)
- [ ] **T-033** — Comment threads (create, edit, delete, author pin)
- [ ] **T-034** — Author analytics dashboard (views, saves, remixes, ratings, 30-day trend)
- [ ] **T-035** — Typesense search integration (replace PostgreSQL FTS)
- [ ] **T-036** — Publisher/API source connector (BigOven or Edamam)
- [ ] **T-037** — Offline cook mode (Service Worker, cache recipe steps)
- [ ] **T-038** — Push notifications for timer alerts (Web Push API)
- [ ] **T-039** — Recipe image generation (AI-generated hero image on import)
- [ ] **T-040** — Admin content moderation panel

---

## Dependency Graph (Phase 1)

```
T-001 (project init)
  └── T-002 (database)
        └── T-003 (schema migrations)
              ├── T-004 (auth) ─────────────────────────────┐
              ├── T-006 (recipe API)                        │
              │     └── T-007 (step API)                    │
              └── T-008 (equipment tags)                    │
                    ├── T-009 (editor header UI) ←──────────┘
                    │     ├── T-010 (step list UI)
                    │     │     └── T-011 (step drawer UI)
                    │     │           ├── T-012 (equipment list)
                    │     │           ├── T-013 (revision history)
                    │     │           └── T-014 (auto-save)
                    │     └── T-015 (cook mode UI)
                    │           ├── T-016 (timers)
                    │           └── T-017 (parallel timers)
                    │                 └── T-018 (reminder alert)
                    └── T-005 (R2 storage)
                          └── T-019 (browse page)
                                ├── T-020 (recipe detail)
                                ├── T-021 (search bar)
                                └── T-022 (filter panel)
```

---

## Key Constraints for AI Agents

- **Never modify existing migrations.** Add a new migration file instead.
- **Never commit secrets.** All credentials go in `.env.local` (never committed). Use `.env.example` for documentation.
- **Test cases must pass before marking a task complete.** See `TASK_SPEC.md` for per-task test cases.
- **One task per commit.** Commit message format: `feat(T-XXX): short description`.
- **TypeScript strict mode is on.** No `any` types without an explicit comment explaining why.
- **Read `CONVENTIONS.md` before writing UI components.** Design tokens and component patterns are defined there.
- **Never call OpenAI from the client or from a local dev machine without a VPN.** All AI calls must go through server-side API routes. See [`docs/infra/INFRA.md`](../infra/INFRA.md).

---

*Overview updated May 2026. For infra spec and cost estimates see [`docs/infra/INFRA.md`](../infra/INFRA.md).*
