# StepDish — AI Builder Task Specifications

> **For AI coding agents.** Each task entry defines what to build, the expected outcome, and the test cases that must pass before the task is considered complete.
>
> **Version 1.0 | May 2026**

---

## How to Read This Document

Each task entry contains:
- **Objective** — what to build in plain language
- **Inputs** — what exists before this task starts
- **Outputs** — files/routes/components created or modified
- **Acceptance Criteria** — behavioural requirements
- **Test Cases** — specific scenarios that must pass (manual or automated)
- **Notes** — edge cases, gotchas, and implementation hints

---

## Phase 1 — Core

---

### T-001 — Initialise Next.js Project

**Objective:** Bootstrap the StepDish codebase with the correct framework version, TypeScript, linting, and formatting configuration.

**Inputs:** Empty repository root.

**Outputs:**
- `package.json` with Next.js 14, TypeScript, ESLint, Prettier, Husky, lint-staged
- `tsconfig.json` with strict mode enabled
- `.eslintrc.json` extending `next/core-web-vitals`
- `.prettierrc` with project formatting rules
- `.husky/pre-commit` running lint-staged on staged files
- `.env.example` listing all required environment variables
- `src/` directory structure (see `CONVENTIONS.md`)
- `README.md` with setup instructions

**Acceptance Criteria:**
- [ ] `pnpm install` completes without errors
- [ ] `pnpm dev` starts the dev server on port 3000
- [ ] `pnpm build` produces a successful production build
- [ ] `pnpm lint` returns zero errors
- [ ] Committing a file with a lint error is blocked by Husky
- [ ] TypeScript strict mode is on (`"strict": true` in tsconfig)

**Test Cases:**

| # | Action | Expected Result |
|---|---|---|
| TC-001-01 | Run `pnpm install` on a clean clone | Zero errors, `node_modules` populated |
| TC-001-02 | Run `pnpm dev` | Server starts, `http://localhost:3000` returns 200 |
| TC-001-03 | Run `pnpm build` | Build completes, `.next/` folder created |
| TC-001-04 | Run `pnpm lint` | Zero ESLint errors or warnings |
| TC-001-05 | Add `const x: any = 1` to a file and commit | Husky blocks the commit with a lint error |
| TC-001-06 | Check `tsconfig.json` | `"strict": true` is present |

**Notes:**
- Use `pnpm` as the package manager throughout the project.
- Next.js version: `14.x` (App Router).
- Node version: `>=20.0.0`. Add `.nvmrc` with `20`.
- Prettier rules: `singleQuote: true`, `semi: false`, `printWidth: 100`, `tabWidth: 2`.

---

### T-002 — Configure PostgreSQL and Prisma ORM

**Objective:** Connect the project to a PostgreSQL database via Prisma, with a working client singleton and migration tooling.

**Inputs:** T-001 complete.

**Outputs:**
- `prisma/schema.prisma` with datasource and generator blocks
- `src/lib/prisma.ts` — Prisma client singleton (safe for Next.js hot reload)
- `.env.example` updated with `DATABASE_URL`
- `pnpm prisma:generate` script in `package.json`

**Acceptance Criteria:**
- [ ] `pnpm prisma generate` completes without errors
- [ ] `pnpm prisma db push` applies the schema to a local database
- [ ] Prisma client can be imported and used in an API route without error
- [ ] Client singleton does not create multiple instances during hot reload

**Test Cases:**

| # | Action | Expected Result |
|---|---|---|
| TC-002-01 | Run `pnpm prisma generate` | Prisma client generated, no errors |
| TC-002-02 | Run `pnpm prisma db push` | Schema pushed to DB, no errors |
| TC-002-03 | Import `prisma` from `src/lib/prisma.ts` in an API route and call `prisma.$queryRaw\`SELECT 1\`` | Returns `[{ ?column?: 1n }]` |
| TC-002-04 | Restart dev server with hot reload | Only one Prisma client instance exists (check for `globalThis.__prisma`) |

**Notes:**
- Singleton pattern: `const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }; export const prisma = globalForPrisma.prisma ?? new PrismaClient(); if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma`.
- Use `postgresql` provider in schema.prisma.
- Add `shadowDatabaseUrl` to `.env.example` for migration support.

---

### T-003 — Database Schema Migrations (Phase 1 Tables)

**Objective:** Define and migrate all database tables required for Phase 1 features.

**Inputs:** T-002 complete.

