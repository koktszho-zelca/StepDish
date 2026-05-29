# StepDish — Product Proposal

> **Version 1.1 | May 2026** — Added equipment section and ingredient-based filtering

---

## Overview

StepDish is a structured recipe management platform where users record, update, and browse cooking recipes as living, actionable workflows. Unlike static recipe notes or bookmarking tools, every recipe in StepDish is broken down into discrete steps — each with ingredients, duration, action type, equipment, and optional reminders — making it suitable for real-time in-kitchen use.

The platform supports two modes: **personal recipe authoring** (users create and maintain their own collection) and **community/import browsing** (users explore curated recipes sourced from licensed APIs and AI-processed articles).

---

## Problem

Home cooks frequently rely on imprecise sources: long-form blog articles, screenshots, or memory. Recipe instructions are rarely structured for execution — they mix prose with timings, skip reminders, and are hard to update as a cook refines their approach. Existing apps either lock content or provide no structured step model. Critically, no mainstream recipe tool lets cooks filter by the equipment they actually own, or by the ingredients already in their fridge.

---

## Solution — StepDish

StepDish treats every recipe as a structured object with version history. The core step model captures everything needed to cook with confidence:

| Field | Description | Example |
|---|---|---|
| **Action** | Verb describing what to do | Sauté, Chop, Simmer |
| **Ingredients** | Linked quantities and items | 2 cloves garlic, minced |
| **Duration** | Time to complete the step | 8 min |
| **Equipment** | Specific tools or appliances required | Cast iron pan, Stand mixer, Oven at 200°C |
| **Reminder** | Alert or checkpoint note | Stir every 2 min |
| **Notes** | Optional tips or variations | Add chili flakes here |

At the recipe level, an **Equipment List** is automatically compiled from all step-level equipment fields, giving cooks a complete checklist before they start. Users can also tag recipes with a canonical equipment set (e.g., "requires: wok", "requires: blender") that powers filtering.

![StepDish app interface — structured recipe steps with timers and reminders](https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/23f14950-1364-401b-af3b-baae1290955b.png)

Users can update any step at any time, and the app maintains a revision history so cooking improvements are never lost.

---

## Key Features

### Recipe Editor
- Create structured recipes with ingredient linking, step ordering, and metadata (servings, cuisine, total time)
- Equipment field on every step — auto-compiled into a recipe-level equipment checklist
- Step-by-step cook mode with in-progress timer and reminder alerts
- Markdown-style notes on each step for tips and variations
- Full revision history — revert to any prior version of a recipe

### Import & AI Extraction
- Paste any article URL or copy text from a recipe webpage
- AI pipeline extracts title, ingredient list, steps, timing, **and equipment** per step
- Auto-assigns action labels (chop, mix, bake) and duration estimates
- Flags low-confidence extractions for user review before saving

### Browse & Discover
- Public recipe gallery with search by ingredient, cuisine, time, difficulty, **and equipment**
- **Filter by ingredients you have** — users enter ingredients on hand; gallery shows only recipes fully or mostly covered by those ingredients
- **Filter by equipment you own** — multi-select equipment tags (wok, oven, blender, etc.) to narrow recipes to what is actually cookable at home
- Recipes sourced from licensed APIs and publisher partnerships
- AI-normalized format — all browsed recipes use the same structured step model
- Save-to-collection and remix (copy to own editor for personal edits)

### Reminders & Timers
- Per-step countdown timers launchable from the step card
- Custom reminder messages: text alert, audio ping, or visual cue
- Parallel timers for recipes with overlapping steps (e.g., sauce simmering while pasta boils)

---

## Content Source Strategy

Sourcing high-quality recipe content is the highest-risk area of the platform. The recommended approach uses a three-phase funnel: start with compliant licensed APIs, expand through publisher partnerships, and restrict unofficial scraping to user-personal use only.

![StepDish AI content pipeline — sources flow through AI extraction into structured recipe steps](https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/02236f07-57af-4272-a7f5-a2b4f6d40a28.png)

