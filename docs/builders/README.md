# StepDish — AI Builder's Guide

> **Version 1.2 | May 2026**
> This document is the single source of truth for any AI agent or developer building StepDish.
> Follow tasks in order unless a task is explicitly marked as parallelisable.

---

## How to use this guide

1. Read the **Overview Task List** below to understand the full build sequence.
2. Open the individual task file for the task you are working on (e.g. `T-01-project-setup.md`).
3. Complete **all acceptance criteria** before marking a task done — see [Appendix D — Definition of Done](./APPENDIX-definition-of-done.md) for the full checklist.
4. Run the **test cases** listed in each task file and confirm all pass.
5. Commit with the conventional commit format: `feat(T-XX):`, `fix(T-XX):`, `docs:`, `test(T-XX):`, `chore:` (see Conventions below).
6. Move to the next task.

---

## Overview Task List

| # | Task | Phase | Depends on | File |
|---|---|---|---|---|
| T-01 | Project Setup & Repo Structure | 1 | — | `T-01-project-setup.md` |
| T-02 | Authentication (Sign Up / Log In) | 1 | T-01 | `T-02-auth.md` |
| T-03 | Database Schema | 1 | T-01 | `T-03-database-schema.md` |
| T-04 | Recipe Editor — Core | 1 | T-02, T-03 | `T-04-recipe-editor.md` |
| T-05 | Step Model & Step Editor Drawer | 1 | T-04 | `T-05-step-model.md` |
| T-06 | Timers & Reminders | 1 | T-05 | `T-06-timers-reminders.md` |
| T-07 | Public Browse Page | 1 | T-03 | `T-07-public-browse.md` |
| T-08 | Recipe Detail Page | 1 | T-07 | `T-08-recipe-detail.md` |
| T-09 | Revision History | 1 | T-04 | `T-09-revision-history.md` |
| T-10 | Import Flow — URL & Text | 2 | T-04 | `T-10-import-flow.md` |
| T-11 | AI Extraction Pipeline | 2 | T-10 | `T-11-ai-extraction-tuning.md` |
| T-12 | Equipment Filter | 2 | T-07, T-05 | `T-12-equipment-filter.md` |
| T-13 | Ingredient Filter (Fridge Mode) | 2 | T-07, T-03 | `T-13-ingredient-filter.md` |
| T-14 | Cook Mode Polish | 2 | T-06, T-08 | `T-14-cook-mode-polish.md` |
| T-15 | Analytics Dashboard | 3 | T-07, T-08 | `T-15-analytics-dashboard.md` |
| T-16 | Dietary Tags & Filters | 3 | T-07, T-03 | `T-16-dietary-tags.md` |
| T-17 | SEO & JSON-LD Structured Data | 3 | T-08 | `T-17-seo-json-ld.md` |
| T-18 | Licensed API Integration | 3 | T-10 | `T-18-api-integration.md` |
| T-19 | User Profile & Public Page | 3 | T-02, T-07 | `T-19-user-profile.md` |
| T-20 | Push Notifications | 3 | T-06, T-14 | `T-20-push-notifications.md` |

---

## Conventions

### 🚨 Source Code Location (Mandatory)

> **All application source code must be placed inside the `/src` folder.**

This is a hard rule with no exceptions for code files:

```
/src                         ← ALL code goes here
  /src/app/                  ← Next.js App Router (pages, layouts, API routes)
  /src/components/           ← UI components
  /src/lib/                  ← Services, helpers, AI, auth, Prisma client
  /src/styles/               ← Design tokens and global CSS
  /src/types/                ← Shared TypeScript types
```

The only files **allowed outside `/src`** are:
- `prisma/` — schema and migrations (Prisma CLI requirement)
- `tests/` — test files (Vitest / Playwright convention)
- `docs/` — documentation only
- Root config files: `next.config.ts`, `tsconfig.json`, `package.json`, `.env.local`, `tailwind.config.ts`, `vitest.config.ts`, `playwright.config.ts`

**Never create `.ts`, `.tsx`, `.js`, or `.css` source files at the repo root or in any folder other than `/src` (and the explicit exceptions above).**

---

### Commit format

Include the task number in every feat/fix/test/refactor commit so changes are traceable to specs.

```
feat(T-XX): short description
fix(T-XX): short description
test(T-XX): short description
refactor(T-XX): short description
docs: short description
chore: short description
```

Examples:
- `feat(T-02): add Google OAuth login`
- `fix(T-05): correct step order after deletion`
- `docs: update README task table`

### Branch naming

