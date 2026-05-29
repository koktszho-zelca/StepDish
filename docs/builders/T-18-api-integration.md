# T-18 · Licensed API Integration (BigOven / Edamam)

## Context
To seed the public catalog and offer nutrition enrichment, StepDish integrates with licensed third-party recipe APIs. BigOven provides structured recipe data under formal API terms. Edamam provides nutrition analysis and recipe metadata. Both are Phase 3 additions — the platform works without them, and imported recipes are clearly attributed to their source.

---

## Scope

| Item | Detail |
|---|---|
| BigOven | Recipe search + detail import into StepDish format |
| Edamam | Nutrition analysis for recipes (calories, macros per serving) |
| Attribution | Every API-sourced recipe shows source name + link |
| Rate limiting | Respect API rate limits; cache responses in DB |
| User experience | "Import from BigOven" search modal in editor |
| Storage | Imported recipes stored as normal StepDish recipes with `sourceApi` + `sourceId` fields |

---

## Files to Create / Modify

```
/src/lib/api/bigoven.ts              ← NEW — BigOven API client
/src/lib/api/edamam.ts               ← NEW — Edamam nutrition client
/src/lib/api/normalise.ts            ← NEW — transform API response → StepDish schema
/src/app/api/external/bigoven/route.ts   ← NEW — proxy: search + detail
/src/app/api/external/edamam/route.ts    ← NEW — proxy: nutrition analysis
/src/components/editor/ApiImportModal.tsx ← NEW — BigOven search UI
/prisma/schema.prisma                ← MODIFY — add sourceApi, sourceId, nutrition fields
```

---

## Prisma Schema Additions

```prisma
model Recipe {
  // ... existing fields
  sourceApi   String?   // "bigoven" | "edamam" | "url_import" | null
  sourceId    String?   // external ID from the source API
  sourceUrl   String?   // original URL for attribution link
  nutrition   Json?     // { calories, protein, fat, carbs, fibre } per serving
}
```

---

## BigOven API Client: `bigoven.ts`

Base URL: `https://api.bigoven.com`
Auth: API key via `X-BigOven-API-Key` header or `api_key` query param.

```ts
const BASE = 'https://api.bigoven.com';
const KEY = process.env.BIGOVEN_API_KEY!;

export async function searchBigOven(query: string, pg = 1) {
  const url = `${BASE}/recipes?any_kw=${encodeURIComponent(query)}&pg=${pg}&rpp=12&api_key=${KEY}`;
  const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h
  if (!res.ok) throw new Error(`BigOven search failed: ${res.status}`);
  return res.json();
}

export async function getBigOvenRecipe(id: string) {
  const url = `${BASE}/recipe/${id}?api_key=${KEY}`;
  const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 24h
  if (!res.ok) throw new Error(`BigOven recipe fetch failed: ${res.status}`);
  return res.json();
}
```

---

## Edamam Nutrition Client: `edamam.ts`

Base URL: `https://api.edamam.com/api/nutrition-details`
Auth: `app_id` + `app_key` query params.

