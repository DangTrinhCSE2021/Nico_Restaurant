// Filter state for the dish list pages. Pure and client-safe: no data loading here.

export type DishFacets = {
  costPerServingEur: number;
  timeMin: number;
  equipment: string[];
  diet: string[];
  // Every required recipe ingredient (or a swap for it) is sold outside an Asia-Markt.
  supermarketOnly: boolean;
};

export const budgetOptions = ["lt2", "2to4", "gt4"] as const;
export const timeOptions = ["15", "30", "60"] as const;
export const kitchenOptions = ["no-oven", "one-pot"] as const;
export const dietOptions = ["vegetarian", "no-pork", "no-beef"] as const;

export type Filters = {
  budget?: (typeof budgetOptions)[number];
  time?: (typeof timeOptions)[number];
  kitchen: (typeof kitchenOptions)[number][];
  diet: (typeof dietOptions)[number][];
  supermarket: boolean;
};

const pick = <T extends string>(options: readonly T[], value: string | null) =>
  options.find((o) => o === value);

const pickAll = <T extends string>(options: readonly T[], value: string | null) =>
  (value?.split(",") ?? []).filter((v): v is T => options.includes(v as T));

// Unknown values are ignored, so hand-edited or stale URLs never break the page.
export function parseFilters(params: URLSearchParams): Filters {
  return {
    budget: pick(budgetOptions, params.get("budget")),
    time: pick(timeOptions, params.get("time")),
    kitchen: pickAll(kitchenOptions, params.get("kitchen")),
    diet: pickAll(dietOptions, params.get("diet")),
    supermarket: params.get("supermarket") === "1",
  };
}

export function serializeFilters(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.budget) params.set("budget", filters.budget);
  if (filters.time) params.set("time", filters.time);
  if (filters.kitchen.length) params.set("kitchen", filters.kitchen.join(","));
  if (filters.diet.length) params.set("diet", filters.diet.join(","));
  if (filters.supermarket) params.set("supermarket", "1");
  // Keep list separators readable in shared links.
  return params.toString().replaceAll("%2C", ",");
}

export const activeFilterCount = (f: Filters) =>
  Number(!!f.budget) + Number(!!f.time) + f.kitchen.length + f.diet.length + Number(f.supermarket);

export function matchesFilters(dish: DishFacets, f: Filters): boolean {
  const cost = dish.costPerServingEur;
  if (f.budget === "lt2" && !(cost < 2)) return false;
  if (f.budget === "2to4" && !(cost >= 2 && cost <= 4)) return false;
  if (f.budget === "gt4" && !(cost > 4)) return false;

  if (f.time === "15" && dish.timeMin > 15) return false;
  if (f.time === "30" && dish.timeMin > 30) return false;
  if (f.time === "60" && dish.timeMin > 60) return false;

  if (f.kitchen.includes("no-oven") && dish.equipment.includes("oven")) return false;
  if (f.kitchen.includes("one-pot") && !dish.equipment.includes("one-pot")) return false;

  if (!f.diet.every((d) => dish.diet.includes(d))) return false;
  if (f.supermarket && !dish.supermarketOnly) return false;
  return true;
}
