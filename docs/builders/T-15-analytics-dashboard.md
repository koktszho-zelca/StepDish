# T-15 · Analytics Dashboard

## Context
The author dashboard shows lightweight analytics for each recipe: view count, cook-starts, completions, and import source. Data is collected via simple server-side event logging — no external analytics service required in MVP.

---

## Scope

| Item | Detail |
|---|---|
| Events tracked | `recipe_view`, `cook_start`, `cook_complete`, `recipe_import` |
| Storage | `RecipeEvent` table — append-only log |
| Aggregation | Server-side count queries per recipe |
| UI | Dashboard "Stats" tab — 4 KPI cards + 30-day sparkline |
| Privacy | No user tracking beyond owner's own recipes; no PII stored |

---

## Files to Create / Modify

```
/src/app/api/events/route.ts                 ← NEW — POST log event
/src/app/api/recipes/[id]/stats/route.ts     ← NEW — GET aggregated stats
/src/components/dashboard/StatsPanel.tsx     ← NEW — KPI cards + sparkline
/src/components/dashboard/Sparkline.tsx      ← NEW — inline SVG sparkline
/src/lib/events.ts                           ← NEW — event type constants + log helper
```

---

## Prisma Model

```prisma
model RecipeEvent {
  id        String   @id @default(cuid())
  recipeId  String
  recipe    Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  type      String   // recipe_view | cook_start | cook_complete | recipe_import
  source    String?  // "direct" | "browse" | "import_url" | "import_text"
  createdAt DateTime @default(now())

  @@index([recipeId, type, createdAt])
}
```

---

## Event Constants: `events.ts`

```ts
export const EVENT = {
  RECIPE_VIEW:      'recipe_view',
  COOK_START:       'cook_start',
  COOK_COMPLETE:    'cook_complete',
  RECIPE_IMPORT:    'recipe_import',
} as const;

export type EventType = typeof EVENT[keyof typeof EVENT];

export async function logEvent(recipeId: string, type: EventType, source?: string) {
  await prisma.recipeEvent.create({ data: { recipeId, type, source } });
}
```

---

## API Route: `POST /api/events`

```ts
export async function POST(req: Request) {
  const { recipeId, type, source } = await req.json();
  if (!recipeId || !type) return NextResponse.json({ ok: false }, { status: 400 });
  logEvent(recipeId, type, source).catch(console.error); // non-blocking
  return NextResponse.json({ ok: true });
}
```

**Client helper:**
```ts
export const trackEvent = (recipeId: string, type: string, source?: string) =>
  fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipeId, type, source }) }).catch(() => {});
```

Call `trackEvent` at:
- Detail page load → `recipe_view`
- Cook Mode open → `cook_start`
- Cook Mode complete screen → `cook_complete`
- Import save → `recipe_import`

---

## API Route: `GET /api/recipes/[id]/stats`

```ts
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  const recipe = await prisma.recipe.findUnique({ where: { id: params.id } });
  if (!recipe || recipe.authorId !== userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [totals, daily] = await Promise.all([
    prisma.recipeEvent.groupBy({
      by: ['type'],
      where: { recipeId: params.id },
      _count: { _all: true },
    }),
    prisma.$queryRaw<{ date: string; type: string; count: number }[]>`
      SELECT DATE(created_at) as date, type, COUNT(*)::int as count
      FROM "RecipeEvent"
      WHERE recipe_id = ${params.id}
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at), type
      ORDER BY date ASC
    `,
  ]);

  return NextResponse.json({ totals, daily });
}
```

---

## Component: `StatsPanel.tsx`

4 KPI cards in a 2×2 grid:
- 👁 **Views** — total `recipe_view` count
- 🍳 **Cook starts** — total `cook_start` count
- ✅ **Completions** — total `cook_complete` count
- 📥 **Imports** — total `recipe_import` count

Below: 30-day sparkline of daily views.

Each KPI card:
- Large number (`--text-xl`, `font-variant-numeric: tabular-nums`)
- Muted label below
- Trend indicator: ↑↓ if last 7d vs prior 7d differs by > 10%

---

## Component: `Sparkline.tsx`

```tsx
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 200, height = 40, color = 'var(--color-primary)' }: SparklineProps) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" points={points} />
    </svg>
  );
}
```

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-15-01 | Visit recipe detail page | `recipe_view` event logged |
| TC-15-02 | Open Cook Mode | `cook_start` event logged |
| TC-15-03 | Complete Cook Mode | `cook_complete` event logged |
| TC-15-04 | Save imported recipe | `recipe_import` event logged |
| TC-15-05 | Owner opens Stats tab | 4 KPI cards shown |
| TC-15-06 | Sparkline renders | 30 data points as SVG polyline |
| TC-15-07 | Non-owner requests stats | 403 returned |
| TC-15-08 | Event API fire-and-forget | Returns 200 immediately |
| TC-15-09 | No events yet | KPIs show 0, sparkline flat |
| TC-15-10 | Delete recipe | All events cascade-deleted |
