import { PrismaClient, Difficulty, Visibility } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ---------- Equipment Tags ----------
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
  ];

  const equipment: Record<string, { id: string; name: string }> = {};
  for (const name of equipmentNames) {
    const tag = await prisma.equipmentTag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    equipment[name] = tag;
  }
  console.log(`✅ Seeded ${equipmentNames.length} equipment tags`);

  // ---------- Ingredients ----------
  const ingredientNames = [
    'Garlic',
    'Onion',
    'Olive Oil',
    'Soy Sauce',
    'Chicken',
    'Spaghetti',
    'Tomato',
    'Egg',
    'Salt',
    'Pepper',
    'Butter',
    'Flour',
    'Sugar',
  ];

  const ingredients: Record<string, { id: string; name: string }> = {};
  for (const name of ingredientNames) {
    const ing = await prisma.ingredient.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    ingredients[name] = ing;
  }
  console.log(`✅ Seeded ${ingredientNames.length} ingredients`);

  // ---------- Seed User ----------
  const seedUser = await prisma.user.upsert({
    where: { email: 'seed@stepdish.app' },
    update: {},
    create: {
      clerkId: 'seed_clerk_id',
      email: 'seed@stepdish.app',
      displayName: 'Seed Chef',
    },
  });
  console.log(`✅ Seed user ready: ${seedUser.email}`);

  // ---------- Recipe 1: Tomato Pasta ----------
  const pastaSpaghetti = ingredients['Spaghetti']!;
  const pastaGarlic = ingredients['Garlic']!;
  const pastaTomato = ingredients['Tomato']!;
  const pastaOliveOil = ingredients['Olive Oil']!;
  const pastaSalt = ingredients['Salt']!;
  const pastaPepper = ingredients['Pepper']!;
  const pastaPot = equipment['Pot']!;
  const pastaFryingPan = equipment['Frying Pan']!;
  const pastaKnife = equipment['Knife & Board']!;

  const tomatoPasta = await prisma.recipe.upsert({
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
          { ingredientId: pastaSpaghetti.id, quantity: '200', unit: 'g' },
          { ingredientId: pastaTomato.id, quantity: '3', unit: 'whole' },
          { ingredientId: pastaGarlic.id, quantity: '3', unit: 'cloves' },
          { ingredientId: pastaOliveOil.id, quantity: '2', unit: 'tbsp' },
          { ingredientId: pastaSalt.id },
          { ingredientId: pastaPepper.id },
        ],
      },
      equipment: {
        create: [
          { equipmentId: pastaPot.id },
          { equipmentId: pastaFryingPan.id },
          { equipmentId: pastaKnife.id },
        ],
      },
      steps: {
        create: [
          {
            position: 1,
            action: 'Bring a large pot of salted water to a boil.',
            durationMin: 8,
          },
          {
            position: 2,
            action: 'Dice the tomatoes and mince the garlic.',
            durationMin: 5,
          },
          {
            position: 3,
            action: 'Cook spaghetti according to package instructions until al dente, then drain.',
            durationMin: 10,
          },
          {
            position: 4,
            action: 'Heat olive oil in a frying pan over medium heat. Sauté garlic for 1 minute, then add tomatoes and simmer for 10 minutes.',
            durationMin: 12,
            reminder: 'Stir occasionally to prevent sticking',
          },
          {
            position: 5,
            action: 'Toss drained pasta with the tomato sauce. Season with salt and pepper.',
            durationMin: 2,
          },
        ],
      },
    },
  });
  console.log(`✅ Seeded recipe: ${tomatoPasta.title}`);

  // ---------- Recipe 2: Garlic Butter Chicken ----------
  const chickenIng = ingredients['Chicken']!;
  const garlicIng = ingredients['Garlic']!;
  const butterIng = ingredients['Butter']!;
  const soySauceIng = ingredients['Soy Sauce']!;
  const saltIng = ingredients['Salt']!;
  const pepperIng = ingredients['Pepper']!;
  const castIronPan = equipment['Cast Iron Pan']!;
  const knifeBoard = equipment['Knife & Board']!;

  const garlicButterChicken = await prisma.recipe.upsert({
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
          { ingredientId: chickenIng.id, quantity: '400', unit: 'g' },
          { ingredientId: garlicIng.id, quantity: '4', unit: 'cloves' },
          { ingredientId: butterIng.id, quantity: '2', unit: 'tbsp' },
          { ingredientId: soySauceIng.id, quantity: '2', unit: 'tbsp' },
          { ingredientId: saltIng.id },
          { ingredientId: pepperIng.id },
        ],
      },
      equipment: {
        create: [
          { equipmentId: castIronPan.id },
          { equipmentId: knifeBoard.id },
        ],
      },
      steps: {
        create: [
          {
            position: 1,
            action: 'Cut chicken into bite-sized pieces and season with salt and pepper.',
            durationMin: 5,
          },
          {
            position: 2,
            action: 'Mince the garlic cloves finely.',
            durationMin: 2,
          },
          {
            position: 3,
            action: 'Heat cast iron pan over high heat. Add butter and sear chicken pieces until golden, about 5 minutes per side.',
            durationMin: 10,
            reminder: 'Do not overcrowd the pan',
          },
          {
            position: 4,
            action: 'Add minced garlic and soy sauce. Toss to coat and cook for 3 more minutes until sauce thickens.',
            durationMin: 3,
          },
          {
            position: 5,
            action: 'Rest for 2 minutes before serving.',
            durationMin: 2,
          },
        ],
      },
    },
  });
  console.log(`✅ Seeded recipe: ${garlicButterChicken.title}`);

  // ---------- Recipe 3: Simple Veggie Stir Fry ----------
  const wok = equipment['Wok']!;
  const knifeBoard2 = equipment['Knife & Board']!;
  const oliveOilIng = ingredients['Olive Oil']!;
  const onionIng = ingredients['Onion']!;
  const garlicIng2 = ingredients['Garlic']!;
  const soySauceIng2 = ingredients['Soy Sauce']!;
  const saltIng2 = ingredients['Salt']!;
  const pepperIng2 = ingredients['Pepper']!;

  const veggieStirFry = await prisma.recipe.upsert({
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
          { ingredientId: onionIng.id, quantity: '1', unit: 'whole' },
          { ingredientId: garlicIng2.id, quantity: '2', unit: 'cloves' },
          { ingredientId: oliveOilIng.id, quantity: '1', unit: 'tbsp' },
          { ingredientId: soySauceIng2.id, quantity: '1', unit: 'tbsp' },
          { ingredientId: saltIng2.id },
          { ingredientId: pepperIng2.id },
        ],
      },
      equipment: {
        create: [
          { equipmentId: wok.id },
          { equipmentId: knifeBoard2.id },
        ],
      },
      steps: {
        create: [
          {
            position: 1,
            action: 'Slice onion into thin strips and mince garlic.',
            durationMin: 3,
          },
          {
            position: 2,
            action: 'Heat wok over high heat until smoking. Add oil.',
            durationMin: 2,
            reminder: 'Wok must be very hot before adding oil',
          },
          {
            position: 3,
            action: 'Add garlic and stir-fry for 30 seconds, then add onion and toss continuously for 3 minutes.',
            durationMin: 4,
          },
          {
            position: 4,
            action: 'Drizzle soy sauce over vegetables, toss well and season with salt and pepper. Serve immediately.',
            durationMin: 1,
          },
        ],
      },
    },
  });
  console.log(`✅ Seeded recipe: ${veggieStirFry.title}`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
