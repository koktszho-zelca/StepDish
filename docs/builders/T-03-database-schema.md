# T-03 — Database Schema

> **Phase:** 1 | **Depends on:** T-01 | **Parallelisable:** Yes — can run in parallel with T-02

---

## Objective

Define and migrate the full PostgreSQL database schema using Prisma. The schema must support all Phase 1–3 features including recipes, structured steps, equipment tags, ingredients, revisions, saves, remixes, ratings, and comments.

---

## Acceptance Criteria

- [ ] `prisma/schema.prisma` contains all models listed below
- [ ] All models have correct field types, relations, and constraints
- [ ] `prisma migrate dev --name init` runs without errors
- [ ] `prisma generate` runs without errors
- [ ] `prisma/seed.ts` seeds the database with at least 3 sample recipes, equipment tags, and ingredients
- [ ] `npx prisma studio` opens and shows all tables populated with seed data
- [ ] All foreign key relations are enforced at the DB level
- [ ] Soft delete (`deletedAt`) is implemented on `Recipe` and `User`

---

## Schema Definition

Add the following to `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String    @id @default(uuid())
  clerkId     String    @unique @map("clerk_id")
  email       String    @unique
  displayName String    @map("display_name")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  recipes     Recipe[]
  saves       Save[]
  remixes     Remix[]
  ratings     Rating[]
  comments    Comment[]

  @@map("users")
}

model Recipe {
  id            String    @id @default(uuid())
  authorId      String    @map("author_id")
  title         String
  cuisine       String?
  servings      Int       @default(2)
  totalMinutes  Int?      @map("total_minutes")
  difficulty    Difficulty @default(EASY)
  visibility    Visibility @default(DRAFT)
  sourceUrl     String?   @map("source_url")
  isImported    Boolean   @default(false) @map("is_imported")
  remixedFromId String?   @map("remixed_from_id")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  author        User              @relation(fields: [authorId], references: [id])
  remixedFrom   Recipe?           @relation("RecipeRemix", fields: [remixedFromId], references: [id])
  remixes       Recipe[]          @relation("RecipeRemix")
  steps         RecipeStep[]
  ingredients   RecipeIngredient[]
  equipment     RecipeEquipment[]
  revisions     Revision[]
  saves         Save[]
  remixRecords  Remix[]
  ratings       Rating[]
  comments      Comment[]

  @@map("recipes")
}

model RecipeStep {
  id          String   @id @default(uuid())
  recipeId    String   @map("recipe_id")
  position    Int
  action      String
  durationMin Int?     @map("duration_min")
  reminder    String?
  notes       String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  recipe      Recipe              @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  ingredients StepIngredient[]
  equipment   StepEquipment[]

  @@map("recipe_steps")
}

model Ingredient {
  id           String             @id @default(uuid())
  name         String             @unique
  aliases      String[]           @default([])
  createdAt    DateTime           @default(now()) @map("created_at")

  recipeItems  RecipeIngredient[]
  stepItems    StepIngredient[]

  @@map("ingredients")
}

model RecipeIngredient {
  id           String     @id @default(uuid())
  recipeId     String     @map("recipe_id")
  ingredientId String     @map("ingredient_id")
  quantity     String?
  unit         String?
  notes        String?

  recipe       Recipe     @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id])

  @@unique([recipeId, ingredientId])
  @@map("recipe_ingredients")
}

model StepIngredient {
  id           String     @id @default(uuid())
  stepId       String     @map("step_id")
  ingredientId String     @map("ingredient_id")
  quantity     String?
  unit         String?

  step         RecipeStep @relation(fields: [stepId], references: [id], onDelete: Cascade)
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id])

  @@unique([stepId, ingredientId])
  @@map("step_ingredients")
}

model EquipmentTag {
  id        String            @id @default(uuid())
  name      String            @unique
  aliases   String[]          @default([])
  createdAt DateTime          @default(now()) @map("created_at")

  recipes   RecipeEquipment[]
  steps     StepEquipment[]

  @@map("equipment_tags")
}

model RecipeEquipment {
  recipeId      String       @map("recipe_id")
  equipmentId   String       @map("equipment_id")

  recipe        Recipe       @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  equipment     EquipmentTag @relation(fields: [equipmentId], references: [id])

  @@id([recipeId, equipmentId])
  @@map("recipe_equipment")
}

model StepEquipment {
  stepId      String       @map("step_id")
  equipmentId String       @map("equipment_id")

  step        RecipeStep   @relation(fields: [stepId], references: [id], onDelete: Cascade)
  equipment   EquipmentTag @relation(fields: [equipmentId], references: [id])

  @@id([stepId, equipmentId])
  @@map("step_equipment")
}

model Revision {
  id          String   @id @default(uuid())
  recipeId    String   @map("recipe_id")
  version     Int
  snapshot    Json
  changeSummary String? @map("change_summary")
  createdAt   DateTime @default(now()) @map("created_at")

  recipe      Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@map("revisions")
}

model Save {
  userId    String   @map("user_id")
  recipeId  String   @map("recipe_id")
  savedAt   DateTime @default(now()) @map("saved_at")

  user      User     @relation(fields: [userId], references: [id])
  recipe    Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@id([userId, recipeId])
  @@map("saves")
}

model Remix {
  userId          String   @map("user_id")
  originalId      String   @map("original_id")
  remixedRecipeId String   @map("remixed_recipe_id")
  remixedAt       DateTime @default(now()) @map("remixed_at")

  user            User     @relation(fields: [userId], references: [id])
  original        Recipe   @relation(fields: [originalId], references: [id])

  @@id([userId, originalId])
  @@map("remixes")
}

model Rating {
  userId    String   @map("user_id")
  recipeId  String   @map("recipe_id")
  score     Int
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user      User     @relation(fields: [userId], references: [id])
  recipe    Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@id([userId, recipeId])
  @@map("ratings")
}

model Comment {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  recipeId  String    @map("recipe_id")
  body      String
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  user      User      @relation(fields: [userId], references: [id])
  recipe    Recipe    @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@map("comments")
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum Visibility {
  DRAFT
  PUBLISHED
}
```

