# T-16 · Dietary Tags & Filters

## Context
Recipes can be tagged with dietary labels (vegetarian, vegan, gluten-free, dairy-free, nut-free, halal, keto, low-carb). Tags are displayed on recipe cards, detail pages, and are filterable on the browse page. Authors set tags manually; a future AI-assist pass can suggest tags from ingredient content.

---

## Scope

| Item | Detail |
|---|---|
| Tag storage | `DietaryTag` enum — predefined list, not freeform |
| Assignment | Author sets tags in recipe editor (multi-select) |
| Display | Pills on recipe card + detail page header |
| Filtering | Browse page filter — multi-select, AND logic (recipe must match ALL selected tags) |
| URL persistence | `?diet=vegetarian,gluten-free` |
| AI suggestion | Out of scope for T-16; flagged for T-21 |

---

## Files to Create / Modify

```
/src/lib/dietary.ts                          ← NEW — tag definitions + display config
/src/components/recipe/DietaryPills.tsx      ← NEW — tag pill display
/src/components/editor/DietaryTagSelector.tsx ← NEW — multi-select in editor
/src/components/browse/DietaryFilter.tsx     ← NEW — browse filter
/src/app/api/recipes/route.ts                ← MODIFY — add diet filter
/prisma/schema.prisma                        ← MODIFY — add tags field to Recipe
```

---

## Prisma Schema

```prisma
enum DietaryTag {
  VEGETARIAN
  VEGAN
  GLUTEN_FREE
  DAIRY_FREE
  NUT_FREE
  HALAL
  KETO
  LOW_CARB
}

model Recipe {
  // ... existing fields
  dietaryTags DietaryTag[]
}
```

---

## Tag Definitions: `dietary.ts`

```ts
export const DIETARY_TAGS = [
  { value: 'VEGETARIAN',  label: 'Vegetarian',  emoji: '🥦', color: 'success' },
  { value: 'VEGAN',       label: 'Vegan',        emoji: '🌱', color: 'success' },
  { value: 'GLUTEN_FREE', label: 'Gluten-free',  emoji: '🌾', color: 'warning' },
  { value: 'DAIRY_FREE',  label: 'Dairy-free',   emoji: '🥛', color: 'warning' },
  { value: 'NUT_FREE',    label: 'Nut-free',     emoji: '🥜', color: 'warning' },
  { value: 'HALAL',       label: 'Halal',        emoji: '☪️',  color: 'primary' },
  { value: 'KETO',        label: 'Keto',         emoji: '🥩', color: 'orange' },
  { value: 'LOW_CARB',    label: 'Low-carb',     emoji: '📉', color: 'orange' },
] as const;

export type DietaryTagValue = typeof DIETARY_TAGS[number]['value'];
```

---

## Component: `DietaryPills.tsx`

- Receives `tags: DietaryTag[]`
- Renders each as a small pill: `emoji + label`
- Uses `--color-{color}-highlight` as background, `--color-{color}` as text
- `maxDisplay` prop: show first N, then `+2 more` overflow pill
- Clicking a pill on browse page applies that diet filter

```tsx
export function DietaryPills({ tags, maxDisplay = 3 }: { tags: DietaryTag[], maxDisplay?: number }) {
  const visible = tags.slice(0, maxDisplay);
  const overflow = tags.length - maxDisplay;
  return (
    <div className="dietary-pills">
      {visible.map(tag => {
        const def = DIETARY_TAGS.find(d => d.value === tag);
        if (!def) return null;
        return (
          <span key={tag} className={`pill pill--${def.color}`}>
            {def.emoji} {def.label}
          </span>
        );
      })}
      {overflow > 0 && <span className="pill pill--muted">+{overflow} more</span>}
    </div>
  );
}
```

---

## Component: `DietaryTagSelector.tsx`

- Used in recipe editor sidebar
- Checkbox grid — 2 columns on desktop, 1 on mobile
- Each item: checkbox + emoji + label
- Selected tags highlighted with accent background
- "None selected" state shows empty placeholder text

---

## Component: `DietaryFilter.tsx`

- Used in browse page sidebar/drawer
- Multi-select checkbox list
- Each filter item shows count of matching published recipes in parentheses
- Selected filters shown as active pills above results grid
- "Clear dietary filters" link

---

## Filter Logic in `GET /api/recipes`

```ts
if (dietaryTags.length > 0) {
  where.dietaryTags = { hasEvery: dietaryTags as DietaryTag[] };
}
```

Prisma's `hasEvery` operator on array fields returns recipes that contain ALL selected tags — correct AND logic.

---

## Recipe Card Display

- Show up to 2 dietary pills on recipe card (space-constrained)
- Full set shown on recipe detail page header
- Pills are non-interactive on the detail page (decorative only)

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-16-01 | Author selects Vegan + Gluten-free | Both tags saved to recipe |
| TC-16-02 | Browse filter: Vegan only | Only vegan recipes shown |
| TC-16-03 | Browse filter: Vegan + Keto | Only recipes with BOTH tags shown |
| TC-16-04 | Recipe has 4 tags, maxDisplay=3 | Shows 3 pills + "+1 more" |
| TC-16-05 | No dietary filter set | All published recipes shown |
| TC-16-06 | Diet filter in URL | Shareable URL restores selection |
| TC-16-07 | Combined with ingredient + equipment filter | All three applied as AND |
| TC-16-08 | Recipe has no tags | Shown in unfiltered browse; excluded when any diet filter active |
| TC-16-09 | Tag count shown in filter panel | Matches actual published recipe count |
| TC-16-10 | Clear dietary filters | Filter removed, all recipes reload |
