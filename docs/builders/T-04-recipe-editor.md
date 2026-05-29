# T-04 — Recipe Editor (Core)

> **Phase:** 1 | **Depends on:** T-02, T-03 | **Parallelisable:** No

---

## Objective

Build the recipe editor page where authenticated users can create and edit recipes. The editor handles recipe-level metadata (title, cuisine, servings, total time, visibility) and renders the list of steps. Step creation and editing is handled in T-05.

---

## Acceptance Criteria

- [ ] Route `app/(dashboard)/recipes/new/page.tsx` renders a blank recipe editor
- [ ] Route `app/(dashboard)/recipes/[id]/edit/page.tsx` loads and renders an existing recipe for editing
- [ ] Recipe form fields: title (required), cuisine (optional dropdown), servings (number, default 2), total estimated time (minutes, optional), visibility (Draft / Published toggle)
- [ ] A read-only **Equipment Needed** section shows all equipment tags compiled from the recipe's steps (auto-updated)
- [ ] Steps list renders below the header form; each step shows position, action summary, duration, equipment icon, and reminder icon
- [ ] Steps can be reordered via drag-and-drop (update `position` field on drop)
- [ ] A **+ Add Step** button opens the Step Editor Drawer (T-05)
- [ ] Clicking an existing step opens the Step Editor Drawer pre-filled with that step's data
- [ ] A **Save** button in the header calls `POST /api/recipes` (new) or `PATCH /api/recipes/[id]` (edit)
- [ ] On save, a new `Revision` snapshot is written to the database
- [ ] Auto-save triggers every 30 seconds if the form has unsaved changes (saves as draft)
- [ ] Unsaved changes show a visual indicator (e.g., "Unsaved changes" badge)
- [ ] Delete recipe option is available from a `···` overflow menu; triggers soft delete after confirmation modal
- [ ] All form inputs are validated with Zod before submission
- [ ] API errors are shown inline (toast or field-level error)

---

## API Routes Required

### `POST /api/recipes`
- **Auth:** Required
- **Body:** `{ title, cuisine?, servings, totalMinutes?, visibility, steps?: [] }`
- **Returns:** `{ id, ...recipe }`
- **Side effects:** Creates `Revision` record (version 1)

### `GET /api/recipes/[id]`
- **Auth:** Required (own recipes only, or published for public)
- **Returns:** Full recipe with steps, ingredients, equipment

### `PATCH /api/recipes/[id]`
- **Auth:** Required (own recipe only)
- **Body:** Partial recipe fields
- **Returns:** Updated recipe
- **Side effects:** Creates new `Revision` record

### `DELETE /api/recipes/[id]`
- **Auth:** Required (own recipe only)
- **Action:** Sets `deletedAt = now()` (soft delete)
- **Returns:** `{ success: true }`

---

## Component Structure

```
app/(dashboard)/recipes/new/page.tsx
  └── RecipeEditor (components/recipe/RecipeEditor.tsx)
        ├── RecipeHeaderForm (components/recipe/RecipeHeaderForm.tsx)
        │     ├── TitleInput
        │     ├── CuisineSelect
        │     ├── ServingsInput
        │     ├── TotalTimeInput
        │     └── VisibilityToggle
        ├── EquipmentSummary (components/recipe/EquipmentSummary.tsx)
        │     └── (read-only list of compiled equipment tags)
        ├── StepList (components/step/StepList.tsx)
        │     └── StepCard[] (components/step/StepCard.tsx)
        └── StepEditorDrawer (components/step/StepEditorDrawer.tsx) [T-05]
```

---

## Expected Outcome

An authenticated user can navigate to `/recipes/new`, fill in a recipe title and metadata, add steps (T-05), and save the recipe. The recipe is stored in the database with a revision snapshot. The editor reloads correctly when navigating to `/recipes/[id]/edit`.

---

## Test Cases

| ID | Test | Expected Result | How to verify |
|---|---|---|---|
| TC-04-01 | Visit `/recipes/new` unauthenticated | Redirect to `/sign-in` | Browser |
| TC-04-02 | Submit recipe with no title | Validation error on title field | Browser |
| TC-04-03 | Submit valid recipe | Recipe saved, redirected to edit page with new ID | Browser + DB |
| TC-04-04 | `POST /api/recipes` creates Revision | `Revision` row with `version = 1` in DB | DB query |
| TC-04-05 | Load existing recipe for edit | All fields pre-filled correctly | Browser + compare with DB |
| TC-04-06 | Edit recipe title and save | `PATCH` called, title updated in DB, new Revision created | DB query |
| TC-04-07 | Soft delete recipe | `deletedAt` set in DB, recipe no longer shows on dashboard | DB query + browser |
| TC-04-08 | Auto-save triggers after 30s | Unsaved indicator clears, DB updated | Wait 30s with unsaved changes |
| TC-04-09 | Equipment summary updates when step is added | Equipment chips appear after step with equipment is saved | Browser |
| TC-04-10 | Drag-and-drop reorders steps | Step positions updated in DB | Drag + DB query |
| TC-04-11 | `PATCH` by non-owner returns 403 | HTTP 403 Forbidden | API test with different user token |

---

## Notes

- Use `@dnd-kit/core` and `@dnd-kit/sortable` for drag-and-drop step reordering.
- The `EquipmentSummary` component should derive its list from `recipe.steps[].equipment` — do not store it separately in the form state.
- Auto-save should debounce: do not fire on every keystroke. Set a dirty flag on any field change; the 30s interval only triggers if the dirty flag is true.
- The `Revision` snapshot should store the full recipe object as JSON including steps, ingredients, and equipment at the time of save.
