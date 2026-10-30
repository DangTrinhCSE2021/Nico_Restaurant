import { describe, expect, it } from "vitest";
import { buildList, pickStore, type ShopData, type ShopIngredient, type ShopStore } from "./shopping";
import { isSupermarketKind } from "./vocab";

const store = (slug: string, kind: string, priceLevel = 1): ShopStore => ({ slug, name: slug, kind, priceLevel });
const stores = [
  store("lidl", "discounter", 1),
  store("rewe", "supermarket", 2),
  store("asia", "asia-market", 2),
  store("web", "online", 1),
];

const ingredient = (slug: string, availability: ShopIngredient["availability"]): ShopIngredient => ({
  slug,
  name: slug,
  de: slug,
  availability,
});

describe("isSupermarketKind", () => {
  it("counts supermarkets and discounters only", () => {
    expect(["supermarket", "discounter", "asia-market", "online"].filter(isSupermarketKind)).toEqual([
      "supermarket",
      "discounter",
    ]);
  });
});

describe("pickStore", () => {
  it("prefers the chosen supermarket, then the cheapest supermarket", () => {
    const i = ingredient("eggs", [
      { store: "rewe", likelihood: "usually" },
      { store: "lidl", likelihood: "usually" },
    ]);
    expect(pickStore(i, stores)?.slug).toBe("lidl");
    expect(pickStore(i, stores, "rewe")?.slug).toBe("rewe");
  });

  it("puts the Asia-Markt before online shops", () => {
    const i = ingredient("fish-sauce", [
      { store: "web", likelihood: "usually" },
      { store: "asia", likelihood: "usually" },
    ]);
    expect(pickStore(i, stores)?.slug).toBe("asia");
  });

  it("uses an online shop when nothing else has it", () => {
    const i = ingredient("rare-herb", [{ store: "web", likelihood: "usually" }]);
    expect(pickStore(i, stores)?.slug).toBe("web");
  });

  it("only falls back to 'sometimes' when no store usually has it", () => {
    const i = ingredient("shallot", [
      { store: "lidl", likelihood: "sometimes" },
      { store: "asia", likelihood: "usually" },
    ]);
    expect(pickStore(i, stores)?.slug).toBe("asia");
  });

  it("returns null for an ingredient no store sells", () => {
    expect(pickStore(ingredient("x", []), stores)).toBeNull();
  });
});

describe("buildList", () => {
  const data: ShopData = {
    stores,
    ingredients: [
      ingredient("eggs", [{ store: "lidl", likelihood: "usually" }]),
      ingredient("fish-sauce", [{ store: "asia", likelihood: "usually" }]),
      ingredient("rare-herb", [{ store: "web", likelihood: "usually" }]),
      ingredient("mystery", []),
      ingredient("basil", [{ store: "rewe", likelihood: "usually" }]),
    ],
    dishes: [
      {
        slug: "a",
        name: "A",
        ingredients: [
          { ingredient: "mystery", amount: "1", optional: false },
          { ingredient: "rare-herb", amount: "1", optional: false },
          { ingredient: "fish-sauce", amount: "1 tbsp", optional: false },
          { ingredient: "eggs", amount: "2", optional: false },
        ],
      },
      {
        slug: "b",
        name: "B",
        ingredients: [
          { ingredient: "eggs", amount: "3", optional: false },
          { ingredient: "basil", amount: "1 bunch", optional: true },
        ],
      },
    ],
  };

  it("groups by store: supermarkets, then Asia-Markt, then online, unknown last", () => {
    const groups = buildList(data, ["a", "b"]);
    expect(groups.map((g) => g.store?.slug ?? null)).toEqual(["lidl", "rewe", "asia", "web", null]);
  });

  it("puts the preferred supermarket first", () => {
    const groups = buildList(data, ["a", "b"], "rewe");
    expect(groups[0].store?.slug).toBe("rewe");
  });

  it("merges an ingredient used by several dishes", () => {
    const eggs = buildList(data, ["a", "b"]).flatMap((g) => g.items).find((i) => i.ingredient.slug === "eggs");
    expect(eggs?.uses.map((u) => u.amount)).toEqual(["2", "3"]);
    expect(eggs?.optional).toBe(false);
  });

  it("marks an item optional only when every use is optional", () => {
    const basil = buildList(data, ["b"]).flatMap((g) => g.items).find((i) => i.ingredient.slug === "basil");
    expect(basil?.optional).toBe(true);
  });

  it("ignores dishes that aren't in the data", () => {
    expect(buildList(data, ["gone"])).toEqual([]);
  });
});
