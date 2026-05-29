# StepDish — Product Proposal

> **Version:** 1.0 · **Date:** May 2026 · **Status:** Draft for Review

---

## Overview

StepDish is a structured recipe platform that turns cooking from a note-taking habit into a repeatable, guided workflow. Unlike static recipe apps, StepDish models each recipe as a sequence of **atomic steps** — each with ingredients, actions, durations, reminders, and equipment — so users can record, refine, and execute recipes with precision.

Users can author recipes from scratch, import them from URLs or articles (processed by AI into structured steps), and browse a growing catalog of published recipes online. Recipes are living documents: every edit is versioned, so users can track how a dish evolved over time.

```
┌─────────────────────────────────────────────────────────┐
│                     S T E P D I S H                     │
│                                                         │
│   "Your recipes. Structured. Guided. Always evolving."  │
└─────────────────────────────────────────────────────────┘
```

---

## The Problem

Home cooks face three recurring frustrations:

1. **Recipes are static** — bookmarked pages or screenshots that can't be edited or personalised over time.
2. **Steps are vague** — "cook until done" with no timer, no reminder, no context.
3. **Import is manual** — copying from articles or videos into a notes app loses all structure.

StepDish solves all three: structured steps with timers, editable and versioned recipes, and AI-powered import from any text source.

---

## Target Users

| Segment | Need | Primary Feature |
|---|---|---|
| Home cook (daily) | Repeatable, precise cooking | Cook Mode with step timers |
| Recipe experimenter | Track recipe iterations | Version history |
| Meal planner | Browse by ingredient / equipment | Filtered browse |
| Content curator | Import from articles/blogs | AI extraction pipeline |

---

## Core Features

### 1 · Recipe Editor

A structured editor where each recipe is built step by step.

```
Recipe: Soy Glazed Salmon
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1  │ Action: Pat salmon dry
        │ Duration: 1 min
        │ Equipment: paper towel
        │ Reminder: —

Step 2  │ Action: Mix soy sauce, mirin, honey
        │ Ingredients: 3 tbsp soy sauce · 2 tbsp mirin · 1 tbsp honey
        │ Duration: 2 min
        │ Equipment: mixing bowl
        │ Reminder: —

Step 3  │ Action: Sear salmon skin-side down
        │ Duration: 4 min
        │ Equipment: frying pan
        │ Reminder: ⏰ Flip after 4 min
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Step fields:**
- `action` — what to do
- `ingredients` — what to use (name, quantity, unit, optional flag)
- `durationSeconds` — timer for this step
- `equipment` — tools required
- `reminder` — alert text (shown when timer ends or at step start)
- `notes` — freeform tips or variations

### 2 · Cook Mode

A full-screen guided overlay that walks users through each step one at a time. Features:

- Large step display with auto-advancing timer
- Ingredient summary for the current step
- Voice readout via Web Speech API
- Screen wake lock (device stays on while cooking)
- Progress persists across page reloads (sessionStorage)
- Completion screen with confetti animation

### 3 · Recipe Import (AI Pipeline)

Users paste a URL or raw article text. The AI pipeline:

```
Input text / URL
      │
      ▼
┌─────────────────────┐
│  Text extraction    │  Strip HTML, clean whitespace
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  AI extraction      │  GPT-4o structured output
│  (prompt v2)        │  → title, servings, steps[]
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Post-processing    │  Duration inference, ingredient
│                     │  normalisation, equipment detection
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Confidence check   │  < 0.5 → retry with focused prompt
└─────────┬───────────┘
          │
          ▼
   Structured recipe
   (ready for editor)
```

### 4 · Browse & Discover

A public catalog of user-published recipes. Filterable by:
- **Cuisine** (Chinese, Italian, Japanese…)
- **Total time** (< 30 min, < 1 hr, any)
- **Ingredients you have** — fuzzy subset match via trigram similarity
- **Equipment you own** — subset match against step equipment
- **Dietary tags** (vegetarian, gluten-free, dairy-free)

### 5 · Version History

Every save creates a version snapshot. Users can:
- Browse the timeline of changes ("added chilli flakes", "reduced cook time")
- Restore any previous version
- Compare two versions side by side (diff view)

---

## Recipe Data Sources

Sourcing external recipes for the catalog requires careful legal and technical evaluation.

### Recommended Sources

| Source | Type | Legal Risk | Quality | Notes |
|---|---|---|---|---|
| **User-authored** | Original | None | High | Core of the platform |
| **BigOven API** | Licensed API | Low | Medium | Structured recipe data with formal API terms |
| **Edamam API** | Licensed API | Low | High | Nutrition data + recipe metadata |
| **Direct publisher partnership** | Licensed content | Low | High | Business development required (e.g. Serious Eats) |
| **Apify / scraper platforms** | Third-party scraping | Medium | Medium | Fast to prototype; review ToS carefully |
| **DIY article importer** | User-initiated import | Low (user's own use) | Variable | User pastes URL; platform extracts for personal use only |

### Phased Source Strategy

```
Phase 1 (MVP)          Phase 2 (Growth)        Phase 3 (Scale)
───────────────        ────────────────        ───────────────
User-authored          + BigOven API           + Publisher deals
+ URL importer         + Edamam enrichment     + Licensed catalog
(personal use)         + Community sharing     + Curated collections
```

> **Note:** DIY scraping of sites like Allrecipes, NYT Cooking, or BBC Food without explicit permission creates legal and maintenance risk. The recommended approach is to use licensed APIs for the public catalog and restrict URL import to personal-use workflows.

---

## Tech Stack

```
┌──────────────────────────────────────────────────────────┐
│                        FRONTEND                          │
│   Next.js 15 (App Router)  ·  TypeScript  ·  Tailwind   │
│   Lucide icons  ·  ShadCN/UI base components             │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTP / Server Actions
┌──────────────────────────▼───────────────────────────────┐
│                         BACKEND                          │
│   Next.js Route Handlers  ·  Prisma ORM  ·  Clerk auth   │
│   OpenAI GPT-4o (extraction)  ·  pg_trgm (fuzzy search) │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│                        DATABASE                          │
│   PostgreSQL (Supabase or Neon)                          │
│   Tables: User · Recipe · Step · Ingredient · Equipment  │
│           RecipeVersion · RecipeEvent · StepEquipment    │
└──────────────────────────────────────────────────────────┘
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 | Full-stack, file-based routing, Server Actions |
| Auth | Clerk | Fastest to integrate, supports social login |
| Database | PostgreSQL | Relational model suits recipe/step hierarchy |
| ORM | Prisma | Type-safe queries, good migration tooling |
| AI | OpenAI GPT-4o | Best structured output accuracy for extraction |
| Search | pg_trgm | Fuzzy ingredient/name search without extra service |
| Hosting | Vercel + Supabase | Minimal infrastructure for solo/small team |

