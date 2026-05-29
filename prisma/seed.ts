import { PrismaClient, Difficulty, Visibility } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Equipment Tags ──────────────────────────────────────────────────────────
  const equipmentNames = [
    'Wok',
    'Frying Pan',
    'Pot',
    'Oven',
    'Knife & Board',
    'Blender',
    'Air Fryer',
    'Stand Mixer',
    'Cast Iron Pan',
    'Grill',
    'Pressure Cooker',
    'Food Processor',
    'Microwave',
  ]

  const equipment: Record<string, string> = {}
  for (const name of equipmentNames) {
    const tag = await prisma.equipmentTag.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    equipment[name] = tag.id
  }
  console.log(`  ✓ ${equipmentNames.length} equipment tags`)

  // ── Ingredients ─────────────────────────────────────────────────────────────
  const ingredientDefs: { name: string; aliases?: string[] }[] = [
    { name: 'Garlic', aliases: ['garlic cloves', 'minced garlic'] },
    { name: 'Onion', aliases: ['white onion', 'yellow onion'] },
    { name: 'Olive Oil', aliases: ['extra virgin olive oil', 'EVOO'] },
    { name: 'Soy Sauce', aliases: ['light soy sauce', 'shoyu'] },
    { name: 'Chicken', aliases: ['chicken breast', 'chicken thigh', 'boneless chicken'] },
    { name: 'Spaghetti', aliases: ['pasta', 'spaghettini'] },
    { name: 'Tomato', aliases: ['cherry tomatoes', 'roma tomato', 'canned tomatoes'] },
    { name: 'Egg', aliases: ['eggs', 'large egg'] },
    { name: 'Salt' },
    { name: 'Pepper', aliases: ['black pepper', 'white pepper', 'ground pepper'] },
    { name: 'Butter', aliases: ['unsalted butter', 'salted butter'] },
    { name: 'Flour', aliases: ['all-purpose flour', 'plain flour'] },
    { name: 'Sugar', aliases: ['white sugar', 'granulated sugar'] },
  ]

  const ingredients: Record<string, string> = {}
  for (const { name, aliases = [] } of ingredientDefs) {
    const ing = await prisma.ingredient.upsert({
      where: { name },
      update: {},
      create: { name, aliases },
    })
    ingredients[name] = ing.id
  }
  console.log(`  ✓ ${ingredientDefs.length} ingredients`)

  // ── Seed User (required for recipe authorship) ───────────────────────────────
  const seedUser = await prisma.user.upsert({
    where: { clerkId: 'seed_user_001' },
    update: {},
    create: {
      clerkId: 'seed_user_001',
      email: 'seed@stepdish.app',
      displayName: 'StepDish Kitchen',
    },
  })
  console.log(`  ✓ Seed user: ${seedUser.displayName}`)

  // ── Recipe 1: Tomato Pasta ───────────────────────────────────────────────────
  const pasta = await prisma.recipe.upsert({
    where: { id: 'seed-recipe-tomato-pasta' },
    update: {},
    create: {
      id: 'seed-recipe-tomato-pasta',
      authorId: seedUser.id,
      title: 'Tomato Pasta',
      cuisine: 'Italian',
      servings: 2,
      totalMinutes: 35,
      difficulty: Difficulty.EASY,
      visibility: Visibility.PUBLISHED,
      ingredients: {
        create: [
          { ingredientId: ingredients['Spaghetti'], quantity: '200', unit: 'g' },
          { ingredientId: ingredients['Tomato'], quantity: '400', unit: 'g', notes: 'canned crushed' },
          { ingredientId: ingredients['Garlic'], quantity: '3', unit: 'cloves' },
          { ingredientId: ingredients['Olive Oil'], quantity: '2', unit: 'tbsp' },
          { ingredientId: ingredients['Salt'], quantity: 'to taste' },
          { ingredientId: ingredients['Pepper'], quantity: 'to taste' },
        ],
      },
      equipment: {
        create: [
          { equipmentId: equipment['Pot'] },
          { equipmentId: equipment['Frying Pan'] },
          { equipmentId: equipment['Knife & Board'] },
        ],
      },
      steps: {
        create: [
          {
            position: 1,
            action: 'Bring a large pot of salted water to a boil.',
            durationMin: 10,
            reminder: 'Water should be well-salted — it should taste like the sea.',
          },
          {
            position: 2,
            action: 'Finely slice the garlic. Heat olive oil in a frying pan over medium-low heat, add garlic and cook until golden and fragrant.',
            durationMin: 5,
            reminder: 'Do not burn the garlic — keep heat low.',
          },
          {
            position: 3,
            action: 'Add crushed tomatoes to the pan. Season with salt and pepper. Simmer on low.',
            durationMin: 15,
          },
          {
            position: 4,
            action: 'Cook the spaghetti according to packet instructions until al dente. Reserve 1 cup of pasta water before draining.',
            durationMin: 10,
            reminder: 'Save the pasta water — it helps bind the sauce.',
          },
          {
            position: 5,
            action: 'Toss drained spaghetti into the tomato sauce. Add a splash of pasta water and toss vigorously over heat for 1–2 minutes.',
            durationMin: 2,
          },
        ],
      },
    },
  })
  console.log(`  ✓ Recipe: ${pasta.title}`)

  // ── Recipe 2: Garlic Butter Chicken ─────────────────────────────────────────
  const chicken = await prisma.recipe.upsert({
    where: { id: 'seed-recipe-garlic-butter-chicken' },
    update: {},
    create: {
      id: 'seed-recipe-garlic-butter-chicken',
      authorId: seedUser.id,
      title: 'Garlic Butter Chicken',
      cuisine: 'Asian',
      servings: 2,
      totalMinutes: 25,
      difficulty: Difficulty.EASY,
      visibility: Visibility.PUBLISHED,
      ingredients: {
        create: [
          { ingredientId: ingredients['Chicken'], quantity: '400', unit: 'g', notes: 'boneless thighs' },
          { ingredientId: ingredients['Butter'], quantity: '2', unit: 'tbsp' },
          { ingredientId: ingredients['Garlic'], quantity: '4', unit: 'cloves', notes: 'minced' },
          { ingredientId: ingredients['Soy Sauce'], quantity: '2', unit: 'tbsp' },
          { ingredientId: ingredients['Salt'], quantity: 'to taste' },
          { ingredientId: ingredients['Pepper'], quantity: 'to taste' },
        ],
      },
      equipment: {
        create: [
          { equipmentId: equipment['Cast Iron Pan'] },
          { equipmentId: equipment['Knife & Board'] },
        ],
      },
      steps: {
        create: [
          {
            position: 1,
            action: 'Pat chicken thighs dry with paper towels. Season generously with salt and pepper on both sides.',
            durationMin: 3,
          },
          {
            position: 2,
            action: 'Heat cast iron pan over high heat until smoking. Add 1 tbsp butter. Sear chicken skin-side down without moving for 5 minutes until golden-brown crust forms.',
            durationMin: 5,
            reminder: 'Resist the urge to move the chicken — it will release when ready.',
          },
          {
            position: 3,
            action: 'Flip chicken. Reduce heat to medium. Cook for another 5 minutes until cooked through (internal temp 74°C / 165°F).',
            durationMin: 5,
            reminder: 'Use a meat thermometer to verify doneness.',
          },
          {
            position: 4,
            action: 'Remove chicken and rest on a plate. In the same pan, add remaining butter and minced garlic. Cook 1 minute until fragrant.',
            durationMin: 1,
          },
          {
            position: 5,
            action: 'Add soy sauce to the pan, stir, and spoon garlic butter sauce over the rested chicken. Serve immediately.',
            durationMin: 1,
          },
        ],
      },
    },
  })
  console.log(`  ✓ Recipe: ${chicken.title}`)

  // ── Recipe 3: Simple Veggie Stir Fry ────────────────────────────────────────
  const stirfry = await prisma.recipe.upsert({
    where: { id: 'seed-recipe-veggie-stir-fry' },
    update: {},
    create: {
      id: 'seed-recipe-veggie-stir-fry',
      authorId: seedUser.id,
      title: 'Simple Veggie Stir Fry',
      cuisine: 'Asian',
      servings: 2,
      totalMinutes: 15,
      difficulty: Difficulty.EASY,
      visibility: Visibility.PUBLISHED,
      ingredients: {
        create: [
          { ingredientId: ingredients['Garlic'], quantity: '2', unit: 'cloves', notes: 'sliced' },
          { ingredientId: ingredients['Onion'], quantity: '1', unit: 'medium', notes: 'cut into wedges' },
          { ingredientId: ingredients['Soy Sauce'], quantity: '2', unit: 'tbsp' },
          { ingredientId: ingredients['Olive Oil'], quantity: '1', unit: 'tbsp' },
          { ingredientId: ingredients['Salt'], quantity: 'to taste' },
          { ingredientId: ingredients['Pepper'], quantity: 'to taste' },
        ],
      },
      equipment: {
        create: [
          { equipmentId: equipment['Wok'] },
          { equipmentId: equipment['Knife & Board'] },
        ],
      },
      steps: {
        create: [
          {
            position: 1,
            action: 'Prep all vegetables: slice garlic, cut onion into wedges, chop any other vegetables into bite-sized pieces.',
            durationMin: 5,
            notes: 'Have everything ready before turning on the heat — stir fry moves fast.',
          },
          {
            position: 2,
            action: 'Heat wok over the highest heat until smoking. Add oil and swirl to coat.',
            durationMin: 1,
            reminder: 'A screaming-hot wok is the secret to wok hei (that smoky flavour).',
          },
          {
            position: 3,
            action: 'Add garlic and onion. Stir fry tossing constantly for 2 minutes.',
            durationMin: 2,
          },
          {
            position: 4,
            action: 'Add remaining vegetables. Stir fry for another 3–4 minutes until tender-crisp.',
            durationMin: 4,
          },
          {
            position: 5,
            action: 'Add soy sauce and toss everything together for 30 seconds. Season with salt and pepper. Serve immediately.',
            durationMin: 1,
            reminder: 'Serve straight from the wok for the best texture.',
          },
        ],
      },
    },
  })
  console.log(`  ✓ Recipe: ${stirfry.title}`)

  console.log('\n✅ Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
