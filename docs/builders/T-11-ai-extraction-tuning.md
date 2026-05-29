# T-11 · AI Extraction Tuning & Fallback Pipeline

> **Batch:** 3 · **Phase:** 2 — Import & Browse · **Depends on:** T-10

---

## Context

T-10 introduced the basic AI extraction pipeline: paste a URL or raw text, get a structured recipe back. T-11 hardens that pipeline into a production-quality system.

The core problem with single-pass extraction is reliability. GPT-4o returns high-quality results most of the time, but recipe articles vary enormously — some have numbered steps, others are pure prose, some mix cooking instructions with food history. A single rigid prompt fails on edge cases.

T-11 adds:
- **Multi-pass fallback** — if the first extraction scores low confidence, a second focused prompt runs automatically
- **Duration inference** — vague phrases like "until golden" or "about half an hour" are converted to seconds via pattern matching
- **Ingredient normalisation** — raw strings like "2 cloves garlic" are parsed into structured `{qty, unit, name}` objects
- **Equipment inference** — missing equipment is inferred from action verbs ("stir-fry" → wok, "bake" → oven)
- **Prompt versioning** — every extraction records which prompt version was used, enabling regression testing and rollbacks

---

## Scope

| Item | Detail |
|---|---|
| Multi-pass extraction | Retry with a refined prompt if confidence < 0.5 |
| Duration inference | Pattern matching on 8+ time phrase shapes → seconds |
| Ingredient normalisation | Canonical unit + name from raw ingredient strings |
| Equipment inference | Keyword map: action verb → equipment name |
| Prompt versioning | `promptVersion` stored on extraction result and version snapshot |
| Confidence threshold | 0.5 for first pass; warn in logs if second pass also < 0.5 |

---

## Files to Create / Modify

```
/src/lib/ai/extractRecipe.ts         ← MODIFY — add multi-pass logic + post-processing
/src/lib/ai/normaliseIngredient.ts   ← NEW    — ingredient string parser
/src/lib/ai/inferDuration.ts         ← NEW    — duration from natural language
/src/lib/ai/inferEquipment.ts        ← NEW    — equipment from action keywords
/src/lib/ai/prompts.ts               ← NEW    — versioned prompt strings
/src/lib/ai/extractSchema.ts         ← MODIFY — add promptVersion, confidence fields
/src/lib/ai/__tests__/              ← NEW    — unit test files for each helper
```

---

## Behaviour Spec

### Extraction Pipeline (full flow)

```
User submits text
       │
       ▼
┌─────────────────────────┐
│  Pass 1: runExtraction  │  prompt: PROMPTS.v2
│  → RecipeExtraction     │  structured output via JSON mode
└────────────┬────────────┘
             │
     confidence < 0.5?
       │           │
      YES          NO
       │           │
       ▼           ▼
┌────────────┐   Post-process
│ Pass 2:    │   (duration, ingredient,
│ v2_focused │    equipment inference)
│ prompt     │         │
└─────┬──────┘         ▼
      │         Return result
  Pick higher
  confidence
       │
       ▼
  Post-process
       │
       ▼
  Return result
  (with promptVersion)
```

### Post-Processing (always applied)

For every extracted step:
1. If `durationSeconds` is null → run `inferDuration(step.action)`
2. If `equipment` is empty array → run `inferEquipment(step.action)`
3. For every ingredient string → run `normaliseIngredient(raw)`

### Confidence Scoring

Confidence is calculated inside `runExtraction` based on:
- Ratio of steps with a non-null `durationSeconds`
- Whether a title was found
- Whether at least one ingredient was found
- Step count > 2

```ts
function scoreConfidence(result: RawExtraction): number {
  let score = 0;
  if (result.title) score += 0.25;
  if (result.steps.length > 2) score += 0.25;
  if (result.ingredients?.length > 0) score += 0.25;
  const withDuration = result.steps.filter(s => s.durationSeconds).length;
  score += (withDuration / Math.max(result.steps.length, 1)) * 0.25;
  return score;
}
```

---

## Implementation Details

### `inferDuration.ts`

```ts
const DURATION_PATTERNS: [RegExp, (m: RegExpMatchArray) => number][] = [
  [/(\d+)\s*-\s*(\d+)\s*min/i,          m => ((+m[1] + +m[2]) / 2) * 60],  // range → mean
  [/(\d+)\s*min(?:ute)?s?/i,             m => +m[1] * 60],
  [/(\d+)\s*hour?s?/i,                   m => +m[1] * 3600],
  [/half\s+an?\s+hour/i,                 () => 1800],
  [/quarter\s+(?:of\s+an?\s+)?hour/i,    () => 900],
  [/overnight/i,                         () => 28800],  // 8 hours
  [/(\d+)\s*sec(?:ond)?s?/i,             m => +m[1]],
  [/a\s+(?:few|couple of)\s+minutes?/i,  () => 180],
];

export function inferDuration(text: string): number | null {
  for (const [pattern, calc] of DURATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) return Math.round(calc(match));
  }
  return null;
}
```

### `normaliseIngredient.ts`

