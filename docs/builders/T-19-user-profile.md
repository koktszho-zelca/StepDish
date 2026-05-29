# T-19 · User Profile & Public Recipe Page

## Context
Each user gets a public profile page (`/u/[username]`) listing their published recipes. The profile shows a display name, avatar, bio, and a paginated recipe grid. Users can edit their own profile from the dashboard. A username must be unique and URL-safe.

---

## Scope

| Item | Detail |
|---|---|
| Public profile URL | `/u/[username]` |
| Profile fields | username, displayName, bio (max 200 chars), avatarUrl |
| Recipes shown | Published only; paginated (12 per page) |
| Edit profile | Dashboard settings page (`/dashboard/settings`) |
| Username uniqueness | Enforced at DB level + API validation |
| Avatar | Clerk avatar by default; user can upload custom |
| SEO | `generateMetadata` with OG tags for profile page |

---

## Files to Create / Modify

```
/src/app/u/[username]/page.tsx              ← NEW — public profile page
/src/app/dashboard/settings/page.tsx        ← NEW — profile edit form
/src/app/api/user/profile/route.ts          ← NEW — GET + PATCH profile
/src/app/api/user/username-check/route.ts   ← NEW — GET username availability
/src/components/profile/ProfileHeader.tsx   ← NEW — avatar + bio display
/src/components/profile/RecipeGrid.tsx      ← NEW — paginated recipe grid
/prisma/schema.prisma                       ← MODIFY — add UserProfile model
```

---

## Prisma Schema

```prisma
model UserProfile {
  id          String  @id @default(cuid())
  userId      String  @unique   // Clerk user ID
  username    String  @unique
  displayName String?
  bio         String? @db.VarChar(200)
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Username is separate from Clerk's user record so it can be changed independently and validated server-side.

---

## Username Rules

```ts
export const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

export function validateUsername(value: string): string | null {
  if (!USERNAME_REGEX.test(value)) {
    return 'Username must be 3–30 characters: lowercase letters, numbers, underscores only.';
  }
  const reserved = ['admin', 'api', 'dashboard', 'browse', 'login', 'signup', 'u', 'help'];
  if (reserved.includes(value)) return 'This username is reserved.';
  return null;
}
```

---

## API: `GET /api/user/username-check?username=`

```ts
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username') ?? '';
  const error = validateUsername(username);
  if (error) return NextResponse.json({ available: false, error });

  const existing = await prisma.userProfile.findUnique({ where: { username } });
  return NextResponse.json({ available: !existing });
}
```

Called client-side on debounced username input (300ms) to show live availability feedback.

---

## API: `PATCH /api/user/profile`

```ts
export async function PATCH(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await req.json();
  const { username, displayName, bio, avatarUrl } = body;

  if (username) {
    const error = validateUsername(username);
    if (error) return NextResponse.json({ error }, { status: 422 });
    const conflict = await prisma.userProfile.findFirst({
      where: { username, NOT: { userId } },
    });
    if (conflict) return NextResponse.json({ error: 'Username taken' }, { status: 409 });
  }

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, username, displayName, bio, avatarUrl },
    update: { username, displayName, bio, avatarUrl },
  });

  return NextResponse.json(profile);
}
```

---

## Public Profile Page: `/u/[username]/page.tsx`

```tsx
export default async function UserProfilePage({ params }: { params: { username: string } }) {
  const profile = await prisma.userProfile.findUnique({
    where: { username: params.username },
  });
  if (!profile) notFound();

  const recipes = await prisma.recipe.findMany({
    where: { authorId: profile.userId, status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 12,
    include: { steps: { include: { ingredients: true } } },
  });

  return (
    <main>
      <ProfileHeader profile={profile} recipeCount={recipes.length} />
      <RecipeGrid recipes={recipes} />
    </main>
  );
}
```

---

## Component: `ProfileHeader.tsx`

- Avatar (80px circle) — Clerk avatar fallback → initials fallback
- Display name (bold, `--text-xl`)
- `@username` (muted, `--text-sm`)
- Bio paragraph (max 200 chars)
- Recipe count badge: "N published recipes"
- Edit button (only shown when viewing own profile)

---

## Dashboard Settings: `/dashboard/settings`

Form fields:
- **Username** — text input, live availability check, 3–30 chars
- **Display name** — text input, max 60 chars
- **Bio** — textarea, max 200 chars, character counter
- **Avatar** — file upload (JPEG/PNG < 2MB) or clear to use Clerk default

Save button disabled until there are unsaved changes. Success toast on save. Error messages inline per field.

---

## SEO

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await prisma.userProfile.findUnique({
    where: { username: params.username },
  });
  if (!profile) return { title: 'User not found' };
  return {
    title: `${profile.displayName ?? profile.username} · StepDish`,
    description: profile.bio ?? `Recipes by ${profile.username} on StepDish`,
    openGraph: {
      title: profile.displayName ?? profile.username,
      images: profile.avatarUrl ? [{ url: profile.avatarUrl }] : [],
    },
  };
}
```

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-19-01 | Visit `/u/validuser` | Profile page renders |
| TC-19-02 | Visit `/u/unknownuser` | 404 page shown |
| TC-19-03 | Check available username | Returns `{ available: true }` |
| TC-19-04 | Check taken username | Returns `{ available: false }` |
| TC-19-05 | Reserved username "admin" | Returns error message |
| TC-19-06 | Update profile | Changes persisted, profile page reflects update |
| TC-19-07 | Username with uppercase | Rejected by regex |
| TC-19-08 | Own profile page | Edit button shown |
| TC-19-09 | Other user's profile | Edit button hidden |
| TC-19-10 | Profile OG tags | `og:title` + `og:image` present |
| TC-19-11 | User with no recipes | Empty state shown on profile |
| TC-19-12 | Bio at 200 chars | Saved; 201 chars rejected |
