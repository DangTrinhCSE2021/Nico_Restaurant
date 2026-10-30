import { describe, expect, it } from "vitest";
import type { Dish, Ingredient, Store, Substitution } from "@/domain/schema";
import type { StoreKind } from "@/domain/vocab";
import { loadPair, type PairData } from "./load";
import { buildModel, MIN_SWAP_FIDELITY } from "./model";

// --- Fixture builders -------------------------------------------------------

const store = (slug: string, kind: StoreKind): Store => ({ slug, name: slug, kind, priceLevel: 1, notes: { vi: slug } });

type Stock = Record<string, Ingredient["availability"][number]["likelihood"]>;
const ingredient = (slug: string, stock: Stock = {}): Ingredient => ({
  slug,
  name: { vi: slug, de: slug },
  aliases: [],
  category: "other",
  availability: Object.entries(stock).map(([s, likelihood]) => ({ store: s, likelihood })),
});

const dish = (slug: string, recipe?: (string | [string, "optional"])[], region: "VN" | "DE" = "VN"): Dish => ({
  slug,
  region,
  name: { vi: slug },
  description: { vi: slug },
  dishType: "soup",
  methods: ["simmer"],
  flavor: { sweet: 0, sour: 0, salty: 0, umami: 0, spicy: 0, herbal: 0 },
  keyIngredients: [],
  timeMin: 30,
  costPerServingEur: 3,
  equipment: ["stove"],
  diet: [],
  recipe: recipe && {
    servings: 2,
    ingredients: recipe.map((r) =>
      typeof r === "string"
        ? { ingredient: r, amount: "1", optional: false }
        : { ingredient: r[0], amount: "1", optional: true },
    ),
    steps: [{ vi: "nấu" }],
  },
  source: "curated",
  reviewStatus: "draft",
});

const swap = (original: string, substitute: string, fidelity: number, dishSlug?: string): Substitution => ({
  original,
  substitute,
  fidelity,
  ...(dishSlug ? { dish: dishSlug } : {}),
  notes: { vi: "" },
  source: "curated",
  reviewStatus: "draft",
});

const data = (parts: Partial<PairData>): PairData => ({
  pair: { slug: "vn-de", home: "VN", host: "DE" },
  stores: [],
  ingredients: [],
  dishes: [],
  links: [],
  substitutions: [],
  ...parts,
});

const stores = [
  store("lidl", "discounter"),
  store("rewe", "supermarket"),
  store("asia", "asia-market"),
  store("web", "online"),
];

const slugs = (items: { slug: string }[]) => items.map((i) => i.slug);

// --- Supermarket rule -------------------------------------------------------

