# StepDish — AI Builder's Guide

> **Version 1.0 | May 2026**
> This document is the single source of truth for any AI agent or developer building StepDish.
> Follow tasks in order unless a task is explicitly marked as parallelisable.

---

## How to use this guide

1. Read the **Overview Task List** below to understand the full build sequence.
2. Open the individual task file for the task you are working on.
3. Complete **all acceptance criteria** before marking a task done.
4. Run the **test cases** listed in each task file and confirm all pass.
5. Commit with the conventional commit format: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
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
| T-11 | AI Extraction Pipeline | 2 | T-10 | `T-11-ai-extraction.md` |
| T-12 | Equipment Filter | 2 | T-07, T-05 | `T-12-equipment-filter.md` |
| T-13 | Ingredient Filter (Fridge Mode) | 2 | T-07, T-03 | `T-13-ingredient-filter.md` |
| T-14 | Cook Mode | 2 | T-06, T-08 | `T-14-cook-mode.md` |
| T-15 | Analytics Dashboard | 3 | T-07, T-08 | `T-15-analytics.md` |

---

## Conventions

### Commit format
```
feat(scope): short description
fix(scope): short description
test(scope): short description
docs(scope): short description
chore(scope): short description
```
Example: `feat(auth): add Google OAuth login`

### Branch naming
```
feature/T-01-project-setup
feature/T-02-auth
fix/T-04-recipe-save-bug
```

### Definition of Done (applies to every task)
- [ ] All acceptance criteria in the task file are met
- [ ] All test cases pass
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] No ESLint errors
- [ ] Mobile layout verified at 375px
- [ ] Desktop layout verified at 1280px
- [ ] Code committed with correct commit message
- [ ] PR opened against `main` with task number in title

---

## Tech Stack Reference

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 14+ (App Router) | SSR for browse/SEO, client for editor |
| Styling | Tailwind CSS v4 | Use design tokens from `styles/tokens.css` |
| Backend | Next.js API Routes or separate Fastify | Keep API routes thin — logic in service layer |
| Database | PostgreSQL | Use Prisma ORM |
| Auth | Clerk | Social login + JWT sessions |
| AI | OpenAI GPT-4o API | Via server-side API routes only — never expose key to client |
| Search | PostgreSQL full-text (Phase 1) | Upgrade to Typesense in Phase 3 |
| Storage | Cloudflare R2 | Recipe images only |
| Hosting | Vercel (frontend) + Railway (API/DB) | |

---

## File Structure

```
stepdish/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth pages (login, signup)
│   ├── (public)/               # Public browse, recipe detail
│   ├── (dashboard)/            # Authenticated user pages
│   └── api/                    # API routes
│       ├── recipes/
│       ├── steps/
│       ├── import/
│       └── ai/
├── components/
│   ├── ui/                     # Base UI components (Button, Input, Card)
│   ├── recipe/                 # Recipe-specific components
│   ├── step/                   # Step editor, step card
│   ├── browse/                 # Browse page, filter panel
│   └── cook/                   # Cook mode components
├── lib/
│   ├── db/                     # Prisma client + query helpers
│   ├── ai/                     # AI extraction service
│   ├── auth/                   # Auth helpers
│   └── utils/                  # Shared utilities
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed data
├── styles/
│   └── tokens.css              # Design tokens (colours, spacing, type)
├── docs/
│   └── builders/               # This guide
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

*Batch 1 covers T-01 through T-05. See subsequent batch files for T-06 onwards.*