| Source | Type | Risk | Phase |
|---|---|---|---|
| **BigOven API** | Licensed API | Low — formal API terms | Phase 1 |
| **Edamam API** | Licensed API | Low — formal API terms | Phase 1 |
| **User-authored** | First-party | None | Phase 1 |
| **URL import (personal)** | User-initiated scrape | Medium — fair use / personal only | Phase 2 |
| **Publisher partnerships** (e.g. Serious Eats) | Licensing deal | Low when formalized | Phase 2–3 |
| **Apify / third-party scrapers** | Unofficial | Higher — compliance review required | Phase 3 only if needed |

### AI Preprocessing Pipeline

When users import a recipe article, the AI extraction pipeline runs as follows:

1. **Ingest** — fetch and clean article HTML, strip ads and boilerplate
2. **Detect** — identify title, servings, ingredients block, instructions block
3. **Segment** — split instructions into atomic steps at sentence/clause boundaries
4. **Classify** — tag each step with action type, ingredient references, duration, and **equipment**
5. **Normalize** — map to StepDish internal schema; compile recipe-level equipment list
6. **Review queue** — flag any step with confidence below threshold for user confirmation before saving

This pipeline applies to both user-initiated URL imports and internally sourced API recipes being reformatted into the step model.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js (React) | SSR for public browse SEO, client-side for editor |
| **Backend API** | Node.js / Express or Fastify | Lightweight REST + WebSocket for live timers |
| **Database** | PostgreSQL | Structured step model, revision history, JSONB for metadata |
| **Search** | PostgreSQL full-text (Phase 1) → Typesense | Fast enough for MVP; ingredient/equipment filter uses indexed tags |
| **AI Layer** | OpenAI GPT-4o or Claude API | Step extraction, classification, normalization, equipment detection |
| **Auth** | Clerk or Auth.js | User accounts, social login |
| **Hosting** | Vercel (frontend) + Railway or Render (API) | Fast MVP deployment, low ops overhead |
| **Storage** | Cloudflare R2 | Recipe images and user uploads |

---

## MVP Phases

### Phase 1 — Core (Weeks 1–8)
**Goal:** Usable recipe editor with publishing.
- User auth (sign up, log in)
- Recipe editor: title, servings, cuisine, ingredients, structured steps with **equipment field**
- Step timer and reminders (client-side)
- Revision history (basic)
- Public recipe browse page with time, cuisine, and **equipment filters**
- One licensed recipe source connected (BigOven or Edamam API)

### Phase 2 — Import & Enrichment (Weeks 9–16)
**Goal:** Reduce friction for capturing recipes from the web.
- URL/article import with AI extraction pipeline (includes equipment detection)
- Confidence-based review queue for imported steps
- Ingredient normalization (unit conversion, quantity parsing)
- **Filter by ingredients you have** (ingredient match scoring)
- Save-to-collection from browse
- Remix (copy any recipe to personal editor)

### Phase 3 — Discovery & Scale (Weeks 17–24)
**Goal:** Grow browsable catalog and improve quality.
- Full-text search with all filters (ingredient, time, cuisine, difficulty, equipment)
- Publisher partnership integration (if formalized)
- Parallel timers for multi-step overlap
- Recipe rating and comment threads
- Analytics dashboard for recipe performance

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Content rights (scraping) | High | Use licensed APIs first; restrict URL import to personal-use framing |
| AI extraction accuracy | Medium | Confidence scoring + user review queue; never silently auto-publish |
| Equipment taxonomy drift | Medium | Use a canonical equipment tag list (controlled vocabulary); allow user aliases |
| Ingredient matching quality | Medium | Normalize ingredient names via a food ontology or fuzzy match; show partial match scores |
| Timer/reminder reliability | Medium | Use Web Workers and Notification API; test across iOS/Android browsers |
| Recipe schema rigidity | Low | Store step extras as flexible JSONB; schema migrations are cheap in Phase 1 |
| Cold start (no content) | Medium | Seed catalog via BigOven/Edamam API on launch; feature user-authored picks |

---

## Name & Brand Direction

**Product name: StepDish**
- Reflects the structured step-by-step model
- "Dish" is universally understood in a food context
- Short, easy to search, available as a neutral brand

**Brand tone:** practical, warm, and confident — for home cooks who take cooking seriously but are not professional chefs. Visual direction: warm beige surfaces, teal primary accent, clean sans-serif, minimal decoration.

---

*Proposal prepared May 2026. v1.1 updated May 2026 to add equipment section and ingredient-based filtering.*