describe("facetsFor().supermarketOnly", () => {
  const supermarketOnly = (ingredients: Ingredient[], d: Dish, substitutions: Substitution[] = []) => {
    const model = buildModel(data({ stores, ingredients, dishes: [d], substitutions }));
    return model.facetsFor(d).supermarketOnly;
  };

  it("counts an ingredient usually stocked at a supermarket or a discounter", () => {
    expect(supermarketOnly([ingredient("x", { rewe: "usually" })], dish("d", ["x"]))).toBe(true);
    expect(supermarketOnly([ingredient("x", { lidl: "usually" })], dish("d", ["x"]))).toBe(true);
  });

  it("does not count 'sometimes', 'seasonal' or 'rare' supermarket stock", () => {
    for (const likelihood of ["sometimes", "seasonal", "rare"] as const) {
      expect(supermarketOnly([ingredient("x", { rewe: likelihood })], dish("d", ["x"]))).toBe(false);
    }
  });

  it("does not count Asia-Märkte or online shops", () => {
    expect(supermarketOnly([ingredient("x", { asia: "usually" })], dish("d", ["x"]))).toBe(false);
    expect(supermarketOnly([ingredient("x", { web: "usually" })], dish("d", ["x"]))).toBe(false);
  });

  it("needs every required ingredient, but ignores optional ones", () => {
    const ings = [ingredient("a", { rewe: "usually" }), ingredient("b", { asia: "usually" })];
    expect(supermarketOnly(ings, dish("d", ["a", "b"]))).toBe(false);
    expect(supermarketOnly(ings, dish("d", ["a", ["b", "optional"]]))).toBe(true);
  });

  it("passes a dish without a recipe trivially", () => {
    expect(supermarketOnly([], dish("d"))).toBe(true);
  });

  it(`counts a swap only with fidelity >= MIN_SWAP_FIDELITY (${MIN_SWAP_FIDELITY})`, () => {
    const ings = [ingredient("herb", { asia: "usually" }), ingredient("alt", { rewe: "usually" })];
    const d = dish("d", ["herb"]);
    expect(supermarketOnly(ings, d, [swap("herb", "alt", MIN_SWAP_FIDELITY)])).toBe(true);
    expect(supermarketOnly(ings, d, [swap("herb", "alt", MIN_SWAP_FIDELITY - 1)])).toBe(false);
  });

  it("does not count a close swap that is itself only at an Asia-Markt or online", () => {
    const ings = [ingredient("herb", { asia: "usually" }), ingredient("alt", { web: "usually", asia: "usually" })];
    expect(supermarketOnly(ings, dish("d", ["herb"]), [swap("herb", "alt", 5)])).toBe(false);
  });

  it("does not count a swap whose substitute is only sometimes at a supermarket", () => {
    const ings = [ingredient("herb", { asia: "usually" }), ingredient("alt", { rewe: "sometimes" })];
    expect(supermarketOnly(ings, dish("d", ["herb"]), [swap("herb", "alt", 5)])).toBe(false);
  });

  it("applies a dish-specific swap only to that dish", () => {
    const ings = [ingredient("herb", { asia: "usually" }), ingredient("alt", { rewe: "usually" })];
    const forD = dish("d", ["herb"]);
    const other = dish("other", ["herb"]);
    const model = buildModel(
      data({ stores, ingredients: ings, dishes: [forD, other], substitutions: [swap("herb", "alt", 4, "d")] }),
    );
    expect(model.facetsFor(forD).supermarketOnly).toBe(true);
    expect(model.facetsFor(other).supermarketOnly).toBe(false);
  });

  it("copies the dish's cost, time, equipment and diet into the facets", () => {
    const d = { ...dish("d"), costPerServingEur: 1.5, timeMin: 20, equipment: ["oven" as const], diet: ["vegetarian" as const] };
    expect(buildModel(data({ stores, dishes: [d] })).facetsFor(d)).toEqual({
      costPerServingEur: 1.5,
      timeMin: 20,
      equipment: ["oven"],
      diet: ["vegetarian"],
      supermarketOnly: true,
    });
  });

  it("throws for a dish that is not in the model", () => {
    const model = buildModel(data({ stores }));
    expect(() => model.facetsFor(dish("ghost"))).toThrow('unknown dish "ghost"');
  });
});

// --- swapsFor ---------------------------------------------------------------

