# T-17 · SEO & Recipe JSON-LD Structured Data

## Context
Public recipe pages should be discoverable via search engines and eligible for Google's Recipe rich results. This requires JSON-LD structured data (`Recipe` schema type) injected into the `<head>` of each public recipe page, alongside standard Next.js metadata. This ticket also covers `sitemap.xml` and `robots.txt` generation.

---

## Scope

| Item | Detail |
|---|---|
| JSON-LD | `Recipe` schema on each public recipe detail page |
| Meta tags | `title`, `description`, `og:image`, `og:title`, `twitter:card` |
| Sitemap | Auto-generated `/sitemap.xml` from all published recipes |
| Robots | `/robots.txt` — allow all, point to sitemap |
| Canonical | `<link rel="canonical">` on all public pages |
| Noindex | Draft/private recipes served with `noindex, nofollow` |

---

## Files to Create / Modify

```
/src/app/recipes/[slug]/page.tsx        ← MODIFY — add generateMetadata + JSON-LD
/src/lib/jsonld.ts                      ← NEW — Recipe JSON-LD builder
/src/app/sitemap.ts                     ← NEW — dynamic sitemap generation
/src/app/robots.ts                      ← NEW — robots.txt
/src/lib/meta.ts                        ← NEW — shared metadata helpers
```

---

## JSON-LD Builder: `jsonld.ts`

```ts
import { Recipe } from '@prisma/client';

export function buildRecipeJsonLd(recipe: RecipeWithSteps) {
  const ingredients = recipe.steps
    .flatMap(s => s.ingredients)
    .map(i => `${i.quantity ?? ''} ${i.unit ?? ''} ${i.name}`.trim());

  const instructions = recipe.steps.map((step, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    text: step.action,
    ...(step.durationSeconds ? {
      timeRequired: `PT${Math.round(step.durationSeconds / 60)}M`,
    } : {}),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description ?? '',
    recipeYield: recipe.servings ? `${recipe.servings} servings` : undefined,
    totalTime: recipe.totalTimeSeconds
      ? `PT${Math.round(recipe.totalTimeSeconds / 60)}M`
      : undefined,
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
    author: {
      '@type': 'Person',
      name: recipe.author.name,
    },
    datePublished: recipe.publishedAt?.toISOString(),
    image: recipe.coverImageUrl ?? undefined,
    recipeCategory: recipe.cuisine ?? undefined,
    keywords: recipe.dietaryTags.map(t => t.toLowerCase().replace('_', '-')).join(', '),
  };
}
```

---

## Page Metadata: `generateMetadata`

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await getPublicRecipe(params.slug);
  if (!recipe) return { title: 'Recipe not found' };

  return {
    title: `${recipe.title} | StepDish`,
    description: recipe.description ?? `${recipe.steps.length} steps · ${recipe.cuisine ?? 'Recipe'} on StepDish`,
    openGraph: {
      title: recipe.title,
      description: recipe.description ?? '',
      images: recipe.coverImageUrl ? [{ url: recipe.coverImageUrl }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: recipe.title,
      description: recipe.description ?? '',
      images: recipe.coverImageUrl ? [recipe.coverImageUrl] : [],
    },
    robots: recipe.status === 'published'
      ? { index: true, follow: true }
      : { index: false, follow: false },
    alternates: {
      canonical: `https://stepdish.app/recipes/${recipe.slug}`,
    },
  };
}
```

---

## JSON-LD Injection in Page Component

```tsx
export default async function RecipePage({ params }: Props) {
  const recipe = await getPublicRecipe(params.slug);
  const jsonLd = buildRecipeJsonLd(recipe);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* rest of page */}
    </>
  );
}
```

---

## Sitemap: `sitemap.ts`

```ts
import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const recipes = await prisma.recipe.findMany({
    where: { status: 'published' },
    select: { slug: true, updatedAt: true },
  });

  const recipeUrls = recipes.map(r => ({
    url: `https://stepdish.app/recipes/${r.slug}`,
    lastModified: r.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    { url: 'https://stepdish.app', lastModified: new Date(), priority: 1.0 },
    { url: 'https://stepdish.app/browse', lastModified: new Date(), priority: 0.9 },
    ...recipeUrls,
  ];
}
```

---

## Robots: `robots.ts`

```ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/api/'] },
    sitemap: 'https://stepdish.app/sitemap.xml',
  };
}
```

---

## Recipe Slug

Recipes need a unique `slug` field for clean URLs. Generate from title on first publish:

```ts
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// On publish: slug = generateSlug(title) + '-' + cuid().slice(0, 6)
// e.g. "soy-glazed-salmon-x4f9k2"
```

Add `slug String @unique` to `Recipe` model in Prisma schema.

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-17-01 | Published recipe page | `<script type="application/ld+json">` present in DOM |
| TC-17-02 | JSON-LD validated via Google Rich Results Test | No errors, Recipe type recognised |
| TC-17-03 | Draft recipe page | `noindex, nofollow` in meta robots |
| TC-17-04 | `/sitemap.xml` request | Returns all published recipe URLs |
| TC-17-05 | `/robots.txt` request | Disallows `/dashboard` and `/api/` |
| TC-17-06 | Recipe with no cover image | JSON-LD `image` field omitted |
| TC-17-07 | Recipe with dietary tags | Tags appear as `keywords` in JSON-LD |
| TC-17-08 | Recipe slug | Unique, URL-safe, max 80 chars |
| TC-17-09 | OG image tag | Present and resolves to valid image URL |
| TC-17-10 | Recipe with no description | Meta description falls back to step count + cuisine |