**Outputs:**
- `prisma/schema.prisma` updated with all Phase 1 models
- `prisma/migrations/` with timestamped migration files
- `prisma/seed.ts` seeding canonical equipment tags

**Schema (Phase 1 models):**

```prisma
model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  username  String   @unique
  email     String   @unique
  createdAt DateTime @default(now())
  recipes   Recipe[]
  saves     Save[]
}

model Recipe {
  id          String         @id @default(cuid())
  title       String
  cuisine     String?
  servings    Int            @default(2)
  totalTime   Int?           // minutes
  visibility  Visibility     @default(DRAFT)
  authorId    String
  author      User           @relation(fields: [authorId], references: [id])
  steps       RecipeStep[]
  equipment   RecipeEquipment[]
  revisions   Revision[]
  saves       Save[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model RecipeStep {
  id          String   @id @default(cuid())
  recipeId    String
  recipe      Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  order       Int
  action      String
  ingredients Json     @default("[]")  // [{name, quantity, unit}]
  durationMin Int?
  equipment   String[] // free text array
  reminder    String?
  notes       String?
  createdAt   DateTime @default(now())
}

model EquipmentTag {
  id       String            @id @default(cuid())
  name     String            @unique  // canonical name e.g. "wok"
  aliases  String[]          // e.g. ["carbon steel wok"]
  recipes  RecipeEquipment[]
}

model RecipeEquipment {
  recipeId      String
  equipmentTagId String
  recipe        Recipe       @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  tag           EquipmentTag @relation(fields: [equipmentTagId], references: [id])
  @@id([recipeId, equipmentTagId])
}

model Revision {
  id         String   @id @default(cuid())
  recipeId   String
  recipe     Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  snapshot   Json     // full recipe + steps at time of revision
  summary    String?
  createdAt  DateTime @default(now())
}

model Save {
  userId   String
  recipeId String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipe   Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  @@id([userId, recipeId])
}

enum Visibility {
  DRAFT
  PUBLISHED
}
```

**Acceptance Criteria:**
- [ ] `pnpm prisma migrate dev` runs without errors
- [ ] All 7 tables exist in the database after migration
- [ ] `pnpm prisma db seed` inserts canonical equipment tags
- [ ] Foreign key constraints are enforced (cascade deletes work)
- [ ] `Revision.snapshot` stores a complete JSON copy of recipe + steps

**Test Cases:**

| # | Action | Expected Result |
|---|---|---|
| TC-003-01 | Run `pnpm prisma migrate dev --name init` | Migration file created, DB tables created |
| TC-003-02 | Run `pnpm prisma db seed` | Equipment tags seeded (at minimum: wok, oven, blender, air fryer, stand mixer, grill, pressure cooker, cast iron pan, pot, frying pan, food processor, knife) |
| TC-003-03 | Insert a `Recipe`, then delete it | All related `RecipeStep`, `RecipeEquipment`, `Revision`, `Save` records cascade-deleted |
| TC-003-04 | Insert a `RecipeStep` with `order: 1`, then insert another with `order: 1` for the same recipe | Both records exist (order is not unique, reordering is handled in app logic) |
| TC-003-05 | Query `EquipmentTag` where `name = 'wok'` | Returns one record with at least one alias |

**Notes:**
- Equipment tag seed list: wok, oven, microwave, blender, air fryer, stand mixer, pressure cooker, grill, food processor, cast iron pan, frying pan, saucepan, pot, knife, cutting board, baking tray, mixing bowl, whisk, spatula, tongs.
- `Revision.snapshot` should be a full denormalized copy — do not reference step IDs in the snapshot, copy the full step objects.

---

### T-004 — Integrate Clerk Authentication

**Objective:** Add Clerk-based authentication so users can sign up, log in, and have their identity available in API routes and UI.

**Inputs:** T-001 complete. Clerk account and API keys available.

