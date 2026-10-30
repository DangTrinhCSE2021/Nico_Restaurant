import { ingredientAnchor } from "@/domain/anchors";
import type { DishFacets } from "@/domain/filters";
import type { Dish } from "@/domain/schema";
import type { PairData } from "./load";

export const findDish = (data: PairData, slug: string) =>
  data.dishes.find((d) => d.slug === slug);

export const findIngredient = (data: PairData, slug: string) =>
  data.ingredients.find((i) => i.slug === slug);

// Links where this dish is either side, so both the VN and the DE page can show them.
export const linksFor = (data: PairData, dishSlug: string) =>
  data.links.filter((l) => l.homeDish === dishSlug || l.localDish === dishSlug);

// Dish-specific swaps first, then general ones, each sorted by closeness.
export const substitutionsFor = (data: PairData, ingredientSlug: string, dishSlug: string) =>
  data.substitutions
    .filter((s) => s.original === ingredientSlug && (!s.dish || s.dish === dishSlug))
    .sort((a, b) => Number(!!b.dish) - Number(!!a.dish) || b.fidelity - a.fidelity);

export const dishHref = (lang: string, pair: string, slug: string) =>
  `/${lang}/${pair}/dish/${slug}`;

export const guideHref = (lang: string, pair: string, ingredientSlug: string) =>
  `/${lang}/${pair}/ingredients#${ingredientAnchor(ingredientSlug)}`;

// Ingredients used by home-region dishes, with the dishes that use them.
export function homeIngredients(data: PairData) {
  const usedIn = new Map<string, Dish[]>();
  for (const dish of data.dishes.filter((d) => d.region === data.pair.home)) {
    const slugs = new Set([...dish.keyIngredients, ...(dish.recipe?.ingredients.map((i) => i.ingredient) ?? [])]);
    for (const slug of slugs) usedIn.set(slug, [...(usedIn.get(slug) ?? []), dish]);
  }
  return data.ingredients
    .filter((i) => usedIn.has(i.slug))
    .map((ingredient) => ({ ingredient, usedIn: usedIn.get(ingredient.slug)! }));
}

// "Usually" only: a dish shouldn't pass the supermarket filter on a lucky find.
const soldInSupermarket = (data: PairData, ingredientSlug: string) =>
  findIngredient(data, ingredientSlug)?.availability.some((a) => {
    const store = data.stores.find((s) => s.slug === a.store);
    return store?.kind !== "asia-market" && a.likelihood === "usually";
  }) ?? false;

export function facetsFor(data: PairData, dish: Dish): DishFacets {
  const required = dish.recipe?.ingredients.filter((i) => !i.optional) ?? [];
  return {
    costPerServingEur: dish.costPerServingEur,
    timeMin: dish.timeMin,
    equipment: dish.equipment,
    diet: dish.diet,
    supermarketOnly: required.every(
      ({ ingredient }) =>
        soldInSupermarket(data, ingredient) ||
        substitutionsFor(data, ingredient, dish.slug).some((s) => soldInSupermarket(data, s.substitute)),
    ),
  };
}

export const storesHref = (lang: string, pair: string) => `/${lang}/${pair}/stores`;

// What a store is good for, derived from ingredient availability.
export function storeSummary(data: PairData, storeSlug: string) {
  const stockedHere = (ingredientSlug: string, likelihood: "usually" | "sometimes") =>
    findIngredient(data, ingredientSlug)?.availability.some(
      (a) => a.store === storeSlug && a.likelihood === likelihood,
    ) ?? false;

  const usually = data.ingredients.filter((i) => stockedHere(i.slug, "usually"));
  const sometimes = data.ingredients.filter((i) => stockedHere(i.slug, "sometimes"));
  const onlyHere = data.ingredients.filter(
    (i) => i.availability.length > 0 && i.availability.every((a) => a.store === storeSlug),
  );

  // Recipes where every required ingredient (or a swap for it) is usually stocked here.
  const oneTripDishes = data.dishes.filter(
    (dish) =>
      dish.recipe &&
      dish.recipe.ingredients
        .filter((i) => !i.optional)
        .every(
          ({ ingredient }) =>
            stockedHere(ingredient, "usually") ||
            substitutionsFor(data, ingredient, dish.slug).some((s) => stockedHere(s.substitute, "usually")),
        ),
  );

  return { usually, sometimes, onlyHere, oneTripDishes };
}