```
feature/T-01-project-setup
feature/T-02-auth
fix/T-04-recipe-save-bug
```

### Definition of Done

See **[Appendix D — Definition of Done](./APPENDIX-definition-of-done.md)** for the full authoritative checklist (covers code quality, testing, API/data, UI/accessibility, performance, security, docs, and review).

Quick reference — a task is **not** done until:
- All acceptance criteria in the task file are met
- All test cases pass (`pnpm test`)
- No TypeScript errors (`pnpm typecheck`)
- No ESLint errors (`pnpm lint`)
- **All new code files are inside `/src`**
- Mobile layout verified at 375px, desktop at 1280px
- PR opened against `main` with task number in title and passing CI

---

## Tech Stack Reference

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 14+ (App Router) | SSR for browse/SEO, client for editor |
| Styling | Tailwind CSS v4 | Use design tokens from `src/styles/tokens.css` |
| Backend | Next.js API Routes | Keep API routes thin — logic in service layer |
| Database | CockroachDB Serverless (Phase 1) → Supabase (Phase 3) | Prisma ORM, `provider = "cockroachdb"` |
| Auth | Clerk | Social login + JWT sessions |
| AI | OpenAI GPT-4o API | Via server-side API routes in `src/app/api/` only |
| Search | PostgreSQL full-text (Phase 1) | Upgrade to Typesense in Phase 3 |
| Storage | Cloudflare R2 | Recipe images only |
| Testing | Vitest (unit/integration), React Testing Library (components), Playwright (E2E) | See [Appendix A — Testing Standards](./APPENDIX-testing-standards.md) |
| Hosting | Vercel (Singapore `sin1` region) | |

---

## File Structure

```
stepdish/
├── src/                            ← 🚨 ALL source code lives here
│   ├── app/                        ← Next.js App Router
│   │   ├── (auth)/             ← Auth pages (login, signup)
│   │   ├── (public)/           ← Public browse, recipe detail
│   │   ├── (dashboard)/        ← Authenticated user pages
│   │   └── api/                ← API routes
│   │       ├── recipes/
│   │       ├── steps/
│   │       ├── import/
│   │       └── ai/
│   ├── components/
│   │   ├── ui/                 ← Base UI components (Button, Input, Card)
│   │   ├── recipe/             ← Recipe-specific components
│   │   ├── step/               ← Step editor, step card
│   │   ├── browse/             ← Browse page, filter panel
│   │   └── cook/               ← Cook mode components
│   ├── lib/
│   │   ├── db/                 ← Prisma client + query helpers
│   │   ├── ai/                 ← AI extraction service
│   │   ├── auth/               ← Auth helpers
│   │   ├── schemas/            ← Zod validation schemas
│   │   └── utils/              ← Shared utilities
│   ├── styles/
│   │   └── tokens.css          ← Design tokens (colours, spacing, type)
│   └── types/                  ← Shared TypeScript type definitions
├── prisma/                         ← schema.prisma + migrations (Prisma CLI exception)
│   ├── schema.prisma
│   └── seed.ts
├── tests/                          ← Test files (Vitest / Playwright exception)
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                           ← Documentation only (no source code)
│   └── builders/
│       ├── README.md           ← You are here
│       ├── OVERVIEW.md
│       ├── TASK_SPEC.md
│       ├── T-01 … T-20
│       └── APPENDIX-*.md
├── next.config.ts                  ← Root config files only
├── tsconfig.json
├── tailwind.config.ts
├── package.json
└── .env.local                      ← Never committed
```

> ⚠️ **Rule:** If you are creating a `.ts`, `.tsx`, `.js`, or `.css` file and it is not a root config file, it belongs inside `/src`. No exceptions.

---

## Appendix Index

| Appendix | File | Covers |
|---|---|---|
| A | [APPENDIX-testing-standards.md](./APPENDIX-testing-standards.md) | Unit, integration, component, E2E, AI golden-file, CI pipeline |
| B | [APPENDIX-api-conventions.md](./APPENDIX-api-conventions.md) | URL structure, HTTP methods, response envelope, pagination, auth, rate limits |
| C | [APPENDIX-error-handling.md](./APPENDIX-error-handling.md) | Error code registry, AppError class, AI pipeline errors, client error handling, logging |
| D | [APPENDIX-definition-of-done.md](./APPENDIX-definition-of-done.md) | Full DoD checklist, conventional commit reference, fast-track rules |

---

*For the full multi-phase plan (T-001 to T-040), see [OVERVIEW.md](./OVERVIEW.md).*
