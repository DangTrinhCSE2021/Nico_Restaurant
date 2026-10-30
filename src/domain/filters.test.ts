import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  allFilterOptions,
  availableFilterOptions,
  emptyFilters,
  matchesFilters,
  parseFilters,
  serializeFilters,
  type DishFacets,
  type FilterOptions,
  type Filters,
} from "./filters";

const params = (query: string) => new URLSearchParams(query);
const filters = (f: Partial<Filters>): Filters => ({ ...emptyFilters, ...f });
const dish = (f: Partial<DishFacets> = {}): DishFacets => ({
  costPerServingEur: 3,
  timeMin: 30,
  equipment: ["stove"],
  diet: [],
  supermarketOnly: false,
  ...f,
});

describe("parseFilters", () => {
  it("returns empty filters for an empty query", () => {
    expect(parseFilters(params(""))).toEqual(emptyFilters);
  });

  it("parses every known filter", () => {
    expect(
      parseFilters(params("budget=lt2&time=30&kitchen=no-oven,one-pot&diet=vegetarian,no-beef&supermarket=1")),
    ).toEqual({
      budget: "lt2",
      time: "30",
      kitchen: ["no-oven", "one-pot"],
      diet: ["vegetarian", "no-beef"],
      supermarket: true,
    });
  });

  it("ignores unknown values instead of failing", () => {
    expect(parseFilters(params("budget=cheap&time=5&kitchen=grill&diet=vegan&supermarket=yes"))).toEqual(emptyFilters);
  });

  it("keeps known list values and drops unknown ones next to them", () => {
    const f = parseFilters(params("diet=vegan,no-pork,,keto"));
    expect(f.diet).toEqual(["no-pork"]);
  });

  it("dedupes and returns list values in option order", () => {
    const f = parseFilters(params("kitchen=one-pot,no-oven,one-pot&diet=no-beef,vegetarian,no-beef"));
    expect(f.kitchen).toEqual(["no-oven", "one-pot"]);
    expect(f.diet).toEqual(["vegetarian", "no-beef"]);
  });

  it("only accepts supermarket=1", () => {
    expect(parseFilters(params("supermarket=1")).supermarket).toBe(true);
    expect(parseFilters(params("supermarket=true")).supermarket).toBe(false);
    expect(parseFilters(params("supermarket=0")).supermarket).toBe(false);
  });

  it("only accepts values offered by the page's options", () => {
    const options: FilterOptions = {
      budget: ["lt2"],
      time: [],
      kitchen: ["one-pot"],
      diet: ["vegetarian"],
      supermarket: false,
    };
    expect(
      parseFilters(params("budget=gt4&time=15&kitchen=no-oven,one-pot&diet=no-pork,vegetarian&supermarket=1"), options),
    ).toEqual({ budget: undefined, time: undefined, kitchen: ["one-pot"], diet: ["vegetarian"], supermarket: false });
  });

  it("accepts supermarket only when the options allow it", () => {
    const allowed = { ...allFilterOptions, supermarket: true };
    const disallowed = { ...allFilterOptions, supermarket: false };
    expect(parseFilters(params("supermarket=1"), allowed).supermarket).toBe(true);
    expect(parseFilters(params("supermarket=1"), disallowed).supermarket).toBe(false);
  });
});

describe("serializeFilters", () => {
  it("returns an empty string for empty filters", () => {
    expect(serializeFilters(emptyFilters)).toBe("");
  });

  it("writes keys in a canonical order with readable commas", () => {
    const f: Filters = {
      supermarket: true,
      diet: ["no-beef", "vegetarian"],
      kitchen: ["one-pot", "no-oven"],
      time: "15",
      budget: "gt4",
    };
    expect(serializeFilters(f)).toBe(
      "budget=gt4&time=15&kitchen=no-oven,one-pot&diet=vegetarian,no-beef&supermarket=1",
    );
  });

  it("dedupes list values", () => {
    expect(serializeFilters(filters({ diet: ["no-pork", "no-pork"] }))).toBe("diet=no-pork");
  });

  it("omits supermarket when false", () => {
    expect(serializeFilters(filters({ budget: "lt2", supermarket: false }))).toBe("budget=lt2");
  });

  it("keeps unrelated params and replaces old filter params", () => {
    const base = params("utm_source=newsletter&budget=gt4&diet=vegetarian&page=2");
    const out = new URLSearchParams(serializeFilters(filters({ time: "30" }), base));
    expect(out.get("utm_source")).toBe("newsletter");
    expect(out.get("page")).toBe("2");
    expect(out.get("time")).toBe("30");
    expect(out.has("budget")).toBe(false);
    expect(out.has("diet")).toBe(false);
  });

  it("returns only unrelated params when clearing all filters", () => {
    expect(serializeFilters(emptyFilters, params("utm_source=x&kitchen=one-pot"))).toBe("utm_source=x");
  });

  it("does not mutate the base params", () => {
    const base = params("budget=gt4");
    serializeFilters(filters({ budget: "lt2" }), base);
    expect(base.toString()).toBe("budget=gt4");
  });
});

describe("parse/serialize round trip", () => {
  const samples: Filters[] = [
    emptyFilters,
    filters({ budget: "2to4" }),
    filters({ time: "60", kitchen: ["one-pot"] }),
    { budget: "lt2", time: "15", kitchen: ["no-oven", "one-pot"], diet: ["vegetarian", "no-pork", "no-beef"], supermarket: true },
  ];

  it.each(samples)("parse(serialize(f)) equals f for %j", (f) => {
    expect(parseFilters(params(serializeFilters(f)))).toEqual(f);
  });

  it("gives one canonical URL for messy input", () => {
    const messy = "diet=no-beef,vegetarian,no-beef&kitchen=one-pot,no-oven&supermarket=1&budget=lt2&junk=1";
    const once = serializeFilters(parseFilters(params(messy)));
    expect(once).toBe("budget=lt2&kitchen=no-oven,one-pot&diet=vegetarian,no-beef&supermarket=1");
    expect(serializeFilters(parseFilters(params(once)))).toBe(once);
  });
});

