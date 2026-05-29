# StepDish — User Stories

> **Version 1.1 | May 2026** — Added US-025 (filter by equipment) and US-026 (filter by ingredients on hand); updated US-013

User stories are organized by feature area and MVP phase. Each story follows the format:
> *As a [role], I want to [action], so that [benefit].*

Acceptance criteria are listed under each story.

---

## 👤 User Roles

| Role | Description |
|---|---|
| **Home Cook** | A registered user who creates and manages their own recipe collection |
| **Browser** | A visitor (logged in or not) who browses the public recipe gallery |
| **Importer** | A registered user who imports recipes from external URLs or articles |
| **Admin** | Internal team member managing platform content and sources |

---

## Phase 1 — Core

### Authentication

---

**US-001 — Sign Up**
> As a visitor, I want to create an account with my email or social login, so that I can save and manage my recipes.

**Acceptance Criteria:**
- [ ] User can sign up with email + password
- [ ] User can sign up via Google or Apple OAuth
- [ ] Email verification is sent on sign-up
- [ ] Duplicate email shows a clear error message
- [ ] On success, user is redirected to their empty recipe dashboard

---

**US-002 — Log In / Log Out**
> As a registered user, I want to log in and out securely, so that my recipe collection is protected.

**Acceptance Criteria:**
- [ ] User can log in with email/password or social provider
- [ ] Incorrect credentials show a specific error
- [ ] Session persists across browser refreshes
- [ ] Logging out clears the session and redirects to home

---

### Recipe Editor

---

**US-003 — Create a Recipe**
> As a home cook, I want to create a new recipe with a title, cuisine, servings, and structured steps, so that I have a reusable cooking guide.

**Acceptance Criteria:**
- [ ] User can enter: title, cuisine type, serving count, total estimated time
- [ ] User can add one or more steps
- [ ] Each step supports: action, ingredient(s), duration, equipment, reminder text, and notes
- [ ] Steps can be reordered via drag-and-drop
- [ ] Recipe can be saved as draft (private) or published (public)
- [ ] Empty required fields (title, at least one step) show inline validation errors
- [ ] A recipe-level equipment list is auto-compiled from all step equipment fields

---

**US-004 — Add Structured Steps**
> As a home cook, I want each recipe step to have structured fields (action, ingredients, equipment, duration, reminder), so that I can follow precise cooking instructions without missing anything.

**Acceptance Criteria:**
- [ ] Step form includes: action label (dropdown + custom), ingredient selector, duration (minutes/seconds), equipment (text + tag picker), reminder message, free-text notes
- [ ] Steps are numbered automatically
- [ ] A step can be added, deleted, or duplicated
- [ ] At least one step is required to save a recipe

---

**US-005 — Edit a Recipe**
> As a home cook, I want to edit any part of an existing recipe at any time, so that I can refine it as I improve my cooking.

**Acceptance Criteria:**
- [ ] All recipe fields, steps, and equipment tags are editable after creation
- [ ] Saving creates a new revision (does not overwrite without confirmation)
- [ ] User sees a "last updated" timestamp on the recipe
- [ ] Changes are auto-saved as draft while editing (no data loss on accidental close)

---

**US-006 — View Revision History**
> As a home cook, I want to see a history of changes to my recipe, so that I can revert to a previous version if I make a mistake.

**Acceptance Criteria:**
- [ ] Recipe detail page shows a revision timeline (date, change summary)
- [ ] User can preview any prior revision
- [ ] User can restore a prior revision (creates a new revision, does not delete current)
- [ ] At minimum, the last 10 revisions are retained

---

**US-007 — Delete a Recipe**
> As a home cook, I want to delete a recipe I no longer need, so that my collection stays organized.

**Acceptance Criteria:**
- [ ] Delete requires confirmation (modal prompt)
- [ ] Deleted recipes are soft-deleted and recoverable within 30 days
- [ ] Permanently deleted recipes are removed from public browse immediately

---

### Timers & Reminders

---

**US-008 — Start a Step Timer**
> As a home cook cooking in real time, I want to start a countdown timer for any step, so that I don't over- or under-cook.

**Acceptance Criteria:**
- [ ] Each step with a duration shows a "Start Timer" button in cook mode
- [ ] Timer counts down visually and audibly alerts when complete
- [ ] Timer can be paused and resumed
- [ ] Timer persists if the screen locks (uses Web Worker or Notification API)

---

**US-009 — Set a Step Reminder**
> As a home cook, I want to set a custom reminder on a step (e.g., "stir every 2 min"), so that I don't forget critical checkpoints while multitasking.

**Acceptance Criteria:**
- [ ] Reminder field is optional on every step
- [ ] In cook mode, the reminder message appears as a visible alert when the step timer fires
- [ ] Reminder text is shown on the step card even before the timer starts
- [ ] User can dismiss the reminder alert

---

