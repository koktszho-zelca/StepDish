# T-01 — Project Setup & Repo Structure

> **Phase:** 1 | **Depends on:** — | **Parallelisable:** No — must be completed first

---

## Objective

Initialise the StepDish monorepo with the correct Next.js project structure, tooling configuration, environment variable scaffolding, and base design token stylesheet. Every subsequent task builds on this foundation.

---

## Acceptance Criteria

- [ ] Next.js 14+ project initialised with App Router, TypeScript, and Tailwind CSS v4
- [ ] ESLint configured with `eslint-config-next` and `@typescript-eslint`
- [ ] Prettier configured with a `.prettierrc` file
- [ ] Husky pre-commit hook runs `eslint` and `tsc --noEmit` before every commit
- [ ] `.env.example` exists with all required keys listed (no real values)
- [ ] `styles/tokens.css` exists with the full Nexus design token set (colours, spacing, type scale, radius, shadows)
- [ ] `README.md` at repo root explains the project, local setup steps, and environment variables
- [ ] `prisma/schema.prisma` exists (empty schema, correct datasource block pointing to `DATABASE_URL`)
- [ ] `next.config.ts` configured with image domains and any required headers
- [ ] `app/layout.tsx` includes the base HTML structure, font loading, and token stylesheet import
- [ ] Project runs locally with `npm run dev` and shows a placeholder homepage
- [ ] `npm run build` completes without errors
- [ ] `npm run lint` returns zero errors

---

## Step-by-Step Instructions

### 1. Initialise the project
```bash
npx create-next-app@latest stepdish \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
cd stepdish
```

### 2. Install core dependencies
```bash
npm install prisma @prisma/client
npm install @clerk/nextjs
npm install openai
npm install zod
npm install date-fns
npm install -D husky lint-staged prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
npx prisma init
npx husky init
```

### 3. Configure Husky pre-commit hook
Create `.husky/pre-commit`:
```bash
#!/bin/sh
npx lint-staged
```

Add to `package.json`:
```json
"lint-staged": {
  "**/*.{ts,tsx}": [
    "eslint --fix",
    "tsc --noEmit"
  ],
  "**/*.{ts,tsx,json,css,md}": "prettier --write"
}
```

### 4. Create `.env.example`
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/stepdish"

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# OpenAI
OPENAI_API_KEY=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Create `styles/tokens.css`
This file must contain all CSS custom properties from the Nexus Design System:
- `--color-*` (bg, surface, text, primary, error, success, warning — light and dark)
- `--space-1` through `--space-32`
- `--text-xs` through `--text-hero` (fluid `clamp()` values)
- `--radius-sm` through `--radius-full`
- `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- `--font-body`, `--font-display`
- `--transition-interactive`

Import in `app/layout.tsx`:
```tsx
import '@/styles/tokens.css'
```

### 6. Create placeholder homepage
`app/page.tsx` should render:
```tsx
export default function Home() {
  return (
    <main>
      <h1>StepDish</h1>
      <p>Coming soon.</p>
    </main>
  )
}
```

---

## Expected Outcome

A clean, runnable Next.js project at `http://localhost:3000` showing the placeholder page. All tooling (lint, type-check, format) runs without errors. The `.env.example` is the only credentials-related file committed — never `.env`.

---

## Test Cases

| ID | Test | Expected Result | How to verify |
|---|---|---|---|
| TC-01-01 | Run `npm run dev` | Server starts on port 3000, no errors | Terminal output |
| TC-01-02 | Run `npm run build` | Build succeeds, no TypeScript errors | Terminal output |
| TC-01-03 | Run `npm run lint` | Zero ESLint errors or warnings | Terminal output |
| TC-01-04 | Run `tsc --noEmit` | Zero TypeScript errors | Terminal output |
| TC-01-05 | Check `.env` is gitignored | `.env` does not appear in `git status` | `git status` |
| TC-01-06 | Check `styles/tokens.css` loaded | CSS variables resolve in browser DevTools | Inspect `--color-primary` on `<html>` |
| TC-01-07 | Attempt a commit with a lint error | Husky blocks the commit | Introduce a deliberate lint error and try `git commit` |
| TC-01-08 | `prisma/schema.prisma` has correct datasource | `datasource db { provider = "postgresql" }` present | Open file |

---

## Notes

- Never commit `.env` — only `.env.example` with placeholder values.
- Keep `app/layout.tsx` minimal at this stage — only HTML shell, font imports, and token stylesheet.
- The `prisma/schema.prisma` at this stage should only have the datasource and generator block — no models yet (those are added in T-03).