describe("activeFilterCount", () => {
  it("is 0 for empty filters", () => {
    expect(activeFilterCount(emptyFilters)).toBe(0);
  });

  it("counts each list value and each single filter", () => {
    expect(
      activeFilterCount({ budget: "lt2", time: "15", kitchen: ["no-oven", "one-pot"], diet: ["vegetarian"], supermarket: true }),
    ).toBe(6);
  });
});

describe("matchesFilters", () => {
  it("matches everything with empty filters", () => {
    expect(matchesFilters(dish(), emptyFilters)).toBe(true);
  });

  it.each([
    [1.99, "lt2", true],
    [2, "lt2", false],
    [2, "2to4", true],
    [4, "2to4", true],
    [4.01, "2to4", false],
    [1.99, "2to4", false],
    [4, "gt4", false],
    [4.01, "gt4", true],
  ] as const)("cost %d with budget %s -> %s", (cost, budget, expected) => {
    expect(matchesFilters(dish({ costPerServingEur: cost }), filters({ budget }))).toBe(expected);
  });

  it.each([
    [15, "15", true],
    [16, "15", false],
    [30, "30", true],
    [31, "30", false],
    [60, "60", true],
    [61, "60", false],
    [10, "60", true],
  ] as const)("time %d min with limit %s -> %s", (timeMin, time, expected) => {
    expect(matchesFilters(dish({ timeMin }), filters({ time }))).toBe(expected);
  });

  it("no-oven hides dishes that need an oven", () => {
    const f = filters({ kitchen: ["no-oven"] });
    expect(matchesFilters(dish({ equipment: ["oven", "stove"] }), f)).toBe(false);
    expect(matchesFilters(dish({ equipment: ["stove"] }), f)).toBe(true);
    expect(matchesFilters(dish({ equipment: [] }), f)).toBe(true);
  });

  it("one-pot keeps only one-pot dishes", () => {
    const f = filters({ kitchen: ["one-pot"] });
    expect(matchesFilters(dish({ equipment: ["one-pot", "stove"] }), f)).toBe(true);
    expect(matchesFilters(dish({ equipment: ["stove"] }), f)).toBe(false);
  });

  it("requires both kitchen constraints together", () => {
    const f = filters({ kitchen: ["no-oven", "one-pot"] });
    expect(matchesFilters(dish({ equipment: ["one-pot"] }), f)).toBe(true);
    expect(matchesFilters(dish({ equipment: ["one-pot", "oven"] }), f)).toBe(false);
  });

  it("requires every selected diet (subset)", () => {
    const d = dish({ diet: ["no-pork", "no-beef"] });
    expect(matchesFilters(d, filters({ diet: ["no-pork"] }))).toBe(true);
    expect(matchesFilters(d, filters({ diet: ["no-pork", "no-beef"] }))).toBe(true);
    expect(matchesFilters(d, filters({ diet: ["no-pork", "vegetarian"] }))).toBe(false);
  });

  it("supermarket keeps only supermarket-only dishes", () => {
    const f = filters({ supermarket: true });
    expect(matchesFilters(dish({ supermarketOnly: true }), f)).toBe(true);
    expect(matchesFilters(dish({ supermarketOnly: false }), f)).toBe(false);
  });

  it("combines filters with AND", () => {
    const d = dish({ costPerServingEur: 1.5, timeMin: 20 });
    expect(matchesFilters(d, filters({ budget: "lt2", time: "30" }))).toBe(true);
    expect(matchesFilters(d, filters({ budget: "lt2", time: "15" }))).toBe(false);
  });
});

describe("availableFilterOptions", () => {
  it("returns no options for no dishes", () => {
    expect(availableFilterOptions([], true)).toEqual({ budget: [], time: [], kitchen: [], diet: [], supermarket: false });
  });

  it("hides options that match no dish", () => {
    const dishes = [
      dish({ costPerServingEur: 1.5, timeMin: 45, equipment: ["oven"], diet: ["vegetarian"] }),
      dish({ costPerServingEur: 3, timeMin: 50, equipment: ["oven"], diet: ["vegetarian", "no-pork"] }),
    ];
    expect(availableFilterOptions(dishes, true)).toEqual({
      budget: ["lt2", "2to4"],
      time: ["60"],
      kitchen: [],
      diet: ["vegetarian", "no-pork"],
      supermarket: false,
    });
  });

  it("offers supermarket only when allowed and some dish qualifies", () => {
    const dishes = [dish({ supermarketOnly: true })];
    expect(availableFilterOptions(dishes, true).supermarket).toBe(true);
    expect(availableFilterOptions(dishes, false).supermarket).toBe(false);
    expect(availableFilterOptions([dish({ supermarketOnly: false })], true).supermarket).toBe(false);
  });

  it("keeps options in canonical order", () => {
    const dishes = [
      dish({ timeMin: 10, equipment: ["one-pot"], costPerServingEur: 5 }),
      dish({ timeMin: 25, costPerServingEur: 1 }),
    ];
    const options = availableFilterOptions(dishes, false);
    expect(options.budget).toEqual(["lt2", "gt4"]);
    expect(options.time).toEqual(["15", "30", "60"]);
    expect(options.kitchen).toEqual(["no-oven", "one-pot"]);
  });
});
