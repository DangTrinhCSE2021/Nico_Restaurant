import { z } from "zod";

// Content schema for the curated seed data in content/seed/<pair>/.
// Every file is validated against these schemas at build time and by `npm run validate`.
// Objects are strict so a typo or a stray YAML comma fails loudly instead of being dropped.

export const regionCode = z.enum(["VN", "DE"]);

// Vietnamese is required; English falls back to Vietnamese; German is the in-shop name.
export const localizedText = z.strictObject({
  vi: z.string().min(1),
  en: z.string().min(1).optional(),
  de: z.string().min(1).optional(),
});

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be kebab-case ASCII");

// 0 = none, 3 = dominant.
const level = z.number().int().min(0).max(3);
export const flavorProfile = z.strictObject({
  sweet: level,
  sour: level,
  salty: level,
  umami: level,
  spicy: level,
  herbal: level,
});

export const dishType = z.enum([
  "soup", "noodle", "rice", "braise", "roast", "grill", "stir-fry",
  "salad", "bread", "dumpling", "snack", "dessert",
]);

export const cookingMethod = z.enum([
  "simmer", "braise", "roast", "grill", "fry", "stir-fry", "steam", "raw", "bake",
]);

export const equipment = z.enum(["stove", "oven", "one-pot", "rice-cooker", "microwave"]);

export const diet = z.enum(["vegetarian", "no-pork", "no-beef"]);

const provenance = {
  source: z.enum(["curated", "llm"]),
  reviewStatus: z.enum(["draft", "reviewed"]),
};

export const storeSchema = z.strictObject({
  slug,
  name: z.string(),
  kind: z.enum(["supermarket", "discounter", "asia-market", "online"]),
  priceLevel: z.number().int().min(1).max(3),
  notes: localizedText,
});

// A photo under public/. Credit and license are required so every image can be attributed.
export const imageSchema = z.strictObject({
  file: z.string().regex(/^\/images\/[a-z0-9/_-]+\.(jpg|jpeg|png|webp)$/, "file must be a path under /images/"),
  credit: z.string().min(1),
  license: z.string().min(1),
  source: z.string().url().optional(),
});

export const ingredientSchema = z.strictObject({
  slug,
  name: localizedText.required({ de: true }),
  aliases: z.array(z.string()).default([]),
  category: z.enum(["protein", "vegetable", "herb", "sauce", "spice", "noodle-rice", "other"]),
  image: imageSchema.optional(),
  availability: z.array(
    z.strictObject({
      store: slug,
      likelihood: z.enum(["usually", "sometimes", "seasonal", "rare"]),
      productHint: z.string().optional(),
    }),
  ),
  lastVerified: z.string().date().optional(),
});

export const recipeSchema = z.strictObject({
  servings: z.number().int().positive(),
  ingredients: z.array(
    z.strictObject({
      ingredient: slug,
      amount: z.string(),
      optional: z.boolean().default(false),
    }),
  ),
  steps: z.array(localizedText).min(1),
});

export const dishSchema = z.strictObject({
  slug,
  region: regionCode,
  name: localizedText,
  description: localizedText,
  dishType,
  methods: z.array(cookingMethod).min(1),
  flavor: flavorProfile,
  keyIngredients: z.array(slug),
  timeMin: z.number().int().positive(),
  costPerServingEur: z.number().positive(),
  equipment: z.array(equipment),
  diet: z.array(diet).default([]),
  // Only home-cooking dishes (VN dishes cooked in DE) need a recipe.
  recipe: recipeSchema.optional(),
  ...provenance,
});

// "German dish X feels familiar to someone who loves Vietnamese dish Y".
export const dishLinkSchema = z.strictObject({
  homeDish: slug,
  localDish: slug,
  explanation: localizedText,
  ...provenance,
});

export const substitutionSchema = z.strictObject({
  original: slug,
  substitute: slug,
  // Null/absent means the swap works for any dish.
  dish: slug.optional(),
  fidelity: z.number().int().min(1).max(5),
  notes: localizedText,
  ...provenance,
});

export const regionPairSchema = z.strictObject({
  slug,
  home: regionCode,
  host: regionCode,
});

export type LocalizedText = z.infer<typeof localizedText>;
export type FlavorProfile = z.infer<typeof flavorProfile>;
export type Store = z.infer<typeof storeSchema>;
export type Image = z.infer<typeof imageSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type Dish = z.infer<typeof dishSchema>;
export type DishLink = z.infer<typeof dishLinkSchema>;
export type Substitution = z.infer<typeof substitutionSchema>;
export type RegionPair = z.infer<typeof regionPairSchema>;
