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
