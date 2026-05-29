# T-09 · Revision History

## Context
Every time a recipe is saved, a snapshot is stored in `RecipeVersion`. Users can view past versions, preview them, and restore any version. Restoration creates a new version (the restored state), never overwrites the history chain.

---

## Scope

| Item | Detail |
|---|---|
| Trigger | Every `PATCH /api/recipes/[id]` save creates a version |
| Storage | `RecipeVersion` model — full JSON snapshot of recipe + steps |
| UI location | Recipe editor sidebar panel "History" tab |
| Restore | Creates a new version with `restoredFromId` reference |
| Diff view | Show changed fields between two versions (optional in v1, recommended v2) |

---

## Files to Create / Modify

```
/src/app/api/recipes/[id]/versions/route.ts       ← NEW — GET list of versions
/src/app/api/recipes/[id]/versions/[vId]/route.ts ← NEW — GET single version
/src/app/api/recipes/[id]/versions/restore/route.ts ← NEW — POST restore
/src/components/editor/HistoryPanel.tsx           ← NEW — sidebar history list
/src/components/editor/VersionPreview.tsx         ← NEW — modal preview of a version
/src/lib/versioning.ts                            ← NEW — snapshot helper
```

---

## Prisma Model (already in T-03 schema, reference only)

```prisma
model RecipeVersion {
  id              String   @id @default(cuid())
  recipeId        String
  recipe          Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  snapshot        Json     // full recipe + steps at save time
  createdAt       DateTime @default(now())
  restoredFromId  String?  // set if this version is a restore of another
  label           String?  // optional user-set label e.g. "Before adding garlic variant"
}
```

---

## Snapshot Helper: `versioning.ts`

```ts
import { prisma } from './prisma';

export async function createVersion(recipeId: string) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        include: { ingredients: true, equipment: true },
      },
      tags: true,
    },
  });
  if (!recipe) throw new Error('Recipe not found');

  await prisma.recipeVersion.create({
    data: { recipeId, snapshot: recipe as any },
  });
}
```

Call `createVersion(recipeId)` at the end of every successful recipe save handler.

---

## API Routes

### `GET /api/recipes/[id]/versions`
Returns list of versions, newest first. Fields: `id`, `createdAt`, `label`, `restoredFromId`. Does NOT return full snapshot in list (too heavy).

### `GET /api/recipes/[id]/versions/[vId]`
Returns single version including full `snapshot` JSON. Used by preview modal.

### `POST /api/recipes/[id]/versions/restore`

```ts
// body: { versionId: string }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { versionId } = await req.json();
  const version = await prisma.recipeVersion.findUnique({ where: { id: versionId } });
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  const snap = version.snapshot as any;

  // Restore recipe fields
  await prisma.recipe.update({
    where: { id: params.id },
    data: {
      title: snap.title,
      description: snap.description,
      cuisine: snap.cuisine,
      totalMinutes: snap.totalMinutes,
      servings: snap.servings,
    },
  });

  // Replace steps: delete existing, recreate from snapshot
  await prisma.step.deleteMany({ where: { recipeId: params.id } });
  for (const step of snap.steps) {
    await prisma.step.create({
      data: {
        recipeId: params.id,
        order: step.order,
        action: step.action,
        durationSeconds: step.durationSeconds,
        reminder: step.reminder,
        notes: step.notes,
        ingredients: { create: step.ingredients },
        equipment: { connect: step.equipment.map((e: any) => ({ id: e.id })) },
      },
    });
  }

  // Create a new version recording this restoration
  await prisma.recipeVersion.create({
    data: {
      recipeId: params.id,
      snapshot: snap,
      restoredFromId: versionId,
      label: `Restored from ${new Date(version.createdAt).toLocaleDateString()}`,
    },
  });

  return NextResponse.json({ ok: true });
}
```

---

## Component: `HistoryPanel.tsx`

- Shown as a tab ("History") in the recipe editor right sidebar
- Lists versions as a timeline: dot on left, date/time on right, optional label below
- Each entry has two actions: **Preview** (opens modal) and **Restore** (with confirmation dialog)
- Current version highlighted with "Current" badge
- Restored versions show a "↩ Restored" badge with the original date

---

## Component: `VersionPreview.tsx`

- Modal overlay showing a read-only render of the selected version's snapshot
- Renders `StepList` and `IngredientList` in read-only mode from snapshot data
- Footer: **Close** + **Restore this version** button
- Restoring from preview closes modal and triggers restore API call

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-09-01 | Save recipe | New version created in DB |
| TC-09-02 | Multiple saves | Multiple versions in history list |
| TC-09-03 | Open History tab | Versions listed newest-first |
| TC-09-04 | Preview version | Modal opens with that version's steps |
| TC-09-05 | Restore version | Recipe and steps replaced with snapshot |
| TC-09-06 | After restore, check history | New "Restored" entry appears at top |
| TC-09-07 | Restore confirmation | Dialog shown before restore executes |
| TC-09-08 | Version with label | Label shown in timeline entry |
| TC-09-09 | Delete recipe | All versions cascade-deleted |
| TC-09-10 | Non-owner requests restore | 403 returned |
