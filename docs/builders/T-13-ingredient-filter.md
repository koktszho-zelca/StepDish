# T-13 · Ingredient Filter ("What's in My Kitchen")

> **Batch:** 3 · **Phase:** 2 — Import & Browse · **Depends on:** T-07, T-03

---

## Context

The most useful browsing question a home cook can ask is: "What can I make with what I already have?" T-13 adds a "What's in my kitchen" ingredient filter to the browse page.

The user types ingredient names one by one into a tag input. The browse results update to show only recipes where every **required** ingredient is matched by something in the user's list. Optional/garnish ingredients (marked `isOptional: true`) do not block a match — the user doesn't need saffron to make a dish that uses it as an optional garnish.

Matching is **fuzzy**: a user typing "garlc" still matches recipes that need "garlic". This is implemented using PostgreSQL's `pg_trgm` extension with a `similarity()` threshold of 0.4.

---

## Scope

| Item | Detail |
|---|---|
| Filter location | Browse page sidebar / mobile drawer (T-07) |
| Input style | Tag input — type a name, press Enter or comma to add |
| Match logic | All required ingredients in recipe are fuzzy-covered by user's list |
| Fuzzy algorithm | PostgreSQL `pg_trgm` `similarity()` ≥ 0.4 |
| Optional ingredients | `isOptional: true` steps excluded from match requirement |
| Autocomplete | Inline dropdown from `GET /api/ingredients/autocomplete?q=` (debounced 200ms) |
| URL persistence | `?ingredients=chicken,rice,garlic` |

---

## Files to Create / Modify

```
/src/app/api/ingredients/autocomplete/route.ts  ← NEW    — autocomplete endpoint
/src/app/api/recipes/route.ts                   ← MODIFY — add ingredient filter logic
/src/components/browse/IngredientFilter.tsx     ← NEW    — tag input UI
/src/lib/ingredientMatch.ts                     ← NEW    — pure match helper (for unit tests)
/prisma/migrations/                             ← MODIFY — enable pg_trgm extension
```

---

## Behaviour Spec

### Tag Input Interaction

```
┌─ What's in my kitchen? ──────────────────────┐
│  [chicken ×] [rice ×] [garlic ×]            │
│  |ginger___________________________          │
│  ┌─ Suggestions ───────────────┐            │
│  │  ginger                     │            │
│  │  ginger garlic paste        │            │
│  │  pickled ginger             │            │
│  └─────────────────────────────┘            │
│                           [Clear all]        │
└──────────────────────────────────────────────┘
```

- Pressing **Enter** or **,** confirms the current input as a tag
- Pasting `"chicken, rice, garlic"` splits on comma and adds all three tags at once
- Each tag shown as a pill with a `×` remove button
- Backspace on empty input removes the last tag
- Autocomplete fires after 200ms debounce, shows max 8 suggestions
- Clicking a suggestion adds it as a tag and clears the input
- Tags are normalised to lowercase before being stored in URL

### Match Logic (server-side)

For each recipe:
1. Collect all ingredients from non-optional steps (`isOptional = false`)
2. For each required ingredient, check if any user ingredient has `similarity(ingredient.name, userIngredient) > 0.4`
3. If ALL required ingredients match at least one user ingredient → include recipe
4. If ANY required ingredient has no fuzzy match → exclude recipe

```sql
-- Returns recipe IDs where all required ingredients are covered by user's list
SELECT DISTINCT s."recipeId"
FROM "Step" s
JOIN "Ingredient" i ON i."stepId" = s.id
WHERE i."isOptional" = false
GROUP BY s."recipeId"
HAVING bool_and(
  EXISTS (
    SELECT 1
    FROM unnest($1::text[]) AS ui
    WHERE similarity(lower(i.name), lower(ui)) > 0.4
  )
);
-- $1 = array of user ingredient strings
```

### Autocomplete API: `GET /api/ingredients/autocomplete?q=`

