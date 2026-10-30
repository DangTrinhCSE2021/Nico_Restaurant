// Allowed values for the enum fields in the seed data. Plain arrays without Zod, so
// client code (filters, shopping list) can share them without bundling the schema.

export const regionCodes = ["VN", "DE"] as const;

export const dishTypes = [
  "soup", "noodle", "rice", "braise", "roast", "grill", "stir-fry",
  "salad", "bread", "dumpling", "snack", "dessert",
] as const;

export const cookingMethods = ["simmer", "braise", "roast", "grill", "fry", "stir-fry", "steam", "raw", "bake"] as const;

export const equipment = ["stove", "oven", "one-pot", "rice-cooker", "microwave"] as const;

export const diets = ["vegetarian", "no-pork", "no-beef"] as const;

export const storeKinds = ["supermarket", "discounter", "asia-market", "online"] as const;

export const ingredientCategories = ["protein", "vegetable", "herb", "sauce", "spice", "noodle-rice", "other"] as const;

export const likelihoods = ["usually", "sometimes", "seasonal", "rare"] as const;

// "Regular supermarket": what the supermarket filter, one-trip lists and the shopping
// list's store picker count. Online shops and Asia-Märkte don't.
export const supermarketKinds: readonly StoreKind[] = ["supermarket", "discounter"];
export const isSupermarketKind = (kind: string) => (supermarketKinds as readonly string[]).includes(kind);

export type Equipment = (typeof equipment)[number];
export type Diet = (typeof diets)[number];
export type StoreKind = (typeof storeKinds)[number];
