# T-13 · Ingredient Filter ("Ingredients You Have")

## Context
Users can enter ingredients they have at home and see only recipes they can realistically cook. The match is a fuzzy subset check — a recipe matches if all its key ingredients are covered by what the user entered. Optional/garnish ingredients are excluded from the match requirement.

---

## Scope

| Item | Detail |
|---|---|
| Filter location | Browse page sidebar / drawer (T-07) |
| Input | Tag-style input — user types ingredient names one by one |
| Match logic | Recipe's required ingredients must be a fuzzy subset of user's list |
| Fuzzy match | Postgres `pg_trgm` trigram similarity (threshold 0.4) |
| Optional ingredients | Steps tagged `isOptional: true` excluded from match requirement |
| URL persistence | `?ingredients=chicken,rice,garlic` |

---

## Files to Create / Modify

```
/src/components/browse/IngredientFilter.tsx   ← NEW — tag input UI
/src/app/api/recipes/route.ts                 ← MODIFY — add ingredient filter
/src/lib/ingredientMatch.ts                   ← NEW — match helper (for unit tests)
/prisma/migrations/                           ← MODIFY — enable pg_trgm extension
```

---

## Database: Enable pg_trgm

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_ingredient_name_trgm
  ON "Ingredient" USING gin (name gin_trgm_ops);
```

---

## Ingredient Model (T-03 reference)

```prisma
model Ingredient {
  id         String  @id @default(cuid())
  stepId     String
  step       Step    @relation(fields: [stepId], references: [id], onDelete: Cascade)
  name       String
  quantity   String?
  unit       String?
  notes      String?
  isOptional Boolean @default(false)
}
```

---

## Filter Logic in `GET /api/recipes`

```ts
if (userIngredients.length > 0) {
  const matched = await prisma.$queryRaw<{ recipeId: string }[]>`
    SELECT DISTINCT s."recipeId"
    FROM "Step" s
    JOIN "Ingredient" i ON i."stepId" = s.id
    WHERE i."isOptional" = false
    GROUP BY s."recipeId"
    HAVING bool_and(
      EXISTS (
        SELECT 1 FROM unnest(${userIngredients}::text[]) AS ui
        WHERE similarity(i.name, ui) > 0.4
      )
    )
  `;
  const ids = matched.map(r => r.recipeId);
  where.id = where.id ? { in: ids.filter(id => (where.id as any).in?.includes(id)) } : { in: ids };
}
```

---

## Component: `IngredientFilter.tsx`

- Tag-style input: user types a name and presses Enter or comma to add
- Each tag shown as a pill with × remove button
- Autocomplete dropdown from `GET /api/ingredients/autocomplete?q=` (debounced 200ms)
- Paste support: "chicken, rice, garlic" splits and adds all three
- Tags stored in URL as `?ingredients=chicken,rice,garlic`
- "Clear all" removes all tags

### Autocomplete API

```ts
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const results = await prisma.$queryRaw<{ name: string }[]>`
    SELECT DISTINCT name
    FROM "Ingredient"
    WHERE similarity(name, ${q}) > 0.3
    ORDER BY similarity(name, ${q}) DESC
    LIMIT 8
  `;
  return NextResponse.json(results.map(r => r.name));
}
```

---

## Edge Cases

| Case | Handling |
|---|---|
| Typo ("garlc") | Trigram similarity still matches "garlic" |
| Multi-word ("olive oil") | Trigram handles phrase similarity |
| Recipe has only optional ingredients | Always included |
| Empty ingredient filter | Not applied |
| Case sensitivity | `lower()` applied before similarity check |

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-13-01 | Enter "chicken" | Only recipes with chicken shown |
| TC-13-02 | Enter "chicken", "rice" | Recipes needing both |
| TC-13-03 | Typo "garlc" | Still matches garlic recipes |
| TC-13-04 | Recipe has optional saffron — user doesn't have it | Recipe still shown |
| TC-13-05 | Autocomplete "tom" | Suggests "tomato", "tomato paste" |
| TC-13-06 | Paste "egg, butter, flour" | Three tags added at once |
| TC-13-07 | Remove a tag | Filter updates immediately |
| TC-13-08 | Ingredients in URL | Shareable URL restores tags |
| TC-13-09 | Combined with equipment filter | Both filters applied (AND logic) |
| TC-13-10 | Empty ingredient list | No filter applied |