```ts
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json([]);

  const results = await prisma.$queryRaw<{ name: string }[]>`
    SELECT DISTINCT lower(name) as name
    FROM "Ingredient"
    WHERE similarity(lower(name), lower(${q})) > 0.3
    ORDER BY similarity(lower(name), lower(${q})) DESC
    LIMIT 8
  `;
  return NextResponse.json(results.map(r => r.name));
}
```

---

## Database Setup

Add this migration to enable `pg_trgm` before the filter can work:

```sql
-- Migration: enable_pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ingredient_name_trgm
  ON "Ingredient" USING GIN (lower(name) gin_trgm_ops);
```

> ⚠️ `CREATE EXTENSION` requires superuser or `rds_superuser` on managed PostgreSQL (Supabase, Neon). Run this in a migration with elevated credentials or via the database console on first deploy.

---

## Edge Cases

| Case | Handling |
|---|---|
| Typo "garlc" | Trigram similarity still matches "garlic" (similarity ≈ 0.57) |
| Multi-word ingredient "olive oil" | Treated as one string — trigram handles it |
| Recipe has only optional ingredients | Always included regardless of filter |
| Empty ingredient filter | Filter not applied — all recipes shown |
| Ingredient name in Chinese or other scripts | `pg_trgm` still works on unicode; results may be less accurate |
| User types a very short term (1 char) | Autocomplete returns empty (min 2 chars) |
| Two similar ingredients ("butter" vs "peanut butter") | Similarity threshold 0.4 prevents false matches; test manually |

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `pg_trgm` extension not installed | DB query fails; log error; return all recipes unfiltered |
| Autocomplete API timeout | Dropdown closes; user can still type and confirm manually |
| Invalid characters in tag (e.g. `<script>`) | Sanitised to alphanumeric + spaces before query |
| Combined with equipment filter | Both applied as AND logic (`WHERE id IN (equipment_ids) AND id IN (ingredient_ids)`) |

---

## Dependencies

- T-07 · Public Browse
- T-03 · Database Schema (`Ingredient` model with `isOptional` field)
- PostgreSQL `pg_trgm` extension
- No new npm packages required for the filter itself

---

## Definition of Done

- [ ] `pg_trgm` migration runs cleanly on Supabase/Neon
- [ ] GIN index created on `Ingredient.name`
- [ ] Autocomplete returns results for partial matches (min 2 chars)
- [ ] Ingredient filter excludes recipes with unmatched required ingredients
- [ ] Optional ingredients do not block recipe inclusion
- [ ] Tag input supports Enter, comma, paste, and backspace
- [ ] Tags persist in URL as `?ingredients=...`
- [ ] Page load with `?ingredients=` URL pre-populates tags
- [ ] Combined with equipment filter via AND logic
- [ ] "Clear all" removes all tags and reloads without filter

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-13-01 | Enter "chicken" | Only recipes with chicken as required ingredient shown |
| TC-13-02 | Enter "chicken" + "rice" | Recipes requiring both shown |
| TC-13-03 | Typo "garlc" | Matches garlic recipes (similarity > 0.4) |
| TC-13-04 | Recipe has optional saffron; user didn't enter it | Recipe still shown |
| TC-13-05 | Autocomplete "tom" | Suggests "tomato", "tomato paste", "tomato sauce" |
| TC-13-06 | Autocomplete with 1 char | Returns empty array |
| TC-13-07 | Paste "egg, butter, flour" | Three tags added simultaneously |
| TC-13-08 | Remove a tag | Filter updates immediately |
| TC-13-09 | `?ingredients=chicken,rice` in URL | Tags pre-populated on load |
| TC-13-10 | Combined with `?equipment=oven` | AND logic — both filters active |
| TC-13-11 | Recipe with no ingredients | Always included |
| TC-13-12 | "butter" vs "peanut butter" | Should not incorrectly cross-match (verify threshold) |
| TC-13-13 | Clear all tags | All recipes reload, URL param removed |
