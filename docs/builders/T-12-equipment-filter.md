# T-12 · Equipment Filter

> **Batch:** 3 · **Phase:** 2 — Import & Browse · **Depends on:** T-07, T-03

---

## Context

The browse page (T-07) currently filters by cuisine, total time, and dietary tags. T-12 adds equipment filtering — "show me only recipes I can cook with what I own."

This is a meaningful filter for users who live in small kitchens (no stand mixer, no food processor) or are cooking in a temporary setup (hotel kitchen, hostel). The filter should never feel restrictive by accident: it only applies when the user actively selects equipment they own, and a recipe with no equipment data is always shown regardless.

The match logic is a **set-subset check**: a recipe is included if every piece of equipment it requires is in the user's selected set. Recipes that require equipment the user hasn't selected are hidden.

---

## Scope

| Item | Detail |
|---|---|
| Filter location | Browse page sidebar on desktop, collapsible drawer on mobile |
| Match logic | Recipe's required equipment must be a subset of user's selected equipment |
| Equipment source | Normalised `Equipment` table; linked to steps via `StepEquipment` join |
| UI | Checkbox list with Lucide icon + name + recipe count |
| URL persistence | `?equipment=wok,oven` (comma-separated slugs) |
| Recipes with no equipment | Always shown regardless of filter selection |

---

## Files to Create / Modify

```
/src/app/api/equipment/route.ts               ← NEW    — GET list of all equipment
/src/app/api/recipes/route.ts                 ← MODIFY — add equipment filter to query
/src/components/browse/EquipmentFilter.tsx    ← NEW    — checkbox UI component
/src/lib/equipment.ts                         ← NEW    — slug helpers + seed list
/prisma/seed.ts                               ← MODIFY — seed Equipment table
```

---

## Behaviour Spec

### Filter Logic

A recipe is **included** when:
- The user has selected no equipment (filter not active), OR
- Every equipment item linked to any of the recipe's steps is present in the user's selected slugs

A recipe is **excluded** when:
- It requires at least one equipment item that is NOT in the user's selected slugs

Recipes with zero equipment links are always included.

### Correct SQL (subset check)

```sql
-- Returns recipe IDs where all required equipment is in the user's selected set
SELECT DISTINCT s."recipeId"
FROM "Step" s
LEFT JOIN "StepEquipment" se ON se."stepId" = s.id
LEFT JOIN "Equipment" e ON e.id = se."equipmentId"
GROUP BY s."recipeId"
HAVING COUNT(*) FILTER (
  WHERE e.slug IS NOT NULL
    AND NOT (e.slug = ANY($1::text[]))
) = 0;
-- $1 = array of user-selected slugs
```

> ⚠️ Do NOT use `HAVING bool_and(e.slug = ANY(...))` — this evaluates per row, not per recipe, and produces incorrect results when a recipe uses multiple pieces of equipment.

### API: `GET /api/equipment`

Returns all equipment items sorted by most-used first.

```ts
export async function GET() {
  const equipment = await prisma.equipment.findMany({
    orderBy: { steps: { _count: 'desc' } },
    include: { _count: { select: { steps: true } } },
  });
  return NextResponse.json(equipment);
}
```

Response shape:
```json
[
  { "id": "...", "name": "Frying Pan", "slug": "frying-pan", "icon": "flame", "_count": { "steps": 142 } },
  { "id": "...", "name": "Oven",        "slug": "oven",        "icon": "square", "_count": { "steps": 98 } }
]
```

---

## Component: `EquipmentFilter.tsx`

### UI Anatomy

```
┌─ Equipment ─────────────────────────────────┐
│  ☑  🔥 Frying Pan          (142 recipes)   │
│  ☑  □  Oven                 (98 recipes)   │
│  ☐  ⚡ Blender              (31 recipes)   │
│  ☐  ✂  Cutting Board        (87 recipes)   │
│                              [Clear all]   │
└─────────────────────────────────────────────┘
```

- Icon rendered via Lucide using the `icon` field from the Equipment record
- Each checkbox updates the `?equipment=` URL param immediately (no submit button)
- Recipe count shown in muted text after the name
- "Clear all" link only visible when at least one item is checked
- Skeleton loader shown while equipment list is fetching
- On mobile: collapsible section with chevron toggle

