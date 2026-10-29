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