**Outputs:**
- Clerk middleware (`middleware.ts`) protecting authenticated routes
- `src/lib/auth.ts` — helper returning the current user's `clerkId` from API routes
- Sign-in and sign-up pages (can use Clerk's hosted UI or embedded `<SignIn />` component)
- User sync: on first sign-in, create a `User` record in the database linked to `clerkId`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` added to `.env.example`

**Acceptance Criteria:**
- [ ] Unauthenticated users accessing `/dashboard` are redirected to `/sign-in`
- [ ] After sign-in, users are redirected to `/dashboard`
- [ ] A `User` record is created in the DB on first sign-in (Clerk webhook or sign-in callback)
- [ ] `clerkId` in `User` table matches the Clerk user ID
- [ ] API routes return `401` when called without a valid session
- [ ] `src/lib/auth.ts` returns `null` for unauthenticated requests without throwing

**Test Cases:**

| # | Action | Expected Result |
|---|---|---|
| TC-004-01 | Visit `/dashboard` without being signed in | Redirected to `/sign-in` |
| TC-004-02 | Complete sign-up flow | User redirected to `/dashboard`, `User` record exists in DB |
| TC-004-03 | Call `GET /api/recipes` without `Authorization` header | Returns `{ error: 'Unauthorized' }` with status `401` |
| TC-004-04 | Call `GET /api/recipes` with valid Clerk session cookie | Returns `200` with user's recipes (empty array on new account) |
| TC-004-05 | Sign up twice with the same email | Clerk shows "email already in use" error; no duplicate `User` record in DB |
| TC-004-06 | Sign out | Session cleared, visiting `/dashboard` redirects to `/sign-in` |

**Notes:**
- Use `@clerk/nextjs` package.
- Protect routes using `clerkMiddleware()` in `middleware.ts`.
- For user sync, use a Clerk webhook (`user.created` event) in production; for local dev, sync on first authenticated API call.
- Store `clerkId` as the primary link — never store Clerk JWT tokens in the database.

---

### T-005 — Cloudflare R2 Storage Client

**Objective:** Set up an image upload utility using Cloudflare R2 so recipe images can be stored and served.

**Inputs:** T-001 complete. Cloudflare R2 bucket created.

**Outputs:**
- `src/lib/r2.ts` — R2 client using AWS SDK v3 (S3-compatible)
- `POST /api/upload` — presigned URL endpoint for client-side direct upload
- R2 environment variables added to `.env.example`

**Acceptance Criteria:**
- [ ] `POST /api/upload` returns a presigned URL valid for 5 minutes
- [ ] Client can PUT an image directly to R2 using the presigned URL
- [ ] Uploaded image is accessible via the R2 public URL
- [ ] Only authenticated users can request a presigned URL
- [ ] File size is limited to 5MB; larger files return a `413` error
- [ ] Only `image/jpeg`, `image/png`, `image/webp` MIME types are accepted

**Test Cases:**

| # | Action | Expected Result |
|---|---|---|
| TC-005-01 | `POST /api/upload` with valid auth and `{ filename: 'test.jpg', contentType: 'image/jpeg' }` | Returns `{ uploadUrl, publicUrl }` with 200 |
| TC-005-02 | PUT a 1MB JPEG to the returned `uploadUrl` | File appears in R2 bucket; `publicUrl` returns the image |
| TC-005-03 | `POST /api/upload` without auth | Returns `401` |
| TC-005-04 | `POST /api/upload` with `contentType: 'application/pdf'` | Returns `400` with `{ error: 'Invalid file type' }` |
| TC-005-05 | `POST /api/upload` requesting upload of 10MB file (`contentLength: 10485760`) | Returns `413` with `{ error: 'File too large' }` |

---

### T-006 — Recipe CRUD API Routes

**Objective:** Build the REST API for creating, reading, updating, and deleting recipes.

**Inputs:** T-003, T-004 complete.

**Outputs:**
- `GET /api/recipes` — list authenticated user's recipes
- `POST /api/recipes` — create a new recipe
- `GET /api/recipes/[id]` — get a single recipe (public if PUBLISHED, auth required if DRAFT)
- `PATCH /api/recipes/[id]` — update recipe metadata
- `DELETE /api/recipes/[id]` — soft-delete a recipe
- `GET /api/recipes/browse` — list PUBLISHED recipes (public, paginated, filterable)

**Acceptance Criteria:**
- [ ] All routes return correct HTTP status codes
- [ ] PATCH and DELETE require ownership (return `403` if recipe belongs to another user)
- [ ] Soft-delete sets `deletedAt` timestamp; record excluded from all queries after deletion
- [ ] `GET /api/recipes/browse` supports query params: `q` (search), `cuisine`, `maxTime`, `difficulty`, `equipment` (comma-separated tag IDs), `page`, `limit`
- [ ] All response bodies are typed and match the `Recipe` type definition
- [ ] Zod validation on all POST/PATCH bodies; invalid input returns `400` with field-level errors

**Test Cases:**

| # | Action | Expected Result |
|---|---|---|
| TC-006-01 | `POST /api/recipes` with valid body `{ title: 'Pasta', cuisine: 'Italian', servings: 2 }` | Returns `201` with created recipe including `id` |
| TC-006-02 | `GET /api/recipes` | Returns array of user's non-deleted recipes |
| TC-006-03 | `GET /api/recipes/[id]` for a PUBLISHED recipe without auth | Returns `200` with full recipe |
| TC-006-04 | `GET /api/recipes/[id]` for a DRAFT recipe without auth | Returns `404` |
| TC-006-05 | `PATCH /api/recipes/[id]` by non-owner | Returns `403` |
| TC-006-06 | `DELETE /api/recipes/[id]` then `GET /api/recipes/[id]` | Second request returns `404` |
| TC-006-07 | `POST /api/recipes` with missing `title` | Returns `400` with `{ errors: { title: 'Required' } }` |
| TC-006-08 | `GET /api/recipes/browse?cuisine=Italian&maxTime=30` | Returns only PUBLISHED Italian recipes with totalTime ≤ 30 |
| TC-006-09 | `GET /api/recipes/browse?equipment=wok-tag-id,oven-tag-id` | Returns only recipes tagged with both wok AND oven |

**Notes:**
- Add `deletedAt DateTime?` to the `Recipe` model in Prisma.
- Use Zod for request body validation. Define schemas in `src/lib/validators/recipe.ts`.
- Pagination: default `limit=20`, max `limit=100`. Return `{ data, total, page, limit }` envelope.

---

### T-007 — Recipe Step CRUD API Routes

**Objective:** Build the REST API for managing steps within a recipe.

**Inputs:** T-006 complete.

**Outputs:**
- `GET /api/recipes/[id]/steps` — list steps ordered by `order`
- `POST /api/recipes/[id]/steps` — add a step
- `PATCH /api/recipes/[id]/steps/[stepId]` — update a step
- `DELETE /api/recipes/[id]/steps/[stepId]` — delete a step
- `PUT /api/recipes/[id]/steps/reorder` — reorder all steps (accepts ordered array of step IDs)

**Acceptance Criteria:**
- [ ] Steps are always returned in `order` ascending
- [ ] Adding a step auto-assigns `order` as `max(existing orders) + 1`
- [ ] Reorder endpoint accepts `{ stepIds: string[] }` and updates all `order` values atomically
- [ ] Deleting a step does not leave gaps (re-normalise `order` values after deletion)
- [ ] All step mutations require recipe ownership

**Test Cases:**

| # | Action | Expected Result |
|---|---|---|
| TC-007-01 | `POST /api/recipes/[id]/steps` with `{ action: 'Chop', durationMin: 5 }` | Returns `201`, step has `order: 1` if first step |
| TC-007-02 | Add two more steps, then `GET /api/recipes/[id]/steps` | Returns 3 steps in order 1, 2, 3 |
| TC-007-03 | `PUT /api/recipes/[id]/steps/reorder` with `{ stepIds: [id3, id1, id2] }` | Steps reordered; GET returns them in new order |
| TC-007-04 | Delete step with `order: 2` out of 3 | Remaining steps have orders 1, 2 (gap closed) |
| TC-007-05 | `PATCH /api/recipes/[id]/steps/[stepId]` by non-owner | Returns `403` |

---

### T-008 — Equipment Tag API and Seed Data

**Objective:** Expose the canonical equipment tag list via API, and seed the database with the initial tag list.

**Inputs:** T-003 complete.

**Outputs:**
- `GET /api/equipment-tags` — returns full list of canonical tags (public, no auth)
- `GET /api/equipment-tags?q=wok` — search/filter tags by name or alias
- Seed script updated (already referenced in T-003)

**Acceptance Criteria:**
- [ ] `GET /api/equipment-tags` returns all seeded tags
- [ ] `GET /api/equipment-tags?q=wok` returns the wok tag (and any tag with alias matching "wok")
- [ ] Response is cached (Cache-Control: public, max-age=3600)
- [ ] Tag list is used in the step editor equipment picker (T-011)

**Test Cases:**

| # | Action | Expected Result |
|---|---|---|
| TC-008-01 | `GET /api/equipment-tags` | Returns array of ≥20 tag objects with `id`, `name`, `aliases` |
| TC-008-02 | `GET /api/equipment-tags?q=iron` | Returns cast iron pan tag |
| TC-008-03 | `GET /api/equipment-tags?q=carbon steel` | Returns wok tag (via alias match) |

---

### T-009 — Recipe Editor UI — Header Form

**Objective:** Build the recipe header form component where users set recipe metadata.

**Inputs:** T-006, T-004 complete. Design tokens from `CONVENTIONS.md`.