### Icon Mapping

| Equipment | Lucide icon |
|---|---|
| Frying Pan | `flame` |
| Saucepan | `droplets` |
| Oven | `square` |
| Wok | `circle` |
| Blender | `zap` |
| Food Processor | `cpu` |
| Mixing Bowl | `disc` |
| Cutting Board | `scissors` |
| Colander | `filter` |
| Peeler | `pen-tool` |
| Baking Tray | `grid` |
| Grater | `layout-grid` |
| Fallback | `utensils` |

---

## Seed Data

```ts
// prisma/seed.ts — equipment seed
const equipmentSeed = [
  { name: 'Frying Pan',     slug: 'frying-pan',      icon: 'flame' },
  { name: 'Saucepan',       slug: 'saucepan',         icon: 'droplets' },
  { name: 'Oven',           slug: 'oven',              icon: 'square' },
  { name: 'Wok',            slug: 'wok',               icon: 'circle' },
  { name: 'Blender',        slug: 'blender',           icon: 'zap' },
  { name: 'Food Processor', slug: 'food-processor',    icon: 'cpu' },
  { name: 'Mixing Bowl',    slug: 'mixing-bowl',       icon: 'disc' },
  { name: 'Cutting Board',  slug: 'cutting-board',     icon: 'scissors' },
  { name: 'Colander',       slug: 'colander',          icon: 'filter' },
  { name: 'Peeler',         slug: 'peeler',            icon: 'pen-tool' },
  { name: 'Baking Tray',    slug: 'baking-tray',       icon: 'grid' },
  { name: 'Grater',         slug: 'grater',            icon: 'layout-grid' },
  { name: 'Mortar & Pestle',slug: 'mortar-pestle',     icon: 'filter' },
  { name: 'Rolling Pin',    slug: 'rolling-pin',       icon: 'minus' },
  { name: 'Steamer',        slug: 'steamer',           icon: 'wind' },
];
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Unknown slug in `?equipment=` URL param | Ignored silently — no 500, filter applied to valid slugs only |
| Equipment API returns empty array | Filter section hidden (not shown as empty checkbox list) |
| DB query failure | Log error, return all recipes unfiltered |
| Recipe has no linked equipment | Always included in results |

---

## Dependencies

- T-07 · Public Browse (filter sidebar must already exist)
- T-03 · Database Schema (`Equipment`, `StepEquipment` models must be in place)
- T-11 · AI Extraction Tuning (`inferEquipment` populates equipment on imported recipes)
- Lucide React (`lucide-react` package)

---

## Definition of Done

- [ ] `Equipment` table seeded with 15 items
- [ ] `GET /api/equipment` returns items sorted by use count
- [ ] Subset-check SQL correctly excludes recipes missing required equipment
- [ ] Recipes with no equipment links always appear in results
- [ ] Unknown slugs in URL silently ignored
- [ ] `?equipment=` URL param persists and restores filter on page load
- [ ] Mobile: filter is collapsible
- [ ] Desktop: filter shown in sidebar with skeleton while loading
- [ ] "Clear all" resets filter

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-12-01 | Filter by `wok` only | Only recipes whose steps require only a wok (or nothing) |
| TC-12-02 | Filter by `wok` + `oven` | Recipes using wok, oven, or both — nothing else |
| TC-12-03 | Recipe requires `blender`, user didn't select it | Recipe excluded |
| TC-12-04 | Recipe has no equipment linked | Always shown regardless of filter |
| TC-12-05 | No equipment filter active | All published recipes shown |
| TC-12-06 | Equipment list loads in sidebar | 15 items shown with icons and counts |
| TC-12-07 | `?equipment=wok,oven` in URL | Filter pre-applied, checkboxes checked |
| TC-12-08 | Unknown slug `?equipment=thermomix` | Ignored; valid slugs still applied |
| TC-12-09 | Clear all | All recipes reload, URL param removed |
| TC-12-10 | Mobile view | Filter in collapsible drawer, works correctly |
| TC-12-11 | Equipment sorted by use | Most-used equipment appears first |
| TC-12-12 | Combined with time filter | Both filters applied (AND logic) |