describe("swapsFor", () => {
  const ings = ["chili", "general-lo", "general-hi", "for-a", "for-b"].map((s) => ingredient(s));
  const model = buildModel(
    data({
      stores,
      ingredients: ings,
      dishes: [dish("a", ["chili"]), dish("b", ["chili"]), dish("c", ["chili"])],
      substitutions: [
        swap("chili", "general-lo", 2),
        swap("chili", "for-a", 1, "a"),
        swap("chili", "general-hi", 5),
        swap("chili", "for-b", 4, "b"),
      ],
    }),
  );
  const subs = (dishSlug?: string) => model.swapsFor("chili", dishSlug).map((s) => s.substitute.slug);

  it("lists every swap by fidelity when no dish is given", () => {
    expect(subs()).toEqual(["general-hi", "for-b", "general-lo", "for-a"]);
  });

  it("puts dish-specific swaps first, then general ones by fidelity", () => {
    expect(subs("a")).toEqual(["for-a", "general-hi", "general-lo"]);
    expect(subs("b")).toEqual(["for-b", "general-hi", "general-lo"]);
  });

  it("leaves out swaps scoped to other dishes", () => {
    expect(subs("c")).toEqual(["general-hi", "general-lo"]);
  });

  it("resolves the scoped dish on dish-specific swaps", () => {
    const [first] = model.swapsFor("chili", "a");
    expect(first.dish?.slug).toBe("a");
    expect(model.swapsFor("chili", "c").every((s) => s.dish === undefined)).toBe(true);
  });

  it("returns an empty list for an ingredient without swaps", () => {
    expect(model.swapsFor("general-hi")).toEqual([]);
    expect(model.swapsFor("nope", "a")).toEqual([]);
  });

  it("throws on a substitution that references an unknown ingredient", () => {
    expect(() => buildModel(data({ ingredients: [ingredient("x")], substitutions: [swap("x", "ghost", 3)] }))).toThrow(
      'unknown ingredient "ghost"',
    );
  });
});

// --- isAsiaMarketOnly -------------------------------------------------------

describe("isAsiaMarketOnly", () => {
  const model = buildModel(data({ stores }));

  it("is true when every listed store is an Asia-Markt", () => {
    expect(model.isAsiaMarketOnly(ingredient("x", { asia: "usually" }))).toBe(true);
    expect(model.isAsiaMarketOnly(ingredient("x", { asia: "rare" }))).toBe(true);
  });

  it("is false when any other kind of store lists it, even rarely", () => {
    expect(model.isAsiaMarketOnly(ingredient("x", { asia: "usually", rewe: "rare" }))).toBe(false);
    expect(model.isAsiaMarketOnly(ingredient("x", { asia: "usually", web: "usually" }))).toBe(false);
  });

  it("is false for an ingredient with no availability", () => {
    expect(model.isAsiaMarketOnly(ingredient("x"))).toBe(false);
  });
});

// --- storeSummary -----------------------------------------------------------

describe("storeSummary", () => {
  const ings = [
    ingredient("onion", { lidl: "usually", rewe: "usually" }),
    ingredient("herb", { asia: "usually" }),
    ingredient("alt-herb", { rewe: "usually" }),
    ingredient("sauce", { rewe: "sometimes", asia: "usually" }),
    ingredient("rare-thing", { rewe: "rare" }),
  ];
  const dishes = [
    dish("only-onion", ["onion"]),
    dish("with-herb", ["onion", "herb"]),
    dish("with-sauce", ["onion", "sauce"]),
    dish("optional-sauce", ["onion", ["sauce", "optional"]]),
    dish("no-recipe"),
  ];
  const model = buildModel(
    data({ stores, ingredients: ings, dishes, substitutions: [swap("herb", "alt-herb", 3)] }),
  );
  const summary = (slug: string) => model.storeSummary(model.storeBySlug.get(slug)!);

  it("groups ingredients by how likely the store has them", () => {
    expect(slugs(summary("rewe").usually)).toEqual(["onion", "alt-herb"]);
    expect(slugs(summary("rewe").sometimes)).toEqual(["sauce"]);
  });

  it("lists ingredients that no other store has", () => {
    expect(slugs(summary("rewe").onlyHere)).toEqual(["alt-herb", "rare-thing"]);
    expect(slugs(summary("asia").onlyHere)).toEqual(["herb"]);
    expect(slugs(summary("lidl").onlyHere)).toEqual([]);
  });

  it("lists recipe dishes cookable in one trip, counting close swaps", () => {
    expect(slugs(summary("rewe").oneTripDishes)).toEqual(["only-onion", "with-herb", "optional-sauce"]);
    expect(slugs(summary("lidl").oneTripDishes)).toEqual(["only-onion", "optional-sauce"]);
  });

  it("does not combine stores for a one-trip dish", () => {
    // with-sauce needs onion (not at the Asia-Markt) and sauce (only usually at the Asia-Markt).
    expect(slugs(summary("asia").oneTripDishes)).not.toContain("with-sauce");
    expect(slugs(summary("rewe").oneTripDishes)).not.toContain("with-sauce");
  });

  it("never lists dishes without a recipe", () => {
    for (const s of stores) expect(slugs(summary(s.slug).oneTripDishes)).not.toContain("no-recipe");
  });

  it("throws for a store that is not in the model", () => {
    expect(() => model.storeSummary(store("ghost", "supermarket"))).toThrow('unknown store "ghost"');
  });
});

