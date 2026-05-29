# T-08 · Recipe Detail Page

## Context
The public detail page (`/recipes/[slug]`) shows a published recipe in read mode. Users can check off ingredients as they gather them, then enter Cook Mode which walks step-by-step with timers. Logged-in users who own the recipe see an Edit button.

---

## Scope

| Item | Detail |
|---|---|
| Route | `/recipes/[slug]` — public read, auth optional |
| Cook Mode | Step-by-step overlay, per-step timers (T-06) |
| Ingredient check-off | Client-side only, resets on reload |
| Edit access | Owner only — links to `/dashboard/recipes/[id]/edit` |
| SEO | `generateMetadata` with title, description, og:image |

---

## Files to Create / Modify

```
/src/app/recipes/[slug]/page.tsx              ← NEW — detail page (server component)
/src/app/recipes/[slug]/loading.tsx           ← NEW — skeleton
/src/components/detail/IngredientList.tsx     ← NEW — checklist of ingredients
/src/components/detail/StepList.tsx           ← NEW — read-mode step list
/src/components/cook/CookMode.tsx             ← NEW — full-screen cook overlay
/src/components/cook/CookStep.tsx             ← NEW — single step in cook mode
/src/app/api/recipes/[slug]/route.ts          ← NEW — GET /api/recipes/[slug]
```

---

## API Route: `GET /api/recipes/[slug]`

```ts
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const recipe = await prisma.recipe.findUnique({
    where: { slug: params.slug, publishedAt: { not: null } },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        include: { ingredients: true, equipment: true },
      },
      tags: true,
      author: { select: { name: true, avatarUrl: true } },
    },
  });
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(recipe);
}
```

---

## Page Layout: `/recipes/[slug]/page.tsx`

Structure (desktop two-column, mobile single-column):

```
┌─────────────────────────────────────────────────────┐
│  Cover image (full-width, 16:9, priority load)      │
├──────────────────────────┬──────────────────────────┤
│  Title                   │  Sidebar                 │
│  Author + date           │  IngredientList          │
│  Cuisine / time / steps  │  (sticky on desktop)     │
│  Tags                    │                          │
├──────────────────────────┤                          │
│  StepList (read mode)    │                          │
└──────────────────────────┴──────────────────────────┘
│  [Start Cooking] button — sticky bottom on mobile   │
└─────────────────────────────────────────────────────┘
```

The **Start Cooking** button opens `<CookMode>` as a full-screen overlay (`position: fixed; inset: 0; z-index: 50`).

---

## Component: `IngredientList.tsx`

- Renders each ingredient with a checkbox
- Checking marks the ingredient with `line-through` + muted colour
- "Check all" / "Uncheck all" controls at top
- State is local (`useState`) — intentionally not persisted
- Grouped by step if `stepId` is set on ingredient, else flat list

---

## Component: `StepList.tsx` (read mode)

- Numbered steps with action text
- Inline ingredient chips (teal, small) linking to ingredient in the sidebar list
- Duration shown as a small clock chip if `durationSeconds > 0`
- Equipment icons shown if step has equipment linked
- Reminder text shown in a subtle callout box if present

---

## Component: `CookMode.tsx`

Full-screen overlay with:
- Header: recipe title + step X of N + close button (×)
- Progress bar across top (step index / total)
- Current `<CookStep>` centred in viewport
- Previous / Next navigation (swipe on mobile, arrow buttons on desktop)
- Keyboard: ArrowRight = next, ArrowLeft = prev, Escape = exit

Transition between steps: `opacity` fade + `translateY(8px)` lift-in (100ms).

---

## Component: `CookStep.tsx`

Each step card shows:
- Step number badge
- Action text (large, `--text-xl`)
- Ingredients used (chips)
- Equipment needed (icons + labels)
- `<TimerDisplay>` + `<TimerControls>` if `durationSeconds > 0` (from T-06)
- Reminder text in amber callout box if present
- Notes (if any) in a collapsed "Chef's note" accordion

---

## SEO: `generateMetadata`

```ts
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const recipe = await getRecipeBySlug(params.slug);
  if (!recipe) return { title: 'Recipe not found' };
  return {
    title: `${recipe.title} · StepDish`,
    description: recipe.description ?? `${recipe.steps.length} steps · ${recipe.totalMinutes} min`,
    openGraph: {
      images: [recipe.coverImageUrl ?? '/og-default.jpg'],
    },
  };
}
```

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-08-01 | Visit detail page for published recipe | Full page renders |
| TC-08-02 | Visit detail for unpublished recipe | 404 page shown |
| TC-08-03 | Check off ingredient | Strikes through, doesn't affect others |
| TC-08-04 | Click "Start Cooking" | CookMode overlay opens |
| TC-08-05 | Navigate next/prev in CookMode | Steps advance/go back correctly |
| TC-08-06 | Swipe left in CookMode (mobile) | Next step |
| TC-08-07 | Press Escape in CookMode | Overlay closes |
| TC-08-08 | Step with timer in CookMode | TimerDisplay shows, starts on click |
| TC-08-09 | Owner visits their own recipe | Edit button visible |
| TC-08-10 | Non-owner visits recipe | No edit button |
| TC-08-11 | OG metadata | Title + description + image in head |
| TC-08-12 | Recipe with no cover image | OG default image used |
