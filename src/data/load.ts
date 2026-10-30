import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import {
  dishLinkSchema,
  dishSchema,
  ingredientSchema,
  regionPairSchema,
  storeSchema,
  substitutionSchema,
} from "@/domain/schema";

const SEED_DIR = path.join(process.cwd(), "content", "seed");

const pairDataSchema = z.strictObject({
  pair: regionPairSchema,
  stores: z.array(storeSchema),
  ingredients: z.array(ingredientSchema),
  dishes: z.array(dishSchema),
  links: z.array(dishLinkSchema),
  substitutions: z.array(substitutionSchema),
});

export type PairData = z.infer<typeof pairDataSchema>;

function readYaml(dir: string, file: string): unknown {
  return parse(fs.readFileSync(path.join(dir, file), "utf8"));
}

export function listPairs(): string[] {
  return fs
    .readdirSync(SEED_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

// Loads and validates one country pair, including cross-references between files.
export function loadPair(pairSlug: string): PairData {
  const dir = path.join(SEED_DIR, pairSlug);
  const data = pairDataSchema.parse({
    pair: readYaml(dir, "pair.yaml"),
    stores: readYaml(dir, "stores.yaml"),
    ingredients: readYaml(dir, "ingredients.yaml"),
    dishes: readYaml(dir, "dishes.yaml"),
    links: readYaml(dir, "links.yaml"),
    substitutions: readYaml(dir, "substitutions.yaml"),
  });

  const errors = checkReferences(data);
  if (errors.length > 0) {
    throw new Error(`Invalid seed data in ${pairSlug}:\n- ${errors.join("\n- ")}`);
  }
  return data;
}

function checkReferences(data: PairData): string[] {
  const errors: string[] = [];
  const stores = new Set(data.stores.map((s) => s.slug));
  const ingredients = new Set(data.ingredients.map((i) => i.slug));
  const dishes = new Map(data.dishes.map((d) => [d.slug, d]));

  const dupes = (slugs: string[], kind: string) =>
    slugs
      .filter((s, i) => slugs.indexOf(s) !== i)
      .forEach((s) => errors.push(`duplicate ${kind} slug "${s}"`));
  dupes(data.stores.map((s) => s.slug), "store");
  dupes(data.ingredients.map((i) => i.slug), "ingredient");
  dupes(data.dishes.map((d) => d.slug), "dish");

  for (const ing of data.ingredients) {
    for (const a of ing.availability) {
      if (!stores.has(a.store)) errors.push(`ingredient "${ing.slug}" uses unknown store "${a.store}"`);
    }
  }

  for (const dish of data.dishes) {
    for (const k of dish.keyIngredients) {
      if (!ingredients.has(k)) errors.push(`dish "${dish.slug}" uses unknown ingredient "${k}"`);
    }
    for (const r of dish.recipe?.ingredients ?? []) {
      if (!ingredients.has(r.ingredient)) {
        errors.push(`recipe "${dish.slug}" uses unknown ingredient "${r.ingredient}"`);
      }
    }
  }

  for (const link of data.links) {
    const home = dishes.get(link.homeDish);
    const local = dishes.get(link.localDish);
    if (home?.region !== data.pair.home) errors.push(`link homeDish "${link.homeDish}" is not a ${data.pair.home} dish`);
    if (local?.region !== data.pair.host) errors.push(`link localDish "${link.localDish}" is not a ${data.pair.host} dish`);
  }

  for (const sub of data.substitutions) {
    if (!ingredients.has(sub.original)) errors.push(`substitution uses unknown ingredient "${sub.original}"`);
    if (!ingredients.has(sub.substitute)) errors.push(`substitution uses unknown ingredient "${sub.substitute}"`);
    if (sub.dish && !dishes.has(sub.dish)) errors.push(`substitution uses unknown dish "${sub.dish}"`);
  }

  return errors;
}
