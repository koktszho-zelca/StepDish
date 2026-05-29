# T-15 · Analytics Dashboard

> **Batch:** 3 · **Phase:** 3 — Quality & Retention · **Depends on:** T-04, T-08

---

## Context

Once users start publishing recipes, they naturally want to know: "Is anyone actually cooking this?" T-15 adds a lightweight analytics layer — no external analytics service, no tracking scripts, just server-side event logging that feeds a simple author-only stats view.

The principle is minimal and privacy-respecting: events are logged per-recipe, only for the recipe owner's own view, and no personally identifying information is stored. The dashboard shows four key metrics (views, cook starts, completions, imports) plus a 30-day sparkline of daily activity.

This feature also provides the data foundation for future features like "trending recipes", "most cooked" sorting, and personalised recommendations.

---

## Scope

| Item | Detail |
|---|---|
| Events tracked | `recipe_view`, `cook_start`, `cook_complete`, `recipe_import` |
| Storage | `RecipeEvent` table — append-only log, never mutated |
| Aggregation | Server-side count queries per recipe |
| UI | "Stats" tab in recipe editor sidebar — 4 KPI cards + 30-day sparkline |
| Access control | Owner-only; 403 for any other user |
| Privacy | No user tracking; no PII; events scoped to recipe only |

---

## Files to Create / Modify

```
/src/app/api/events/route.ts                   ← NEW    — POST log event (fire-and-forget)
/src/app/api/recipes/[id]/stats/route.ts       ← NEW    — GET aggregated stats (owner only)
/src/lib/events.ts                             ← NEW    — event type constants + server log helper
/src/lib/trackEvent.ts                         ← NEW    — client-side fire-and-forget helper
/src/components/dashboard/StatsPanel.tsx       ← NEW    — KPI cards + sparkline panel
/src/components/dashboard/Sparkline.tsx        ← NEW    — inline SVG 30-day sparkline
/src/components/recipe/RecipeEditorSidebar.tsx ← MODIFY — add "Stats" tab alongside "History"
/prisma/schema.prisma                          ← MODIFY — add RecipeEvent model
```

---

## Database: `RecipeEvent` Model

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

`onDelete: Cascade` ensures all events are cleaned up when a recipe is deleted — no orphaned rows.

---

## Event Tracking

### Server Helper: `events.ts`

```ts
export const EVENT = {
  RECIPE_VIEW:    'recipe_view',
  COOK_START:     'cook_start',
  COOK_COMPLETE:  'cook_complete',
  RECIPE_IMPORT:  'recipe_import',
} as const;

export type EventType = typeof EVENT[keyof typeof EVENT];

export async function logEvent(
  recipeId: string,
  type: EventType,
  source?: string
) {
  await prisma.recipeEvent.create({ data: { recipeId, type, source } });
}
```

### Client Helper: `trackEvent.ts`

Fire-and-forget — never blocks UI, never throws to the caller.

```ts
export function trackEvent(
  recipeId: string,
  type: string,
  source?: string
): void {
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipeId, type, source }),
  }).catch(() => {}); // intentionally swallowed
}
```

### Where to Call `trackEvent`

| Location | Event | Source |
|---|---|---|
| Recipe detail page (`useEffect` on mount) | `recipe_view` | `'browse'` or `'direct'` |
| Cook Mode open button click | `cook_start` | — |
| Cook Mode completion screen render | `cook_complete` | — |
| Import save success | `recipe_import` | `'import_url'` or `'import_text'` |

---

## API Routes

### `POST /api/events`

Receives event from client. Non-blocking — returns 200 immediately; logging happens async.

```ts
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.recipeId || !body?.type) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Fire-and-forget — don't await
  logEvent(body.recipeId, body.type, body.source).catch(err =>
    console.error('[events] log failed:', err)
  );
  return NextResponse.json({ ok: true });
}
```

### `GET /api/recipes/[id]/stats`

Owner-only. Returns aggregated totals + daily breakdown for sparkline.

```ts
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Next.js 15: params is a Promise
  const { userId } = await auth();

  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe || recipe.authorId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [totals, daily] = await Promise.all([
    prisma.recipeEvent.groupBy({
      by: ['type'],
      where: { recipeId: id },
      _count: { _all: true },
    }),
    prisma.$queryRaw<{ date: string; type: string; count: number }[]>`
      SELECT
        DATE(created_at)::text AS date,
        type,
        COUNT(*)::int AS count
      FROM "RecipeEvent"
      WHERE recipe_id = ${id}
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

### Layout