// --- links and guide entries ------------------------------------------------

describe("links and guide entries", () => {
  const vn = { ...dish("pho", ["noodles"]), keyIngredients: ["broth"] };
  const de = dish("suppe", undefined, "DE");
  const deWithRecipe = { ...dish("eintopf", ["potato"], "DE") };
  const link = { homeDish: "pho", localDish: "suppe", explanation: { vi: "" }, source: "curated", reviewStatus: "draft" } as const;
  const model = buildModel(
    data({
      ingredients: ["potato", "noodles", "broth", "unused"].map((s) => ingredient(s)),
      dishes: [vn, de, deWithRecipe],
      links: [link],
    }),
  );

  it("resolves links and finds them from either dish", () => {
    expect(model.linksFor("pho").map((l) => [l.home.slug, l.local.slug])).toEqual([["pho", "suppe"]]);
    expect(model.linksFor("suppe")).toHaveLength(1);
    expect(model.linksFor("eintopf")).toEqual([]);
  });

  it("lists ingredients used by home-region dishes only, in file order", () => {
    expect(model.guideEntries.map((e) => [e.ingredient.slug, slugs(e.usedIn)])).toEqual([
      ["noodles", ["pho"]],
      ["broth", ["pho"]],
    ]);
  });

  it("throws on a link to an unknown dish", () => {
    expect(() => buildModel(data({ dishes: [vn], links: [link] }))).toThrow('unknown dish "suppe"');
  });
});

// --- Real seed --------------------------------------------------------------

describe("real vn-de seed", () => {
  const model = buildModel(loadPair("vn-de"));

  it("builds a model with facets and summaries for everything", () => {
    expect(model.slug).toBe("vn-de");
    expect(model.dishes.length).toBeGreaterThan(0);
    for (const d of model.dishes) expect(typeof model.facetsFor(d).supermarketOnly).toBe("boolean");
    for (const s of model.stores) {
      const summary = model.storeSummary(s);
      for (const d of summary.oneTripDishes) expect(d.recipe).toBeDefined();
    }
  });

  it("never lists an online store's or an Asia-Markt's stock as supermarket stock", () => {
    // A one-trip dish at a regular supermarket is cookable from supermarkets, so it must pass the filter.
    for (const s of model.stores.filter((s) => s.kind === "supermarket" || s.kind === "discounter")) {
      for (const d of model.storeSummary(s).oneTripDishes) expect(model.facetsFor(d).supermarketOnly).toBe(true);
    }
  });

  it("marks Asia-Markt-only ingredients", () => {
    const thaiBasil = model.ingredientBySlug.get("thai-basil");
    const onion = model.ingredientBySlug.get("onion");
    expect(thaiBasil && model.isAsiaMarketOnly(thaiBasil)).toBe(true);
    expect(onion && model.isAsiaMarketOnly(onion)).toBe(false);
  });

  it("scopes the pho-only basil swap to pho-bo", () => {
    expect(model.swapsFor("thai-basil", "pho-bo").map((s) => s.substitute.slug)).toContain("basil");
    expect(model.swapsFor("thai-basil", "bun-cha").map((s) => s.substitute.slug)).not.toContain("basil");
  });

  it("lists only home-region dishes in guide entries", () => {
    for (const entry of model.guideEntries) {
      for (const d of entry.usedIn) expect(d.region).toBe(model.pair.home);
    }
  });
});
