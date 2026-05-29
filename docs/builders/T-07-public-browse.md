# T-07 · Public Browse Page

## Context
Users can publish their recipes. The Browse page (`/recipes`) shows all published recipes in a searchable, filterable grid. No login required to browse.

---

## Scope

| Item | Detail |
|---|---|
| Route | `/recipes` — public, no auth |
| Layout | Responsive card grid (3-col desktop, 2-col tablet, 1-col mobile) |
| Search | Full-text on title, cuisine, and tags — Postgres `tsvector` |
| Filters | Cuisine, total time range, equipment required, ingredients on hand |
| Sorting | Newest, quickest, most steps |
| Pagination | Cursor-based, 12 cards per page |

---

## Files to Create / Modify

```
/src/app/recipes/page.tsx               ← NEW — browse page (server component)
/src/app/recipes/loading.tsx            ← NEW — skeleton grid
/src/components/browse/RecipeCard.tsx   ← NEW — card component
/src/components/browse/BrowseFilters.tsx ← NEW — filter sidebar / drawer
/src/components/browse/SearchBar.tsx    ← NEW — search input
/src/app/api/recipes/route.ts           ← NEW — GET /api/recipes
```

---

## API Route: `GET /api/recipes`

### Query Parameters

| Param | Type | Description |
|---|---|---|
| `q` | string | Full-text search query |
| `cuisine` | string | Cuisine type filter |
| `maxMinutes` | number | Total time filter (prep + cook) |
| `equipment` | string[] | Equipment slugs (AND match) |
| `ingredients` | string[] | Ingredient names (subset match) |
| `sort` | `newest \| quickest \| steps` | Sort order |
| `cursor` | string | Pagination cursor (ISO timestamp) |
| `limit` | number | Default 12, max 48 |

### Handler

```ts
// /src/app/api/recipes/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q') ?? '';
  const cuisine = searchParams.get('cuisine');
  const maxMinutes = searchParams.get('maxMinutes');
  const sort = searchParams.get('sort') ?? 'newest';
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number(searchParams.get('limit') ?? 12), 48);

  const where: any = { publishedAt: { not: null } };
  if (cuisine) where.cuisine = cuisine;
  if (maxMinutes) where.totalMinutes = { lte: Number(maxMinutes) };
  if (q) where.searchVector = { search: q.split(' ').join(' & ') };
  if (cursor) where.publishedAt = { lt: new Date(cursor) };

  const orderBy =
    sort === 'quickest' ? { totalMinutes: 'asc' } :
    sort === 'steps'    ? { steps: { _count: 'desc' } } :
    { publishedAt: 'desc' };

  const recipes = await prisma.recipe.findMany({
    where,
    orderBy,
    take: limit + 1,
    include: {
      author: { select: { name: true, avatarUrl: true } },
      _count: { select: { steps: true } },
      tags: true,
    },
  });

  const hasMore = recipes.length > limit;
  const data = hasMore ? recipes.slice(0, limit) : recipes;
  const nextCursor = hasMore ? data[data.length - 1].publishedAt?.toISOString() : null;

  return NextResponse.json({ recipes: data, nextCursor });
}
```

---

## Component: `RecipeCard.tsx`

Each card renders:
- Cover image (next/image, 16:9, lazy)
- Title (`--text-lg`, bold)
- Author avatar + name
- Cuisine badge + total time chip
- Step count badge
- Tags row (max 3, overflow hidden)

Card hover: `box-shadow` elevation lift + subtle scale (`transform: translateY(-2px)`). No colored left borders.

---

## Component: `BrowseFilters.tsx`

- Desktop: sticky left sidebar (240px width)
- Mobile: slide-up drawer triggered by "Filters" button
- Sections: Cuisine (radio), Time (slider 5–180 min), Equipment (checkbox list), Ingredients on hand (tag input)
- "Clear all" button resets all filters
- Filter state lives in URL search params (useSearchParams + router.replace) so filters are shareable/bookmarkable

---

## Component: `SearchBar.tsx`

- Debounced (300ms) input that updates `?q=` search param
- Show "X results" count below bar when query is active
- Clear button (×) when query is non-empty
- Keyboard: Escape clears query

---

## Skeleton: `loading.tsx`

Show 12 skeleton cards in the same grid layout. Each skeleton: rounded rect for image, two bars for title/meta, three short bars for tags. Use the standard shimmer animation from the design system.

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-07-01 | Visit `/recipes` unauthenticated | Full grid renders, no auth error |
| TC-07-02 | Search "pasta" | Only pasta recipes shown |
| TC-07-03 | Filter cuisine = Italian | Only Italian recipes |
| TC-07-04 | Filter maxMinutes = 30 | Only recipes ≤ 30 min total |
| TC-07-05 | Sort = quickest | Sorted ascending by totalMinutes |
| TC-07-06 | Scroll to bottom | Next 12 load (cursor pagination) |
| TC-07-07 | No results for query | Empty state shown with clear CTA |
| TC-07-08 | Unpublished recipe | Not visible on browse page |
| TC-07-09 | Filter by equipment "wok" | Only recipes requiring wok |
| TC-07-10 | Filter by ingredient "chicken" | Recipes containing chicken shown |
| TC-07-11 | Filters persisted in URL | Copy URL, paste in new tab → same filters active |
| TC-07-12 | Mobile: filter drawer | Opens, applies, closes correctly |