```
┌─ Stats ──────────────────────────────────────────┐
│                                                  │
│  ┌────────────┐  ┌────────────┐                 │
│  │  👁  1,204  │  │  🍳   87  │                 │
│  │  Views     │  │  Cook       │                 │
│  │  ↑ 12%     │  │  starts     │                 │
│  └────────────┘  └────────────┘                 │
│  ┌────────────┐  ┌────────────┐                 │
│  │  ✅   43   │  │  📥    2   │                 │
│  │  Completions│  │  Imports   │                 │
│  └────────────┘  └────────────┘                 │
│                                                  │
│  Daily views — last 30 days                      │
│  ╭─────────────────────────────────────────╮    │
│  │   ╭╮  ╭──╮                              │    │
│  │ ╭─╯╰──╯  ╰────────────────────────────  │    │
│  ╰─────────────────────────────────────────╯    │
└──────────────────────────────────────────────────┘
```

### KPI Card Design

- Large number in `--text-xl`, `font-variant-numeric: tabular-nums`
- Label below in `--color-text-muted`, `--text-sm`
- Trend indicator: `↑` (green) or `↓` (muted red) when last-7-day vs prior-7-day count differs by > 10%
- Loading state: skeleton shimmer on number and label
- Zero state: shows `0` with no trend indicator

---

## Component: `Sparkline.tsx`

A pure SVG line chart — no chart library dependency, no external script.

```tsx
interface SparklineProps {
  data: number[];      // 30 values, one per day (0 if no events that day)
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({
  data,
  width = 240,
  height = 48,
  color = 'var(--color-primary)',
}: SparklineProps) {
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (v / max) * (height - 4); // 4px padding from top
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
```

Data preparation: before passing to `Sparkline`, build a 30-element array with `0` for days with no events:

```ts
function buildSparklineData(daily: DailyRow[], type: string): number[] {
  const map = new Map(daily.filter(d => d.type === type).map(d => [d.date, d.count]));
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return map.get(date.toISOString().slice(0, 10)) ?? 0;
  });
}
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `POST /api/events` receives invalid body | Returns 400; no event logged |
| DB write fails for event | Logged to server console; client unaffected (fire-and-forget) |
| Non-owner requests stats | 403 returned; no data leaked |
| Recipe deleted | Cascade deletes all associated events |
| No events yet | KPIs show `0`; sparkline shows flat line at baseline |
| Stats query times out | 500 returned; `StatsPanel` shows error state with retry button |

---

## Dependencies

- T-04 · Recipe Editor (sidebar where Stats tab lives)
- T-08 · Cook Mode (cook_start and cook_complete events emitted here)
- T-09 · Revision History (Stats tab sits alongside History tab in same sidebar)
- No new npm packages required

---

## Definition of Done

- [ ] `RecipeEvent` model added to schema and migrated
- [ ] `trackEvent` called correctly at all 4 trigger points
- [ ] `POST /api/events` returns 200 without blocking UI
- [ ] `GET /api/recipes/[id]/stats` returns 403 for non-owners
- [ ] 4 KPI cards render with correct counts
- [ ] Trend indicator correct when last-7d differs from prior-7d by > 10%
- [ ] Sparkline renders 30 data points as SVG polyline
- [ ] Flat line shown when no events exist
- [ ] Recipe delete cascades and removes all events
- [ ] Stats tab accessible in recipe editor sidebar alongside History tab

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-15-01 | Visit recipe detail page | `recipe_view` event logged asynchronously |
| TC-15-02 | Open Cook Mode | `cook_start` event logged |
| TC-15-03 | Complete all Cook Mode steps | `cook_complete` event logged |
| TC-15-04 | Save imported recipe | `recipe_import` event logged |
| TC-15-05 | Owner opens Stats tab | 4 KPI cards shown with correct counts |
| TC-15-06 | Non-owner calls `/api/recipes/[id]/stats` | 403 returned |
| TC-15-07 | Stats called for own recipe | 200, correct data returned |
| TC-15-08 | Sparkline with data | SVG polyline with 30 points rendered |
| TC-15-09 | No events yet | KPIs show 0; sparkline is flat |
| TC-15-10 | POST /api/events | Returns 200 before DB write completes |
| TC-15-11 | POST with missing recipeId | Returns 400 |
| TC-15-12 | Delete recipe | All RecipeEvents cascade-deleted |
| TC-15-13 | Last 7 days higher than prior 7 | Trend shows ↑ in green |
| TC-15-14 | Last 7 days lower than prior 7 | Trend shows ↓ in muted red |
| TC-15-15 | Stats query timeout | Error state shown with retry button |
