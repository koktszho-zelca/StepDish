# T-10 · Import Flow

## Context
Users can import a recipe from a URL (a cooking article or recipe page) or by pasting raw text. The AI extraction pipeline parses the content into a structured recipe draft that the user can then review and edit before saving.

---

## Scope

| Item | Detail |
|---|---|
| Input methods | URL import, paste-text import |
| AI extraction | OpenAI function calling — extracts title, ingredients, steps, timings |
| Output | Draft recipe pre-loaded in the editor (not auto-saved) |
| Rate limit | 5 imports per user per day (Redis counter) |
| Error handling | Graceful partial extraction — show what was found, flag gaps |

---

## Files to Create / Modify

```
/src/app/dashboard/recipes/import/page.tsx  ← NEW — import page
/src/app/api/import/url/route.ts            ← NEW — POST URL import
/src/app/api/import/text/route.ts           ← NEW — POST text import
/src/lib/ai/extractRecipe.ts                ← NEW — AI extraction function
/src/lib/ai/extractSchema.ts                ← NEW — Zod schema for extraction output
/src/components/import/ImportForm.tsx       ← NEW — URL / text tabs
/src/components/import/ImportPreview.tsx    ← NEW — editable preview before save
```

---

## Extraction Schema: `extractSchema.ts`

```ts
import { z } from 'zod';

export const IngredientSchema = z.object({
  name: z.string(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
});

export const StepSchema = z.object({
  order: z.number(),
  action: z.string(),
  durationSeconds: z.number().optional(),
  reminder: z.string().optional(),
  ingredients: z.array(IngredientSchema).optional(),
  equipment: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const RecipeExtractionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  cuisine: z.string().optional(),
  servings: z.number().optional(),
  prepMinutes: z.number().optional(),
  cookMinutes: z.number().optional(),
  steps: z.array(StepSchema),
  tags: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
});

export type RecipeExtraction = z.infer<typeof RecipeExtractionSchema>;
```

---

## AI Extractor: `extractRecipe.ts`

```ts
import OpenAI from 'openai';
import { RecipeExtractionSchema, RecipeExtraction } from './extractSchema';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are a recipe extraction assistant. Given raw text from a cooking article or recipe page,
extract a structured recipe. Be precise about durations (convert "30 minutes" to 1800 seconds).
Assign each step a confidence score. If text is ambiguous or incomplete, still extract what you can
and set a lower overall confidence. Never invent information not present in the source.
`;

export async function extractRecipe(text: string): Promise<RecipeExtraction> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Extract the recipe from the following text:\n\n${text.slice(0, 12000)}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const raw = JSON.parse(response.choices[0].message.content ?? '{}');
  return RecipeExtractionSchema.parse(raw);
}
```

---

## API Route: `POST /api/import/url`

```ts
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = `import:${userId}:${new Date().toISOString().slice(0, 10)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 86400);
  if (count > 5) return NextResponse.json({ error: 'Daily import limit reached' }, { status: 429 });

  const { url } = await req.json();

  const html = await fetch(url, { headers: { 'User-Agent': 'StepDishBot/1.0' } }).then(r => r.text());
  const text = stripHtml(html);

  const extraction = await extractRecipe(text);
  return NextResponse.json(extraction);
}
```

`stripHtml` is a utility that removes HTML tags, scripts, and nav/footer boilerplate, leaving only main content text.

---

## API Route: `POST /api/import/text`

Same as URL route but skips the fetch step — accepts `{ text: string }` directly in body. Same rate limit applies.

---

## Component: `ImportForm.tsx`

Two tabs: **From URL** and **Paste Text**

- **URL tab:** single URL input + Import button. Show loading spinner while fetching and extracting.
- **Text tab:** large textarea (min 8 rows) + Import button.
- Validation: URL must be a valid http/https URL. Text must be > 100 chars.
- On success: pass extraction result to `ImportPreview`.
- On error: show inline error message (rate limit, extraction failure, invalid URL).

---

## Component: `ImportPreview.tsx`

Shown after successful extraction:

- Confidence badge at top: ≥ 0.8 = green "High confidence", 0.5–0.79 = amber "Review recommended", < 0.5 = red "Low confidence — please review all fields"
- Editable fields: title, cuisine, servings, prepMinutes, cookMinutes, tags
- Read-only step list with inline edit buttons per step (opens step drawer from T-05)
- Ingredient list per step, editable inline
- **Save as Draft** button → creates recipe in DB with `publishedAt = null`
- **Discard** button → clears form, returns to ImportForm

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-10-01 | Import valid recipe URL | Steps and ingredients extracted |
| TC-10-02 | Import text with timings | durationSeconds correctly set |
| TC-10-03 | Import ambiguous/partial text | Partial extraction, low confidence shown |
| TC-10-04 | Import 6th time in one day | 429 rate limit error |
| TC-10-05 | Invalid URL format | Validation error before API call |
| TC-10-06 | Text < 100 chars | Validation error, no API call |
| TC-10-07 | Save draft after import | Recipe created, not published |
| TC-10-08 | Edit step in preview | Step drawer opens, changes reflected |
| TC-10-09 | Discard after import | Form clears, no recipe saved |
| TC-10-10 | URL returns 404 | Friendly error shown to user |
| TC-10-11 | OpenAI API error | Friendly error, import fails gracefully |
| TC-10-12 | Unauthenticated import attempt | 401 returned |