**US-010 — Run Parallel Timers**
> As a home cook managing multiple steps at once, I want to run timers for two or more steps simultaneously, so that I can coordinate overlapping tasks (e.g., pasta boiling while sauce simmers).

**Acceptance Criteria:**
- [ ] Multiple step timers can be active at the same time
- [ ] Each active timer is shown in a persistent floating timer bar
- [ ] Individual timers can be stopped independently
- [ ] Completion alerts differentiate which step has finished

---

### Browse & Discover

---

**US-011 — Browse Public Recipes**
> As a browser, I want to explore a gallery of public recipes without logging in, so that I can discover new dishes to cook.

**Acceptance Criteria:**
- [ ] Public recipe gallery is accessible without an account
- [ ] Gallery shows recipe card: title, image, cuisine, total time, step count, equipment tags
- [ ] Recipes load in a paginated or infinite-scroll layout
- [ ] Gallery is mobile-friendly

---

**US-012 — Search Recipes**
> As a browser, I want to search recipes by keyword, ingredient, or cuisine, so that I can quickly find something relevant to cook.

**Acceptance Criteria:**
- [ ] Search bar is visible on the browse page
- [ ] Search queries match against title, ingredients, cuisine, and equipment tags
- [ ] Results update as the user types (debounced)
- [ ] Empty results show a helpful "no results" state with suggestions
- [ ] Search works on mobile without layout issues

---

**US-013 — Filter Recipes**
> As a browser, I want to filter recipes by total time, cuisine, difficulty, equipment, and ingredients I have, so that I can narrow down options to what fits my situation and my kitchen.

**Acceptance Criteria:**
- [ ] Filter panel supports: total time (≤15 min, ≤30 min, ≤1 hr, any), cuisine (dropdown), difficulty (easy / medium / hard)
- [ ] Filter panel supports: **equipment** (multi-select from canonical tag list — e.g., wok, oven, blender, air fryer, stand mixer)
- [ ] Filter panel supports: **ingredients on hand** (see US-026 for full behaviour)
- [ ] Multiple filters can be applied at once
- [ ] Active filters are shown as dismissible chips
- [ ] Filters persist during a session

---

**US-014 — View a Full Recipe**
> As a browser, I want to open a recipe and see all steps clearly, so that I can follow along while cooking.

**Acceptance Criteria:**
- [ ] Recipe detail page shows: title, metadata, ingredient list, equipment list, and all steps in order
- [ ] Each step shows action, ingredients, duration, equipment, and reminder
- [ ] Steps can be checked off as completed (local state, no login required)
- [ ] Page is readable on mobile without zooming

---

---

## Phase 2 — Import & Enrichment

### Recipe Import

---

**US-015 — Import from a URL**
> As an importer, I want to paste a recipe article URL and have StepDish extract the steps automatically, so that I don't have to re-type recipes I find online.

**Acceptance Criteria:**
- [ ] Import dialog accepts any URL
- [ ] AI pipeline extracts: title, servings, ingredient list, step-by-step instructions, timing, and equipment per step
- [ ] Extracted content is shown in a preview/review screen before saving
- [ ] If extraction confidence is low on a step, it is flagged for user correction
- [ ] User can edit any extracted field before saving
- [ ] Import attribution (source URL) is stored with the recipe

---

**US-016 — Review and Correct Extracted Steps**
> As an importer, I want to review AI-extracted steps and fix any errors before saving, so that I trust the quality of imported recipes.

**Acceptance Criteria:**
- [ ] Review screen shows each extracted step with a confidence indicator
- [ ] Low-confidence steps are highlighted and editable
- [ ] User can merge, split, delete, or reorder steps during review
- [ ] Saving is blocked until flagged steps are resolved or explicitly accepted
- [ ] User can discard the import entirely from the review screen

---

**US-017 — Save and Remix an Imported Recipe**
> As an importer, I want to save an imported recipe to my collection and modify it freely, so that I can personalize it to my taste.

**Acceptance Criteria:**
- [ ] Saved imported recipes appear in the user's recipe collection
- [ ] Imported recipes are treated as the user's own after saving (full edit access)
- [ ] Source URL is shown as attribution metadata but is not publicly displayed by default
- [ ] Revision history starts from the point of import

---

### Equipment & Ingredient Filtering

---

**US-025 — Filter by Equipment**
> As a browser, I want to filter recipes by the kitchen equipment I own, so that I only see recipes I can actually make with what I have.

**Acceptance Criteria:**
- [ ] A canonical equipment tag list is maintained (e.g., wok, oven, microwave, blender, air fryer, stand mixer, pressure cooker, grill, food processor, cast iron pan)
- [ ] Filter panel includes a multi-select equipment picker with searchable tags
- [ ] Selecting one or more equipment tags shows only recipes that require **at most** those tools (i.e., no recipe requiring unlisted equipment appears)
- [ ] Equipment tags are shown on each recipe card and detail page
- [ ] Authors can add equipment tags when creating or editing a recipe (free-text + canonical tag matcher)
- [ ] AI import pipeline auto-detects equipment per step and maps to canonical tags where possible
- [ ] Active equipment filters appear as dismissible chips on the browse page
- [ ] Removing all equipment filters restores the full recipe list

