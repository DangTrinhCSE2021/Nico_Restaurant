import type { DishFacets } from "@/domain/filters";
import { t } from "@/domain/localize";
import type { Dish, DishLink, Ingredient, RegionPair, Store, Substitution } from "@/domain/schema";
import type { ShopData } from "@/domain/shopping";
import type { StoreKind } from "@/domain/vocab";
import type { Locale } from "@/i18n/config";
import type { PairData } from "./load";

// Indexed, cross-linked view of one pair's seed data, plus the shopping rules that pages share.
// Pure (no fs, no React), so `npm run validate` can build it outside Next.

// "Regular supermarket" for the supermarket filter. Online shops and Asia-Märkte don't count.
export const SUPERMARKET_KINDS: readonly StoreKind[] = ["supermarket", "discounter"];
// Lower-fidelity swaps change the dish too much to count as "you can cook it from here".
export const MIN_SWAP_FIDELITY = 3;

export type ResolvedLink = { link: DishLink; home: Dish; local: Dish };
// `dish` is set when the swap only applies to that dish.
export type ResolvedSwap = { substitution: Substitution; substitute: Ingredient; dish?: Dish };
export type StoreSummary = {
  usually: Ingredient[];
  sometimes: Ingredient[];
  onlyHere: Ingredient[];
  // Recipes where every required ingredient (or a close swap) is usually stocked here.
  oneTripDishes: Dish[];
};
export type GuideEntry = { ingredient: Ingredient; usedIn: Dish[] };

export type PairModel = {
  slug: string;
  pair: RegionPair;
  // In file order, for listing.
  stores: Store[];
  ingredients: Ingredient[];
  dishes: Dish[];
  links: ResolvedLink[];
  storeBySlug: ReadonlyMap<string, Store>;
  ingredientBySlug: ReadonlyMap<string, Ingredient>;
  dishBySlug: ReadonlyMap<string, Dish>;
  // Ingredients used by home-region dishes, with the dishes that use them.
  guideEntries: GuideEntry[];
  linksFor(dishSlug: string): ResolvedLink[];
  swapsFor(ingredientSlug: string, dishSlug?: string): ResolvedSwap[];
  isAsiaMarketOnly(ingredient: Ingredient): boolean;
  facetsFor(dish: Dish): DishFacets;
  storeSummary(store: Store): StoreSummary;
};

// Load-time checks guarantee references resolve; this turns a broken invariant into a clear error.
function lookup<T>(map: ReadonlyMap<string, T>, slug: string, kind: string): T {
  const value = map.get(slug);
  if (value === undefined) throw new Error(`unknown ${kind} "${slug}"`);
  return value;
}

const recipeSlugs = (dish: Dish) => dish.recipe?.ingredients.map((i) => i.ingredient) ?? [];