---

## Seed Data Instructions

Create `prisma/seed.ts` to insert:

1. **Equipment tags** (at minimum):
   `Wok`, `Frying Pan`, `Pot`, `Oven`, `Knife & Board`, `Blender`, `Air Fryer`, `Stand Mixer`, `Cast Iron Pan`, `Grill`, `Pressure Cooker`, `Food Processor`, `Microwave`

2. **Ingredients** (at minimum):
   `Garlic`, `Onion`, `Olive Oil`, `Soy Sauce`, `Chicken`, `Spaghetti`, `Tomato`, `Egg`, `Salt`, `Pepper`, `Butter`, `Flour`, `Sugar`

3. **3 sample recipes** with full steps, ingredients, and equipment:
   - Tomato Pasta (Italian, 35 min, Easy)
   - Garlic Butter Chicken (Asian, 25 min, Easy)
   - Simple Veggie Stir Fry (Asian, 15 min, Easy)

Run seed:
```bash
npx prisma db seed
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

---

## Expected Outcome

All tables exist in PostgreSQL. Running `npx prisma studio` shows all models with seed data. Relations are navigable — e.g., a Recipe shows its Steps, Ingredients, and Equipment.

---

## Test Cases

| ID | Test | Expected Result | How to verify |
|---|---|---|---|
| TC-03-01 | `prisma migrate dev` | Migration runs, all tables created | Terminal + `\dt` in psql |
| TC-03-02 | `prisma generate` | No errors, Prisma client updated | Terminal |
| TC-03-03 | `prisma db seed` | Seed data inserted without errors | Terminal |
| TC-03-04 | Query recipe with steps | Returns recipe + nested steps | `prisma.recipe.findFirst({ include: { steps: true } })` |
| TC-03-05 | Query recipe with equipment | Returns all equipment tags for recipe | `prisma.recipe.findFirst({ include: { equipment: { include: { equipment: true } } } })` |
| TC-03-06 | Delete recipe soft-deletes | `deletedAt` set, row still in DB | Set `deletedAt`, query for row |
| TC-03-07 | Create revision snapshot | `Revision` row with JSON snapshot saved | Insert revision, query back |
| TC-03-08 | Unique constraint on Save | Cannot save the same recipe twice | Insert duplicate Save, expect Prisma error |
| TC-03-09 | Rating score constraint | Scores outside 1–5 rejected | Add a DB check constraint or Zod validation |
| TC-03-10 | `prisma studio` opens | All 13 tables visible with seed data | Browser at `http://localhost:5555` |

---

## Notes

- Always use `@map` to keep DB column names snake_case while keeping Prisma field names camelCase.
- The `Revision.snapshot` field stores the full recipe JSON at the time of save — this enables full restore without re-computing diffs.
- `RecipeEquipment` is a compile-time aggregate — it should be populated automatically whenever a step's equipment changes (handled in T-05).
- Add a DB index on `recipes.visibility` and `recipes.deleted_at` for browse performance.