---

**US-026 — Filter by Ingredients on Hand**
> As a browser, I want to enter the ingredients I currently have, so that StepDish shows me what I can cook right now without a shopping trip.

**Acceptance Criteria:**
- [ ] Filter panel includes an ingredient input field with autocomplete (matches ingredient names in the catalog)
- [ ] User can add multiple ingredients as chips (e.g., "chicken", "garlic", "soy sauce")
- [ ] System scores each visible recipe by ingredient match: **Full match** (all ingredients covered), **Partial match** (≥70% of ingredients covered, missing ones flagged), **No match** (hidden by default)
- [ ] Browse gallery defaults to showing Full match first, then Partial match with a "missing X ingredients" label on the card
- [ ] User can toggle "Show partial matches" on/off
- [ ] Ingredient input is case-insensitive and handles common synonyms (e.g., "spring onion" = "scallion")
- [ ] Entered ingredients persist for the session; a "Clear ingredients" button resets the filter
- [ ] On the recipe detail page, ingredient list items are highlighted green (have it) or amber (missing) based on the user's entered list

---

### Save to Collection

---

**US-018 — Save a Public Recipe to My Collection**
> As a logged-in browser, I want to save any public recipe to my personal collection, so that I can access it later without searching again.

**Acceptance Criteria:**
- [ ] "Save" button is visible on every public recipe card and detail page
- [ ] Saved recipes appear in a dedicated "My Collection" section
- [ ] Saving a recipe does not create a copy — it is a bookmark link to the original
- [ ] User can unsave at any time

---

**US-019 — Remix a Public Recipe**
> As a home cook, I want to copy any public recipe into my editor, so that I can customize it without changing the original.

**Acceptance Criteria:**
- [ ] "Remix" option is available on every public recipe detail page
- [ ] Remixing creates a full editable copy in the user's collection
- [ ] The copy shows "Remixed from [original title]" as attribution
- [ ] The remixed copy is independent — changes do not affect the original

---

---

## Phase 3 — Discovery & Scale

### Ratings & Community

---

**US-020 — Rate a Recipe**
> As a home cook, I want to rate a recipe after cooking it, so that other users can see which recipes are well-tested.

**Acceptance Criteria:**
- [ ] Rating is a 1–5 star system
- [ ] Each user can rate a recipe once (editable)
- [ ] Average rating and total count are displayed on the recipe card and detail page
- [ ] Rating requires being logged in

---

**US-021 — Leave a Comment on a Recipe**
> As a home cook, I want to leave a comment on a recipe, so that I can share tips, substitutions, or feedback with other cooks.

**Acceptance Criteria:**
- [ ] Comment box is available on the recipe detail page (logged-in users only)
- [ ] Comments show username and date
- [ ] Comments can be edited or deleted by the author
- [ ] Recipe author can pin or respond to comments

---

### Analytics (Admin / Author)

---

**US-022 — View Recipe Performance**
> As a home cook who publishes recipes, I want to see how many people have viewed, saved, and cooked my recipes, so that I know which ones are most useful.

**Acceptance Criteria:**
- [ ] Author dashboard shows per-recipe stats: view count, save count, remix count, average rating
- [ ] Stats are updated daily
- [ ] Author can see a trend chart for the past 30 days
- [ ] Stats are only visible to the recipe author, not the public

---

---

## Non-Functional User Stories

---

**US-023 — Fast Load on Mobile**
> As a home cook using the app in the kitchen on my phone, I want pages to load quickly even on a weak Wi-Fi connection, so that I'm not waiting while my pan is heating up.

**Acceptance Criteria:**
- [ ] Recipe detail page LCP (Largest Contentful Paint) < 2.5 seconds on a 4G connection
- [ ] Cook mode (active timers) works fully offline after initial page load
- [ ] Images are lazy-loaded and do not block step content

---

**US-024 — Accessibility**
> As a user with visual impairment, I want to navigate StepDish using a screen reader and keyboard, so that the app is usable regardless of my ability.

**Acceptance Criteria:**
- [ ] All interactive elements are keyboard-navigable (Tab, Enter, Space, Escape)
- [ ] Semantic HTML used throughout (headings, landmarks, lists)
- [ ] Images have descriptive alt text
- [ ] WCAG AA colour contrast met for all text on all surfaces
- [ ] Timer alerts include an audio cue, not only a visual one

---

*User stories prepared May 2026. v1.1 updated May 2026 to add US-025 (equipment filter), US-026 (ingredient filter), and expand US-003, US-004, US-013, US-014 for equipment support. Stories will be refined and acceptance criteria validated during sprint planning.*
