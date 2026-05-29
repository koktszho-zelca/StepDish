# T-12 · Equipment Filter

## Context
Users browsing recipes can filter by equipment they own (e.g. "I have a wok and an oven"). The filter returns only recipes where ALL required equipment is a subset of what the user selected. Equipment is stored as a normalised `Equipment` table linked to steps.

---

## Scope

| Item | Detail |
|---|---|
| Filter location | Browse page sidebar / drawer (T-07) |
| Match logic | Recipe must use ONLY equipment the user has checked (subset match) |
| Equipment source | Normalised `Equipment` table; linked to steps via `StepEquipment` join |
| UI | Checkbox list with equipment icons |
| URL persistence | `?equipment=wok,oven` in search params |

---

## Files to Create / Modify

```
/src/app/api/equipment/route.ts               ← NEW — GET full equipment list
/src/components/browse/EquipmentFilter.tsx    ← NEW — checkbox list UI
/src/app/api/recipes/route.ts                 ← MODIFY — add equipment filter logic
/src/lib/equipment.ts                         ← NEW — equipment slug helpers
```

---

## Equipment Model (T-03 reference)

```prisma
model Equipment {
  id    String  @id @default(cuid())
  name  String  @unique
  slug  String  @unique
  icon  String? // lucide icon name e.g. "flame", "zap"
  steps StepEquipment[]
}

model StepEquipment {
  stepId      String
  equipmentId String
  step        Step      @relation(fields: [stepId], references: [id])
  equipment   Equipment @relation(fields: [equipmentId], references: [id])
  @@id([stepId, equipmentId])
}
```

---

## API Route: `GET /api/equipment`

```ts
export async function GET() {
  const equipment = await prisma.equipment.findMany({
    orderBy: { steps: { _count: 'desc' } },
    include: { _count: { select: { steps: true } } },
  });
  return NextResponse.json(equipment);
}
```

---

## Filter Logic in `GET /api/recipes`

```ts
if (equipmentSlugs.length > 0) {
  const validRecipes = await prisma.$queryRaw<{ recipeId: string }[]>`
    SELECT DISTINCT s."recipeId"
    FROM "Step" s
    JOIN "StepEquipment" se ON se."stepId" = s.id
    JOIN "Equipment" e ON e.id = se."equipmentId"
    GROUP BY s."recipeId"
    HAVING bool_and(e.slug = ANY(${equipmentSlugs}::text[]))
  `;
  where.id = { in: validRecipes.map(r => r.recipeId) };
}
```

---

## Component: `EquipmentFilter.tsx`

- Fetch equipment list from `GET /api/equipment` on mount
- Render as checkbox list, each item showing icon + name + "(N recipes)" count
- Checked items update `?equipment=` URL param (comma-separated slugs)
- "Clear" link resets equipment filter
- Skeleton shown while loading equipment list

### Equipment Icon Mapping

Use Lucide icon names stored in `Equipment.icon`:
- `frying pan` → `flame`
- `oven` → `square`
- `wok` → `circle`
- `blender` → `zap`
- `cutting board` → `scissors`
- Fallback: `utensils`

---

## Seed Data

```ts
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
];
```

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-12-01 | Filter by "wok" | Only recipes using wok shown |
| TC-12-02 | Filter by "wok" + "oven" | Recipes using wok or oven |
| TC-12-03 | Recipe requires "blender" — user hasn't checked it | Recipe excluded |
| TC-12-04 | No equipment filter set | All published recipes shown |
| TC-12-05 | Equipment list loads in sidebar | All items shown with icons |
| TC-12-06 | Equipment filter in URL | Shareable URL restores filter |
| TC-12-07 | Clear equipment filter | All recipes reload |
| TC-12-08 | Recipe has no equipment linked | Always visible regardless of filter |
| TC-12-09 | API returns equipment sorted by use | Most-used equipment first |
| TC-12-10 | Unknown slug in URL param | Ignored gracefully, no 500 |
