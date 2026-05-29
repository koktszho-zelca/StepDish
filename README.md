# 🍳 StepDish — Project Navigation

> **StepDish** is a structured recipe workspace where users record, update, and cook from step-by-step recipes — with ingredients, actions, durations, timers, and reminders — and browse an AI-enriched recipe catalog online.

---

## 🤖 For AI Agents — Read This First

This file is the **single entry point** for navigating the StepDish repository. Before writing any code or modifying any file, read the relevant docs in the order listed below. Each section tells you exactly where to go for a given concern.

> **Golden rule:** If a doc exists for your task, follow it. Do not invent conventions.

---

## 📁 Repository Structure

```
/
├── README.md                        ← You are here. Start here every session.
├── docs/
│   ├── PROPOSAL.md                  ← Product vision, goals, source strategy
│   ├── builders/                    ← Build instructions for AI agents
│   │   ├── README.md                ← Agent operating rules & session checklist
│   │   ├── OVERVIEW.md              ← 40-task build plan + dependency graph
│   │   ├── TASK_SPEC.md             ← Per-task test cases for all 20 tasks
│   │   ├── T-01-project-setup.md
│   │   ├── T-02-auth.md
│   │   ├── T-03-database-schema.md
│   │   ├── T-04-recipe-editor.md
│   │   ├── T-05-step-model.md
│   │   ├── T-06-timers-reminders.md
│   │   ├── T-07-public-browse.md
│   │   ├── T-08-recipe-detail.md
│   │   ├── T-09-revision-history.md
│   │   ├── T-10-import-flow.md
│   │   ├── T-11-ai-extraction-tuning.md
│   │   ├── T-12-equipment-filter.md
│   │   ├── T-13-ingredient-filter.md
│   │   ├── T-14-cook-mode-polish.md
│   │   ├── T-15-analytics-dashboard.md
│   │   ├── T-16-dietary-tags.md
│   │   ├── T-17-seo-json-ld.md
│   │   ├── T-18-api-integration.md
│   │   ├── T-19-user-profile.md
│   │   ├── T-20-push-notifications.md
│   │   ├── APPENDIX-api-conventions.md
│   │   ├── APPENDIX-definition-of-done.md
│   │   ├── APPENDIX-error-handling.md
│   │   └── APPENDIX-testing-standards.md
│   ├── infra/                       ← Infrastructure & hosting
│   │   ├── INFRA.md                 ← Architecture, DB, AI layer, env vars
│   │   └── HOSTING_COST.md          ← Cost breakdown by phase
│   └── marketing/
│       └── PRICING_MODELS.md        ← 4 pricing models + recommendation
```

---

## 🗺️ Navigation by Concern

### "I want to understand the product"
1. [`docs/PROPOSAL.md`](./docs/PROPOSAL.md) — Vision, features, source strategy, MVP scope

### "I want to start building or pick up a task"
1. [`docs/builders/README.md`](./docs/builders/README.md) — Agent operating rules, session start checklist
2. [`docs/builders/OVERVIEW.md`](./docs/builders/OVERVIEW.md) — Full task list, phases, and dependency graph
3. [`docs/builders/TASK_SPEC.md`](./docs/builders/TASK_SPEC.md) — Acceptance criteria and test cases per task
4. `docs/builders/T-XX-*.md` — Detailed spec for each individual task

### "I need to implement a specific feature"

