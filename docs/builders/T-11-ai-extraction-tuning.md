# T-11 · AI Extraction Tuning & Fallback Pipeline

## Context
T-10 introduced the basic extraction pipeline. T-11 hardens it: structured output validation, multi-pass fallback for low-confidence extractions, ingredient normalisation, and duration inference from natural language phrases like "until golden" or "about half an hour".

---

## Scope

| Item | Detail |
|---|---|
| Multi-pass extraction | Retry with a refined prompt if confidence < 0.5 |
| Duration inference | NLP patterns for vague time phrases → seconds |
| Ingredient normalisation | Canonical unit + name (e.g. "2 cloves garlic" → `{qty:2, unit:"clove", name:"garlic"}`) |
| Equipment inference | Detect equipment from step text if not explicitly listed |
| Prompt versioning | Store `promptVersion` on each extraction for reproducibility |

---

## Files to Create / Modify

```
/src/lib/ai/extractRecipe.ts         ← MODIFY — add multi-pass logic
/src/lib/ai/normaliseIngredient.ts   ← NEW — ingredient parsing
/src/lib/ai/inferDuration.ts         ← NEW — duration from text
/src/lib/ai/inferEquipment.ts        ← NEW — equipment detection
/src/lib/ai/prompts.ts               ← NEW — versioned prompt strings
/src/lib/ai/extractSchema.ts         ← MODIFY — add promptVersion field
```

---

## Duration Inference: `inferDuration.ts`

Maps common natural-language time phrases to seconds. Called when `durationSeconds` is missing from a step but the action text contains time hints.

```ts
const DURATION_PATTERNS: [RegExp, (m: RegExpMatchArray) => number][] = [
  [/(\d+)\s*-\s*(\d+)\s*min/i,     m => ((+m[1] + +m[2]) / 2) * 60],
  [/(\d+)\s*min(?:ute)?s?/i,        m => +m[1] * 60],
  [/(\d+)\s*hour?s?/i,              m => +m[1] * 3600],
  [/half\s+an?\s+hour/i,            () => 1800],
  [/quarter\s+(?:of\s+an?\s+)?hour/i, () => 900],
  [/overnight/i,                    () => 28800],
  [/(\d+)\s*sec(?:ond)?s?/i,        m => +m[1]],
];

export function inferDuration(text: string): number | null {
  for (const [pattern, calc] of DURATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) return Math.round(calc(match));
  }
  return null;
}
```

Apply `inferDuration` as a post-processing pass over all extracted steps where `durationSeconds` is undefined.

---

## Ingredient Normalisation: `normaliseIngredient.ts`

```ts
const UNIT_MAP: Record<string, string> = {
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  cup: 'cup', cups: 'cup',
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg',
  ml: 'ml', milliliter: 'ml', millilitre: 'ml',
  l: 'l', liter: 'l', litre: 'l',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', pound: 'lb', pounds: 'lb',
  clove: 'clove', cloves: 'clove',
  slice: 'slice', slices: 'slice',
  piece: 'piece', pieces: 'piece',
};

export function normaliseIngredient(raw: string) {
  const match = raw.match(/^([\d./½¼¾⅓⅔]+)?\s*([a-z]+)?\s+(.+)$/i);
  if (!match) return { qty: null, unit: null, name: raw.trim() };
  const [, qty, unit, name] = match;
  return {
    qty: qty ? parseFloat(qty) : null,
    unit: unit ? (UNIT_MAP[unit.toLowerCase()] ?? unit.toLowerCase()) : null,
    name: name.trim().toLowerCase(),
  };
}
```

---

## Equipment Inference: `inferEquipment.ts`

```ts
const EQUIPMENT_KEYWORDS: Record<string, string[]> = {
  'frying pan':  ['fry', 'sauté', 'sear', 'pan-fry'],
  'saucepan':    ['simmer', 'boil', 'blanch', 'poach'],
  'oven':        ['bake', 'roast', 'broil', 'grill'],
  'wok':         ['stir-fry', 'wok'],
  'blender':     ['blend', 'purée', 'puree', 'blitz'],
  'food processor': ['pulse', 'process', 'chop finely'],
  'mixing bowl': ['mix', 'combine', 'whisk', 'fold'],
  'cutting board': ['chop', 'dice', 'mince', 'slice', 'julienne'],
  'colander':    ['drain', 'rinse', 'strain'],
  'peeler':      ['peel'],
};

export function inferEquipment(actionText: string): string[] {
  const lower = actionText.toLowerCase();
  return Object.entries(EQUIPMENT_KEYWORDS)
    .filter(([, keywords]) => keywords.some(k => lower.includes(k)))
    .map(([equipment]) => equipment);
}
```

---

## Multi-Pass Extraction: `extractRecipe.ts` Update

```ts
export async function extractRecipe(text: string): Promise<RecipeExtraction> {
  const result = await runExtraction(text, PROMPTS.v2);

  result.steps = result.steps.map(step => ({
    ...step,
    durationSeconds: step.durationSeconds ?? inferDuration(step.action) ?? undefined,
    equipment: step.equipment?.length
      ? step.equipment
      : inferEquipment(step.action),
  }));

  if (result.confidence < 0.5) {
    const refined = await runExtraction(text, PROMPTS.v2_focused);
    if (refined.confidence > result.confidence) return { ...refined, promptVersion: 'v2_focused' };
  }

  return { ...result, promptVersion: 'v2' };
}
```

---

## Prompt Versioning: `prompts.ts`

```ts
export const PROMPTS = {
  v2: `You are a recipe extraction assistant...`,
  v2_focused: `You are a recipe extraction assistant. The previous extraction had low confidence.
Focus especially on: (1) identifying ALL steps even if prose-style,
(2) exact durations, (3) all ingredients with quantities. Return only what the text supports.`,
};
```

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-11-01 | Step text "cook for 20 minutes" | `durationSeconds: 1200` inferred |
| TC-11-02 | Step text "simmer for half an hour" | `durationSeconds: 1800` inferred |
| TC-11-03 | Step text "bake until golden" | `durationSeconds: null`, no error |
| TC-11-04 | Ingredient "2 tbsp olive oil" | `{qty:2, unit:"tbsp", name:"olive oil"}` |
| TC-11-05 | Ingredient "a handful of basil" | `{qty:null, unit:null, name:"basil"}` |
| TC-11-06 | Step "stir-fry vegetables" | equipment: ["wok"] inferred |
| TC-11-07 | Low-confidence first pass | Second pass runs, higher confidence used |
| TC-11-08 | Both passes low confidence | First pass result returned with warning |
| TC-11-09 | `promptVersion` stored on version | Version snapshot contains `promptVersion` |
| TC-11-10 | Duration range "10-15 min" | Mean used: `durationSeconds: 750` |
