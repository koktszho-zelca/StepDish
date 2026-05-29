# T-02 — Authentication (Sign Up / Log In)

> **Phase:** 1 | **Depends on:** T-01 | **Parallelisable:** No — auth must exist before any protected routes

---

## Objective

Implement full user authentication using Clerk. Users must be able to sign up and log in with email/password or Google/Apple OAuth. Protected routes redirect unauthenticated users to the login page. The auth session is accessible server-side and client-side throughout the app.

---

## Acceptance Criteria

- [ ] Clerk is installed and configured with publishable and secret keys from `.env`
- [ ] `app/(auth)/sign-in/page.tsx` renders the Clerk `<SignIn />` component
- [ ] `app/(auth)/sign-up/page.tsx` renders the Clerk `<SignUp />` component
- [ ] Middleware (`middleware.ts`) protects all `/dashboard/*` routes — unauthenticated users are redirected to `/sign-in`
- [ ] Public routes (home, browse, recipe detail) are accessible without login
- [ ] After sign-up, user is redirected to `/dashboard`
- [ ] After sign-in, user is redirected to `/dashboard`
- [ ] After sign-out, user is redirected to `/`
- [ ] `currentUser()` and `auth()` from Clerk are usable in Server Components
- [ ] A `UserButton` component is shown in the navigation header when logged in
- [ ] Display name from Clerk profile is shown in the header
- [ ] A Prisma `User` record is created/upserted on first sign-in via a Clerk webhook

---

## Step-by-Step Instructions

### 1. Configure Clerk provider
Wrap `app/layout.tsx` with `<ClerkProvider>`:
```tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

### 2. Create auth pages
```tsx
// app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'
export default function SignInPage() {
  return <SignIn />
}
```
```tsx
// app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'
export default function SignUpPage() {
  return <SignUp />
}
```

### 3. Create middleware
```ts
// middleware.ts (repo root)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/api/recipes(.*)', '/api/steps(.*)', '/api/import(.*)'])

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/'],
}
```

### 4. Clerk webhook — sync user to database
Create `app/api/webhooks/clerk/route.ts`:
- Listen for `user.created` and `user.updated` events
- Upsert a `User` record in PostgreSQL via Prisma with `clerkId`, `email`, `displayName`
- Verify the webhook signature using `svix`

```ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/client'

export async function POST(req: Request) {
  const body = await req.text()
  const headerPayload = headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')
  
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  let event: WebhookEvent
  
  try {
    event = wh.verify(body, {
      'svix-id': svixId!,
      'svix-timestamp': svixTimestamp!,
      'svix-signature': svixSignature!,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = event.data
    await prisma.user.upsert({
      where: { clerkId: id },
      update: { email: email_addresses[0].email_address, displayName: `${first_name} ${last_name}`.trim() },
      create: { clerkId: id, email: email_addresses[0].email_address, displayName: `${first_name} ${last_name}`.trim() },
    })
  }

  return new Response('OK', { status: 200 })
}
```

### 5. Add navigation header
Create `components/ui/Header.tsx` with:
- StepDish logo/wordmark on the left
- `<UserButton />` on the right when signed in
- Sign In / Sign Up links when signed out
- Use `<SignedIn>` and `<SignedOut>` from Clerk for conditional rendering

---

## Expected Outcome

A user can visit `/sign-up`, create an account, and be redirected to `/dashboard`. Visiting `/dashboard` without being logged in redirects to `/sign-in`. A `User` row is created in the database after sign-up. The header shows the user's avatar and name when signed in.

---

## Test Cases

| ID | Test | Expected Result | How to verify |
|---|---|---|---|
| TC-02-01 | Visit `/sign-up` without auth | Sign Up page renders | Browser |
| TC-02-02 | Visit `/sign-in` without auth | Sign In page renders | Browser |
| TC-02-03 | Visit `/dashboard` without auth | Redirect to `/sign-in` | Browser |
| TC-02-04 | Sign up with valid email + password | Redirected to `/dashboard`, `User` row in DB | Browser + DB query |
| TC-02-05 | Sign up with duplicate email | Clerk shows "email already in use" error | Browser |
| TC-02-06 | Sign in with correct credentials | Redirected to `/dashboard` | Browser |
| TC-02-07 | Sign in with wrong password | Clerk shows error message | Browser |
| TC-02-08 | Sign out | Redirected to `/`, session cleared | Browser |
| TC-02-09 | Header shows `UserButton` when signed in | Avatar and name visible | Browser |
| TC-02-10 | Header shows Sign In link when signed out | Link visible, `UserButton` hidden | Browser |
| TC-02-11 | Clerk webhook creates DB user | `User` row exists with correct `clerkId` and `email` | DB query: `SELECT * FROM users WHERE clerk_id = '...'` |
| TC-02-12 | API route `/api/recipes` returns 401 when unauthenticated | HTTP 401 response | `curl` or Postman |

---

## Notes

- Add `CLERK_WEBHOOK_SECRET` to `.env.example`.
- The Clerk dashboard must have the webhook endpoint configured pointing to `{APP_URL}/api/webhooks/clerk`.
- Never use `userId` from Clerk directly in database relations — always resolve to the internal `User.id` (UUID) first.