---

## Data Model (Simplified)

```
Recipe
├── id, title, description, servings
├── authorId → User
├── status (draft | published)
├── cuisine, tags[], totalTimeSeconds
│
├── Step[]
│   ├── id, order, action, durationSeconds
│   ├── reminder, notes
│   ├── Ingredient[]  (name, qty, unit, isOptional)
│   └── StepEquipment[] → Equipment
│
├── RecipeVersion[]   (snapshot on each save)
└── RecipeEvent[]     (view, cook_start, cook_complete)
```

---

## MVP Phases

### Phase 1 — Foundation (Weeks 1–4)

Goal: working recipe editor + cook mode for personal use.

- [ ] Auth (Clerk) + user accounts
- [ ] Recipe CRUD (create, edit, delete)
- [ ] Step editor with all fields
- [ ] Cook Mode overlay with timers
- [ ] Basic recipe list (private, owner only)
- [ ] Mobile-responsive layout

**Milestone:** User can create a recipe and cook from it on their phone.

---

### Phase 2 — Import & Browse (Weeks 5–8)

Goal: AI import pipeline + public recipe browsing.

- [ ] URL import with AI extraction
- [ ] Text paste import
- [ ] Post-processing (duration inference, ingredient normalisation)
- [ ] Publish/unpublish toggle
- [ ] Public browse page
- [ ] Search by title, cuisine, total time
- [ ] Ingredient filter (pg_trgm)
- [ ] Equipment filter

**Milestone:** User can import a recipe from an article URL and publish it.

---

### Phase 3 — Quality & Retention (Weeks 9–12)

Goal: polish, analytics, and version history.

- [ ] Version history (snapshot + restore)
- [ ] Cook Mode polish (voice readout, wake lock, completion screen)
- [ ] Analytics dashboard (views, cook starts, completions)
- [ ] Licensed API integration (BigOven or Edamam)
- [ ] Recipe tagging + dietary filters
- [ ] Performance + SEO (recipe structured data / JSON-LD)

**Milestone:** Full MVP ready for public beta.

---

## Timeline

```
Week  1  2  3  4  5  6  7  8  9  10 11 12
      ├──────────┤
      │ Phase 1  │
      Foundation  ├──────────┤
                  │ Phase 2  │
                  Import &    ├──────────┤
                  Browse      │ Phase 3  │
                              Quality &
                              Retention
                                         ▲
                                    Public Beta
```

---

## Success Metrics (Beta)

| Metric | Target (3 months post-launch) |
|---|---|
| Registered users | 500 |
| Recipes created | 2,000 |
| Cook Mode sessions | 1,000 |
| Recipes imported via URL | 300 |
| Published recipes | 500 |
| Average steps per recipe | ≥ 5 |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI extraction quality low | Medium | High | Multi-pass fallback; human review flag |
| Content rights issues | Medium | High | Licensed APIs first; restrict scraping to personal import |
| Low user retention | Medium | High | Cook Mode as daily driver; reminder notifications |
| Step editor UX too complex | Low | Medium | Progressive disclosure; simple mode for casual users |
| Competitor parity | Low | Low | Differentiate on structured steps + version history |

---

## Next Steps

1. **Confirm name** — StepDish is the working name; register domain and social handles.
2. **Set up repo** — monorepo with Next.js, Prisma, Clerk. ✅ Done.
3. **Design system** — establish tokens, typography, and colour palette.
4. **Phase 1 sprint** — assign T-01 through T-08 tickets from `/docs/builders/`.
5. **API key setup** — OpenAI, Clerk, Supabase/Neon, BigOven/Edamam.

---

*StepDish · Internal proposal document · Not for external distribution*