```ts
const APP_ID  = process.env.EDAMAM_APP_ID!;
const APP_KEY = process.env.EDAMAM_APP_KEY!;

export async function analyseNutrition(title: string, ingredients: string[]) {
  const res = await fetch(
    `https://api.edamam.com/api/nutrition-details?app_id=${APP_ID}&app_key=${APP_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, ingr: ingredients }),
      next: { revalidate: 86400 },
    }
  );
  if (!res.ok) return null; // nutrition is optional — fail gracefully
  const data = await res.json();
  return {
    calories:  Math.round(data.calories ?? 0),
    protein:   Math.round(data.totalNutrients?.PROCNT?.quantity ?? 0),
    fat:       Math.round(data.totalNutrients?.FAT?.quantity ?? 0),
    carbs:     Math.round(data.totalNutrients?.CHOCDF?.quantity ?? 0),
    fibre:     Math.round(data.totalNutrients?.FIBTG?.quantity ?? 0),
  };
}
```

---

## Normaliser: `normalise.ts`

Transforms BigOven recipe response into StepDish `RecipeCreateInput`:

```ts
export function normaliseBigOven(raw: BigOvenRecipe): RecipeCreateInput {
  const steps = raw.Instructions
    ? raw.Instructions.split(/\n|\d+\./).filter(Boolean).map((action, i) => ({
        order: i + 1,
        action: action.trim(),
        durationSeconds: inferDuration(action) ?? undefined,
        equipment: inferEquipment(action),
      }))
    : [];

  const ingredients = raw.Ingredients?.map(ing => ({
    name: ing.Name,
    quantity: String(ing.Qty ?? ''),
    unit: ing.Unit ?? null,
  })) ?? [];

  // Distribute ingredients evenly across steps as a best-effort approach
  // (BigOven does not link ingredients to individual steps)
  const stepsWithIngredients = steps.map((step, i) => ({
    ...step,
    ingredients: i === 0 ? ingredients : [],
  }));

  return {
    title: raw.Title,
    description: raw.Description ?? null,
    servings: raw.YieldNumber ?? null,
    cuisine: raw.Category ?? null,
    coverImageUrl: raw.PhotoUrl ?? null,
    sourceApi: 'bigoven',
    sourceId: String(raw.RecipeID),
    sourceUrl: `https://www.bigoven.com/recipe/${raw.RecipeID}`,
    steps: stepsWithIngredients,
  };
}
```

---

## Component: `ApiImportModal.tsx`

- Triggered from editor via "Import from catalog" button
- Modal with search input + results grid
- Each result: thumbnail, title, cuisine, total time
- "Import" button on result → calls `normaliseBigOven` → pre-fills editor
- Attribution notice: "Imported from BigOven — review and personalise before publishing"
- User must explicitly save to create the recipe in StepDish

---

## Attribution Display

On published recipes imported from an API:

```tsx
{recipe.sourceApi && recipe.sourceUrl && (
  <p className="recipe-attribution">
    Originally sourced from{' '}
    <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
      {recipe.sourceApi === 'bigoven' ? 'BigOven' : recipe.sourceApi}
    </a>
  </p>
)}
```

---

## Rate Limit & Caching Strategy

| API | Free tier limit | Cache strategy |
|---|---|---|
| BigOven | 100 req/day (free) | `revalidate: 3600` for search, `86400` for detail |
| Edamam | 400 req/month (free) | `revalidate: 86400`; skip if recipe has no ingredients |

- API keys stored in `.env.local` — never client-side
- Proxy route handlers (`/api/external/`) prevent key exposure
- Nutrition stored in `Recipe.nutrition` JSON field after first analysis — never re-fetched

---

## Environment Variables

```env
BIGOVEN_API_KEY=your_bigoven_key
EDAMAM_APP_ID=your_edamam_app_id
EDAMAM_APP_KEY=your_edamam_app_key
```

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-18-01 | Search "chicken" in ApiImportModal | Returns BigOven results grid |
| TC-18-02 | Import a BigOven recipe | Steps pre-filled in editor |
| TC-18-03 | Imported recipe saved | `sourceApi: 'bigoven'`, `sourceId` stored |
| TC-18-04 | Published imported recipe | Attribution link shown |
| TC-18-05 | Edamam analysis called on save | Nutrition fields populated |
| TC-18-06 | Edamam returns error | Recipe saves without nutrition; no crash |
| TC-18-07 | API key not set | Clear server-side error; modal shows graceful fallback |
| TC-18-08 | BigOven search cached | Second identical search does not hit API |
| TC-18-09 | Nutrition already stored | Edamam not called again on re-save |
| TC-18-10 | BIGOVEN_API_KEY exposed to client | Lint/test fails — key must only appear in server context |
