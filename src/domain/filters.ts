// Filter state for the dish list pages. Pure and client-safe: no data loading here.
import { diets, type Diet, type Equipment } from "./vocab";

export type DishFacets = {
  costPerServingEur: number;
  timeMin: number;
  equipment: Equipment[];
  diet: Diet[];
  // Every required recipe ingredient is usually stocked by a supermarket or discounter,
  // or has a close enough swap (see MIN_SWAP_FIDELITY in src/data/model.ts) that is.
  supermarketOnly: boolean;
};

export const budgetOptions = ["lt2", "2to4", "gt4"] as const;
export const timeOptions = ["15", "30", "60"] as const;
// Derived from `equipment`: "no-oven" hides dishes that need an oven, "one-pot" keeps one-pot dishes.
export const kitchenOptions = ["no-oven", "one-pot"] as const;
export const dietOptions = diets;

type Budget = (typeof budgetOptions)[number];
type Time = (typeof timeOptions)[number];
type Kitchen = (typeof kitchenOptions)[number];

export type Filters = {
  budget?: Budget;
  time?: Time;
  kitchen: Kitchen[];
  diet: Diet[];
  supermarket: boolean;
};

// The chips a page actually shows. Values outside these are ignored when parsing,
// so a URL can't turn on a filter the user has no visible chip for.
export type FilterOptions = {
  budget: readonly Budget[];
  time: readonly Time[];
  kitchen: readonly Kitchen[];
  diet: readonly Diet[];
  supermarket: boolean;
};

export const allFilterOptions: FilterOptions = {
  budget: budgetOptions,
  time: timeOptions,
  kitchen: kitchenOptions,
  diet: dietOptions,
  supermarket: true,
};

export const emptyFilters: Filters = { kitchen: [], diet: [], supermarket: false };

const FILTER_KEYS = ["budget", "time", "kitchen", "diet", "supermarket"] as const;

const pick = <T extends string>(options: readonly T[], value: string | null) =>
  options.find((o) => o === value);

// Returned in option order and deduped, so the same selection always has one URL.
const pickAll = <T extends string>(options: readonly T[], value: string | null) => {
  const values = value?.split(",") ?? [];
  return options.filter((o) => values.includes(o));
};

// Unknown values are ignored, so hand-edited or stale URLs never break the page.
export function parseFilters(params: URLSearchParams, options: FilterOptions = allFilterOptions): Filters {
  return {
    budget: pick(options.budget, params.get("budget")),
    time: pick(options.time, params.get("time")),
    kitchen: pickAll(options.kitchen, params.get("kitchen")),
    diet: pickAll(options.diet, params.get("diet")),
    supermarket: options.supermarket && params.get("supermarket") === "1",
  };
}

// Replaces only the filter keys in `base`, so unrelated params (utm_*, etc.) survive.
export function serializeFilters(filters: Filters, base?: URLSearchParams): string {
  const params = new URLSearchParams(base);
  for (const key of FILTER_KEYS) params.delete(key);
  const inOrder = <T extends string>(options: readonly T[], values: T[]) =>
    options.filter((o) => values.includes(o)).join(",");
  if (filters.budget) params.set("budget", filters.budget);
  if (filters.time) params.set("time", filters.time);
  if (filters.kitchen.length) params.set("kitchen", inOrder(kitchenOptions, filters.kitchen));
  if (filters.diet.length) params.set("diet", inOrder(dietOptions, filters.diet));
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

// Options that match at least one dish on their own; a chip that always empties the list is noise.
export function availableFilterOptions(dishes: DishFacets[], allowSupermarket: boolean): FilterOptions {
  const matchesAny = (f: Partial<Filters>) => dishes.some((d) => matchesFilters(d, { ...emptyFilters, ...f }));
  return {
    budget: budgetOptions.filter((budget) => matchesAny({ budget })),
    time: timeOptions.filter((time) => matchesAny({ time })),
    kitchen: kitchenOptions.filter((k) => matchesAny({ kitchen: [k] })),
    diet: dietOptions.filter((d) => matchesAny({ diet: [d] })),
    supermarket: allowSupermarket && matchesAny({ supermarket: true }),
  };
}
