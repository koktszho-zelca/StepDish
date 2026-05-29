# T-05 — Step Model & Step Editor Drawer

> **Phase:** 1 | **Depends on:** T-04 | **Parallelisable:** No

---

## Objective

Implement the step data model and the Step Editor Drawer UI. Each step is a structured unit of a recipe with action, ingredients, duration, equipment, reminder, and notes. The drawer slides up from the bottom of the screen (mobile-first) and allows creating and editing individual steps.

---

## Acceptance Criteria

- [ ] Step Editor Drawer slides up from the bottom on mobile, appears as a side panel on desktop (≥768px)
- [ ] Drawer fields:
  - **Action** — dropdown with common options (Chop, Slice, Dice, Sauté, Fry, Boil, Simmer, Bake, Roast, Grill, Steam, Mix, Stir, Fold, Whisk, Blend, Season, Plate, Rest) plus a free-text fallback
  - **Ingredients** — multi-line add/remove list; each entry is linked to an `Ingredient` record via autocomplete
  - **Duration** — number input (minutes), optional
  - **Equipment** — tag input with autocomplete against `EquipmentTag` table; shows canonical suggestions below the input
  - **Reminder** — free-text, optional
  - **Notes** — free-text, optional
- [ ] Adding a new step calls `POST /api/recipes/[id]/steps`
- [ ] Editing an existing step calls `PATCH /api/steps/[stepId]`
- [ ] Deleting a step calls `DELETE /api/steps/[stepId]` with confirmation
- [ ] After save, drawer closes and `StepList` in the editor refreshes
- [ ] After step save, `RecipeEquipment` table is updated to reflect the current union of all step equipment
- [ ] Step position is set to `max(existing positions) + 1` on create
- [ ] All fields validated with Zod before submission
- [ ] Drawer is accessible: focus trapped inside when open, ESC closes it, focus returns to trigger element on close

---

## API Routes Required

### `POST /api/recipes/[id]/steps`
- **Auth:** Required (recipe owner only)
- **Body:** `{ action, ingredients: [{ ingredientId, quantity?, unit? }], durationMin?, equipment: [equipmentId], reminder?, notes? }`
- **Returns:** Created step with relations
- **Side effects:** Recalculates `RecipeEquipment` for the recipe

### `PATCH /api/steps/[stepId]`
- **Auth:** Required (recipe owner only)
- **Body:** Partial step fields
- **Returns:** Updated step
- **Side effects:** Recalculates `RecipeEquipment` for the recipe

### `DELETE /api/steps/[stepId]`
- **Auth:** Required (recipe owner only)
- **Returns:** `{ success: true }`
- **Side effects:** Recalculates `RecipeEquipment`; re-numbers remaining step positions

### `GET /api/equipment-tags`
- **Auth:** None required
- **Returns:** Full list of `EquipmentTag` records for autocomplete

### `GET /api/ingredients/search?q=`
- **Auth:** None required
- **Returns:** Matching `Ingredient` records for autocomplete (limit 10)

---

## RecipeEquipment Sync Logic

Every time a step is created, updated, or deleted, run the following server-side:

```ts
async function syncRecipeEquipment(recipeId: string) {
  // 1. Get all unique equipment IDs across all steps of this recipe
  const steps = await prisma.recipeStep.findMany({
    where: { recipeId },
    include: { equipment: true },
  })
  const equipmentIds = [...new Set(steps.flatMap(s => s.equipment.map(e => e.equipmentId)))]

  // 2. Delete existing RecipeEquipment rows for this recipe
  await prisma.recipeEquipment.deleteMany({ where: { recipeId } })

  // 3. Re-insert
  await prisma.recipeEquipment.createMany({
    data: equipmentIds.map(equipmentId => ({ recipeId, equipmentId })),
  })
}
```

Call `syncRecipeEquipment(recipeId)` at the end of every step create/update/delete handler.

---

## Component Structure

```
components/step/StepEditorDrawer.tsx
  ├── ActionSelect.tsx
  ├── IngredientMultiInput.tsx
  │     └── IngredientAutocomplete.tsx
  ├── DurationInput.tsx
  ├── EquipmentTagInput.tsx
  │     └── EquipmentAutocomplete.tsx
  ├── ReminderInput.tsx
  └── NotesInput.tsx
```

---

## Expected Outcome

A user can tap **+ Add Step** in the recipe editor, fill in the drawer fields, and save. The step appears in the step list. Equipment chips in the `EquipmentSummary` panel update to reflect the step's equipment. Editing an existing step opens the drawer pre-filled and updates correctly.

---

## Test Cases

| ID | Test | Expected Result | How to verify |
|---|---|---|---|
| TC-05-01 | Tap + Add Step | Drawer slides up with empty fields | Browser (mobile 375px) |
| TC-05-02 | Submit step with no action | Validation error on action field | Browser |
| TC-05-03 | Save valid step | Step appears in list, DB row created | Browser + DB |
| TC-05-04 | Equipment autocomplete | Typing "wok" suggests "Wok" from canonical list | Browser |
| TC-05-05 | Ingredient autocomplete | Typing "gar" suggests "Garlic" | Browser |
| TC-05-06 | Save step with equipment | `StepEquipment` + `RecipeEquipment` rows created | DB query |
| TC-05-07 | Delete step | Step removed, positions re-numbered, RecipeEquipment updated | DB query |
| TC-05-08 | ESC closes drawer | Drawer closes, focus returns to trigger | Browser keyboard |
| TC-05-09 | Tab key stays inside drawer | Focus does not leave drawer while open | Browser keyboard |
| TC-05-10 | Edit existing step | Drawer opens pre-filled, PATCH called on save | Browser + Network tab |
| TC-05-11 | Non-owner cannot edit step | `PATCH /api/steps/[id]` returns 403 | API test |
| TC-05-12 | RecipeEquipment sync on step delete | If only step with "Wok" deleted, "Wok" removed from RecipeEquipment | DB query |

---

## Notes

- The Action dropdown list should be stored as a constant in `lib/utils/stepActions.ts` — not hardcoded in the component.
- Ingredient entries in the drawer are linked by `ingredientId` — if the user types a name not in the DB, create a new `Ingredient` record on save (normalise the name to title case).
- Equipment entries follow the same pattern: if the typed name is not in `EquipmentTag`, create a new canonical tag.
- The drawer animation should use CSS `transform: translateY()` with `transition` — avoid `display: none` toggles which cause layout shift.
