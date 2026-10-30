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

  const errors = checkReferences(data, pairSlug);
  if (errors.length > 0) {
    throw new Error(`Invalid seed data in ${pairSlug}:\n- ${errors.join("\n- ")}`);
  }
  return data;
}

function checkReferences(data: PairData, pairSlug: string): string[] {
  const errors: string[] = [];
  const { home, host } = data.pair;
  const stores = new Set(data.stores.map((s) => s.slug));
  const ingredients = new Set(data.ingredients.map((i) => i.slug));
  const dishes = new Map(data.dishes.map((d) => [d.slug, d]));

  // URLs use the folder name, so pair.yaml must agree with it.
  if (data.pair.slug !== pairSlug) errors.push(`pair.yaml slug "${data.pair.slug}" must match folder "${pairSlug}"`);
  // Every region check below would fail as well, so report just this.
  if (home === host) return [...errors, `pair home and host are both "${home}"`];

  const dupes = (keys: string[], kind: string) =>
    keys
      .filter((s, i) => keys.indexOf(s) !== i)
      .forEach((s) => errors.push(`duplicate ${kind} "${s}"`));
  dupes(data.stores.map((s) => s.slug), "store slug");
  dupes(data.ingredients.map((i) => i.slug), "ingredient slug");
  dupes(data.dishes.map((d) => d.slug), "dish slug");
  // "/" can't appear in a slug, so the joined key is unambiguous.
  dupes(data.links.map((l) => `${l.homeDish}/${l.localDish}`), "link");

  for (const ing of data.ingredients) {
    for (const a of ing.availability) {
      if (!stores.has(a.store)) errors.push(`ingredient "${ing.slug}" uses unknown store "${a.store}"`);
    }
    if (ing.image && !fs.existsSync(path.join(process.cwd(), "public", ing.image.file))) {
      errors.push(`ingredient "${ing.slug}" image not found: public${ing.image.file}`);
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

  const checkLinkSide = (slug: string, region: string, side: string) => {
    const dish = dishes.get(slug);
    if (!dish) errors.push(`link ${side} uses unknown dish "${slug}"`);
    else if (dish.region !== region) errors.push(`link ${side} "${slug}" is not a ${region} dish`);
  };
  for (const link of data.links) {
    checkLinkSide(link.homeDish, home, "homeDish");
    checkLinkSide(link.localDish, host, "localDish");
  }

  // Host-region dishes are only listed through links ("familiar" page), so an unlinked one can't be reached.
  const linked = new Set(data.links.map((l) => l.localDish));
  for (const dish of data.dishes) {
    if (dish.region === host && !linked.has(dish.slug)) {
      errors.push(`${host} dish "${dish.slug}" has no link, so no page lists it`);
    }
  }

  for (const sub of data.substitutions) {
    const label = `substitution "${sub.original}" -> "${sub.substitute}"`;
    if (!ingredients.has(sub.original)) errors.push(`${label} uses unknown ingredient "${sub.original}"`);
    if (!ingredients.has(sub.substitute)) errors.push(`${label} uses unknown ingredient "${sub.substitute}"`);
    if (sub.original === sub.substitute) errors.push(`${label} swaps an ingredient for itself`);
    if (sub.dish) {
      const dish = dishes.get(sub.dish);
      const uses =
        dish?.keyIngredients.includes(sub.original) ||
        dish?.recipe?.ingredients.some((i) => i.ingredient === sub.original);
      if (!dish) errors.push(`${label} uses unknown dish "${sub.dish}"`);
      else if (!uses) errors.push(`${label} is for dish "${sub.dish}", which doesn't use "${sub.original}"`);
    }
  }

  return errors;
}