```ts
const UNIT_MAP: Record<string, string> = {
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp',  teaspoon: 'tsp',    teaspoons: 'tsp',
  cup: 'cup',  cups: 'cup',
  g: 'g',      gram: 'g',    grams: 'g',
  kg: 'kg',    kilogram: 'kg',
  ml: 'ml',    milliliter: 'ml', millilitre: 'ml',
  l: 'l',      liter: 'l',   litre: 'l',
  oz: 'oz',    ounce: 'oz',  ounces: 'oz',
  lb: 'lb',    pound: 'lb',  pounds: 'lb',
  clove: 'clove', cloves: 'clove',
  slice: 'slice', slices: 'slice',
  piece: 'piece', pieces: 'piece',
  pinch: 'pinch', handful: 'handful',
};

export function normaliseIngredient(raw: string) {
  const match = raw.match(/^([\d./½¼¾⅓⅔]+)?\s*([a-z]+)?\s+(.+)$/i);
  if (!match) return { qty: null, unit: null, name: raw.trim().toLowerCase() };
  const [, qty, unit, name] = match;
  return {
    qty: qty ? parseFloat(qty) : null,
    unit: unit ? (UNIT_MAP[unit.toLowerCase()] ?? unit.toLowerCase()) : null,
    name: name.trim().toLowerCase(),
  };
}
```

### `inferEquipment.ts`

```ts
const EQUIPMENT_KEYWORDS: Record<string, string[]> = {
  'frying pan':     ['fry', 'sauté', 'saute', 'sear', 'pan-fry', 'pan fry'],
  'saucepan':       ['simmer', 'boil', 'blanch', 'poach', 'reduce'],
  'oven':           ['bake', 'roast', 'broil', 'grill', 'preheat'],
  'wok':            ['stir-fry', 'stir fry', 'wok'],
  'blender':        ['blend', 'purée', 'puree', 'blitz', 'liquidise'],
  'food processor': ['pulse', 'process', 'chop finely'],
  'mixing bowl':    ['mix', 'combine', 'whisk', 'fold', 'toss'],
  'cutting board':  ['chop', 'dice', 'mince', 'slice', 'julienne', 'roughly chop'],
  'colander':       ['drain', 'rinse', 'strain'],
  'peeler':         ['peel'],
  'grater':         ['grate', 'zest'],
  'mortar and pestle': ['pound', 'grind', 'crush'],
};

export function inferEquipment(actionText: string): string[] {
  const lower = actionText.toLowerCase();
  return Object.entries(EQUIPMENT_KEYWORDS)
    .filter(([, keywords]) => keywords.some(k => lower.includes(k)))
    .map(([equipment]) => equipment);
}
```

### `prompts.ts`

```ts
export const PROMPTS = {
  v2: `You are a recipe extraction assistant. Extract a structured recipe from the text below.
Return JSON with: title (string), servings (number|null), steps (array of {action, durationSeconds, ingredients[], equipment[], reminder, notes}), confidence (0-1).
If duration is unclear, set durationSeconds to null. Only return what the text explicitly supports.`,

  v2_focused: `You are a recipe extraction assistant. A previous extraction attempt had low confidence.
This time focus especially on:
1. Identifying ALL steps even if the text is prose-style (not numbered)
2. Extracting exact or approximate durations for every step
3. Listing all ingredients with quantities
Return the same JSON schema. Be thorough — it is better to extract too many steps than too few.`,
};

export type PromptVersion = keyof typeof PROMPTS;
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| OpenAI returns invalid JSON | Catch parse error, return `{ confidence: 0, steps: [], title: null }` |
| Both passes score < 0.5 | Return first pass result; add `lowConfidence: true` flag to response |
| Duration pattern has no match | Return `null` — do not guess |
| Ingredient string is too short (< 2 chars) | Return `{ qty: null, unit: null, name: raw }` |
| Timeout from OpenAI (> 30s) | Throw `ExtractionTimeoutError`; surface to user as "Import is taking longer than expected" |

---

## Dependencies

- T-10 · Import Flow (prerequisite — base extraction must be working)
- T-03 · Database Schema (`Ingredient`, `Step`, `Equipment` models)
- OpenAI SDK (`openai` npm package, version ≥ 4.x)
- No new npm packages required for duration/equipment inference (pure regex)

---

## Definition of Done

- [ ] `inferDuration` returns correct seconds for all 8 pattern shapes
- [ ] `normaliseIngredient` handles fractions (½, ¼), spelled-out units, and no-unit cases
- [ ] `inferEquipment` returns empty array (not error) when no match found
- [ ] Multi-pass triggers automatically when confidence < 0.5
- [ ] `promptVersion` stored on every extraction result
- [ ] `lowConfidence: true` flag set when both passes score < 0.5
- [ ] Unit tests written for all three helper functions
- [ ] No regression on T-10 happy-path import flow

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-11-01 | "cook for 20 minutes" | `durationSeconds: 1200` |
| TC-11-02 | "simmer for half an hour" | `durationSeconds: 1800` |
| TC-11-03 | "bake until golden" | `durationSeconds: null` — no error |
| TC-11-04 | "10-15 min" | `durationSeconds: 750` (mean) |
| TC-11-05 | "a couple of minutes" | `durationSeconds: 180` |
| TC-11-06 | Ingredient "2 tbsp olive oil" | `{qty:2, unit:'tbsp', name:'olive oil'}` |
| TC-11-07 | Ingredient "a handful of basil" | `{qty:null, unit:'handful', name:'basil'}` |
| TC-11-08 | Ingredient "salt" (no qty/unit) | `{qty:null, unit:null, name:'salt'}` |
| TC-11-09 | Step "stir-fry the vegetables" | equipment includes `'wok'` |
| TC-11-10 | Step "grate the cheese" | equipment includes `'grater'` |
| TC-11-11 | Step has explicit equipment | `inferEquipment` not called (existing value kept) |
| TC-11-12 | Low-confidence first pass | Second pass runs; higher confidence result returned |
| TC-11-13 | Both passes low confidence | First pass returned with `lowConfidence: true` |
| TC-11-14 | `promptVersion` in result | Equals `'v2'` or `'v2_focused'` |
| TC-11-15 | OpenAI returns malformed JSON | Caught; empty extraction returned gracefully |