| Feature | Read first |
|---|---|
| Project scaffolding / monorepo | [`T-01-project-setup.md`](./docs/builders/T-01-project-setup.md) |
| Authentication (sign-up, login, sessions) | [`T-02-auth.md`](./docs/builders/T-02-auth.md) |
| Database models & migrations | [`T-03-database-schema.md`](./docs/builders/T-03-database-schema.md) |
| Recipe create / edit UI | [`T-04-recipe-editor.md`](./docs/builders/T-04-recipe-editor.md) |
| Step data model (action, ingredient, duration) | [`T-05-step-model.md`](./docs/builders/T-05-step-model.md) |
| Timers & reminders | [`T-06-timers-reminders.md`](./docs/builders/T-06-timers-reminders.md) |
| Public recipe browse page | [`T-07-public-browse.md`](./docs/builders/T-07-public-browse.md) |
| Recipe detail & cook-along view | [`T-08-recipe-detail.md`](./docs/builders/T-08-recipe-detail.md) |
| Version / revision history | [`T-09-revision-history.md`](./docs/builders/T-09-revision-history.md) |
| URL / article import | [`T-10-import-flow.md`](./docs/builders/T-10-import-flow.md) |
| AI step extraction & normalization | [`T-11-ai-extraction-tuning.md`](./docs/builders/T-11-ai-extraction-tuning.md) |
| Equipment filter | [`T-12-equipment-filter.md`](./docs/builders/T-12-equipment-filter.md) |
| Ingredient filter | [`T-13-ingredient-filter.md`](./docs/builders/T-13-ingredient-filter.md) |
| Cook mode UX polish | [`T-14-cook-mode-polish.md`](./docs/builders/T-14-cook-mode-polish.md) |
| Analytics dashboard | [`T-15-analytics-dashboard.md`](./docs/builders/T-15-analytics-dashboard.md) |
| Dietary tags | [`T-16-dietary-tags.md`](./docs/builders/T-16-dietary-tags.md) |
| SEO & JSON-LD schema | [`T-17-seo-json-ld.md`](./docs/builders/T-17-seo-json-ld.md) |
| External recipe API integration | [`T-18-api-integration.md`](./docs/builders/T-18-api-integration.md) |
| User profile & settings | [`T-19-user-profile.md`](./docs/builders/T-19-user-profile.md) |
| Push notifications | [`T-20-push-notifications.md`](./docs/builders/T-20-push-notifications.md) |

### "I need to write or review an API endpoint"
→ [`docs/builders/APPENDIX-api-conventions.md`](./docs/builders/APPENDIX-api-conventions.md)

### "I need to know if a task is done"
→ [`docs/builders/APPENDIX-definition-of-done.md`](./docs/builders/APPENDIX-definition-of-done.md)

### "I need to handle an error or exception"
→ [`docs/builders/APPENDIX-error-handling.md`](./docs/builders/APPENDIX-error-handling.md)

### "I need to write tests"
→ [`docs/builders/APPENDIX-testing-standards.md`](./docs/builders/APPENDIX-testing-standards.md)

### "I need to set up infra or check environment variables"
→ [`docs/infra/INFRA.md`](./docs/infra/INFRA.md)

### "I need to understand hosting costs or resource limits"
→ [`docs/infra/HOSTING_COST.md`](./docs/infra/HOSTING_COST.md)

### "I need pricing, monetisation or business model info"
→ [`docs/marketing/PRICING_MODELS.md`](./docs/marketing/PRICING_MODELS.md)

---

## 🚦 Build Phases at a Glance

| Phase | Tasks | Goal | Status |
|---|---|---|---|
| **Phase 1 — MVP** | T-01 → T-09 | Core recipe editor + public browse | 🔲 Not started |
| **Phase 2 — Import & AI** | T-10 → T-13 | URL import, AI extraction, filters | 🔲 Not started |
| **Phase 3 — Polish & Scale** | T-14 → T-20 | Cook mode, analytics, SEO, push, API | 🔲 Not started |

---

## ⚡ Quick Rules for AI Agents

1. **Always read the task spec before coding** — `docs/builders/T-XX-*.md` for the relevant task.
2. **Never skip the Definition of Done** — every task must pass `APPENDIX-definition-of-done.md`.
3. **Follow API conventions exactly** — endpoints, error shapes, and status codes are defined in `APPENDIX-api-conventions.md`.
4. **Do not store secrets in code** — all credentials go in environment variables per `docs/infra/INFRA.md`.
5. **One task per PR** — keep changes scoped; reference the task ID in the PR title (e.g., `[T-04] Recipe editor`).
6. **Tests are mandatory** — unit + integration tests per `APPENDIX-testing-standards.md` before marking done.

---

*Last updated: 2026-05-29 — generated by AI documentation agent.*