export function buildModel(data: PairData): PairModel {
  const storeBySlug = new Map(data.stores.map((s) => [s.slug, s]));
  const ingredientBySlug = new Map(data.ingredients.map((i) => [i.slug, i]));
  const dishBySlug = new Map(data.dishes.map((d) => [d.slug, d]));
  const store = (slug: string) => lookup(storeBySlug, slug, "store");
  const ingredient = (slug: string) => lookup(ingredientBySlug, slug, "ingredient");
  const dish = (slug: string) => lookup(dishBySlug, slug, "dish");

  const links = data.links.map((link) => ({ link, home: dish(link.homeDish), local: dish(link.localDish) }));
  const linksByDish = new Map<string, ResolvedLink[]>();
  for (const l of links) {
    for (const slug of [l.home.slug, l.local.slug]) linksByDish.set(slug, [...(linksByDish.get(slug) ?? []), l]);
  }

  // Per original ingredient, closest swap first.
  const swapsByOriginal = new Map<string, ResolvedSwap[]>();
  for (const substitution of [...data.substitutions].sort((a, b) => b.fidelity - a.fidelity)) {
    const swap = {
      substitution,
      substitute: ingredient(substitution.substitute),
      dish: substitution.dish ? dish(substitution.dish) : undefined,
    };
    swapsByOriginal.set(substitution.original, [...(swapsByOriginal.get(substitution.original) ?? []), swap]);
  }

  // Without a dish: every swap (the guide labels dish-only ones). With a dish: swaps for that
  // dish first, then general ones; swaps scoped to other dishes are left out. Sort is stable,
  // so fidelity order holds within each group.
  const swapsFor = (ingredientSlug: string, dishSlug?: string) => {
    const all = swapsByOriginal.get(ingredientSlug) ?? [];
    if (!dishSlug) return all;
    return all
      .filter((s) => !s.dish || s.dish.slug === dishSlug)
      .sort((a, b) => Number(!!b.dish) - Number(!!a.dish));
  };

  // "Usually" only: a dish shouldn't pass a store check on a lucky find.
  const usuallyAt = (ing: Ingredient, where: (s: Store) => boolean) =>
    ing.availability.some((a) => a.likelihood === "usually" && where(store(a.store)));

  // Every required recipe ingredient is usually stocked `where`, directly or through a close swap.
  // A dish without a recipe passes trivially; callers that need a recipe check for it.
  const cookableFrom = (d: Dish, where: (s: Store) => boolean) =>
    (d.recipe?.ingredients ?? [])
      .filter((i) => !i.optional)
      .every(
        ({ ingredient: slug }) =>
          usuallyAt(ingredient(slug), where) ||
          swapsFor(slug, d.slug).some(
            (s) => s.substitution.fidelity >= MIN_SWAP_FIDELITY && usuallyAt(s.substitute, where),
          ),
      );

  const isSupermarket = (s: Store) => SUPERMARKET_KINDS.includes(s.kind);

  const facets = new Map<string, DishFacets>(
    data.dishes.map((d) => [
      d.slug,
      {
        costPerServingEur: d.costPerServingEur,
        timeMin: d.timeMin,
        equipment: d.equipment,
        diet: d.diet,
        supermarketOnly: cookableFrom(d, isSupermarket),
      },
    ]),
  );

  const summaries = new Map<string, StoreSummary>(
    data.stores.map((s) => {
      const stockedHere = (i: Ingredient, likelihood: string) =>
        i.availability.some((a) => a.store === s.slug && a.likelihood === likelihood);
      return [
        s.slug,
        {
          usually: data.ingredients.filter((i) => stockedHere(i, "usually")),
          sometimes: data.ingredients.filter((i) => stockedHere(i, "sometimes")),
          onlyHere: data.ingredients.filter(
            (i) => i.availability.length > 0 && i.availability.every((a) => a.store === s.slug),
          ),
          oneTripDishes: data.dishes.filter((d) => d.recipe && cookableFrom(d, (other) => other.slug === s.slug)),
        },
      ];
    }),
  );

  const usedIn = new Map<string, Dish[]>();
  for (const d of data.dishes.filter((d) => d.region === data.pair.home)) {
    for (const slug of new Set([...d.keyIngredients, ...recipeSlugs(d)])) {
      usedIn.set(slug, [...(usedIn.get(slug) ?? []), d]);
    }
  }
  const guideEntries = data.ingredients.flatMap((i) => {
    const dishes = usedIn.get(i.slug);
    return dishes ? [{ ingredient: i, usedIn: dishes }] : [];
  });

  return {
    slug: data.pair.slug,
    pair: data.pair,
    stores: data.stores,
    ingredients: data.ingredients,
    dishes: data.dishes,
    links,
    storeBySlug,
    ingredientBySlug,
    dishBySlug,
    guideEntries,
    linksFor: (dishSlug) => linksByDish.get(dishSlug) ?? [],
    swapsFor,
    isAsiaMarketOnly: (i) => i.availability.length > 0 && i.availability.every((a) => store(a.store).kind === "asia-market"),
    facetsFor: (d) => lookup(facets, d.slug, "dish"),
    storeSummary: (s) => lookup(summaries, s.slug, "store"),
  };
}


// Compact, localized snapshot for the client-side shopping list.
export function shoppingData(model: PairModel, lang: Locale): ShopData {
  return {
    stores: model.stores.map(({ slug, name, kind, priceLevel }) => ({ slug, name, kind, priceLevel })),
    ingredients: model.ingredients.map((i) => ({
      slug: i.slug,
      name: t(i.name, lang),
      de: i.name.de,
      image: i.image?.file,
      availability: i.availability,
    })),
    dishes: model.dishes.flatMap((d) =>
      d.recipe ? [{ slug: d.slug, name: t(d.name, lang), ingredients: d.recipe.ingredients }] : [],
    ),
  };
}
