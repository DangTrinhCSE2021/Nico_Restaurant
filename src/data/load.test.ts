import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { stringify } from "yaml";
import { listPairs, loadPair } from "./load";

describe("real seed", () => {
  it("lists vn-de as a pair", () => {
    expect(listPairs()).toContain("vn-de");
  });

  it("loads and validates vn-de", () => {
    const data = loadPair("vn-de");
    expect(data.pair).toEqual({ slug: "vn-de", home: "VN", host: "DE" });
    expect(data.dishes.length).toBeGreaterThan(0);
    expect(data.ingredients.length).toBeGreaterThan(0);
  });

  it("applies schema defaults", () => {
    const data = loadPair("vn-de");
    for (const i of data.ingredients) expect(Array.isArray(i.aliases)).toBe(true);
    for (const d of data.dishes) expect(Array.isArray(d.diet)).toBe(true);
  });

  it("fails clearly for a pair folder that does not exist", () => {
    expect(() => loadPair("xx-yy")).toThrow(/ENOENT/);
  });
});

// checkReferences is private, so these go through loadPair against a temp seed dir.
// SEED_DIR is derived from process.cwd() at import time: stub cwd, then import a fresh copy.
describe("reference checks (temp seed dir)", () => {
  let root: string;
  let load: typeof import("./load");

  const provenance = { source: "curated", reviewStatus: "draft" };
  const flavor = { sweet: 0, sour: 0, salty: 0, umami: 0, spicy: 0, herbal: 0 };
  const dish = (slug: string, region: string, extra: object = {}) => ({
    slug,
    region,
    name: { vi: slug },
    description: { vi: slug },
    dishType: "soup",
    methods: ["simmer"],
    flavor,
    keyIngredients: [],
    timeMin: 30,
    costPerServingEur: 3,
    equipment: ["stove"],
    ...provenance,
    ...extra,
  });
  const recipe = (...ingredients: string[]) => ({
    recipe: { servings: 2, ingredients: ingredients.map((i) => ({ ingredient: i, amount: "1" })), steps: [{ vi: "nấu" }] },
  });

  type Seed = Record<"pair" | "stores" | "ingredients" | "dishes" | "links" | "substitutions", unknown>;
  const validSeed = (): Seed => ({
    pair: { slug: "PAIR", home: "VN", host: "DE" },
    stores: [{ slug: "rewe", name: "Rewe", kind: "supermarket", priceLevel: 2, notes: { vi: "x" } }],
    ingredients: [
      { slug: "onion", name: { vi: "Hành", de: "Zwiebel" }, category: "vegetable", availability: [{ store: "rewe", likelihood: "usually" }] },
      { slug: "shallot", name: { vi: "Hành tím", de: "Schalotte" }, category: "vegetable", availability: [] },
    ],
    dishes: [dish("pho", "VN", { keyIngredients: ["onion"], ...recipe("shallot") }), dish("suppe", "DE")],
    links: [{ homeDish: "pho", localDish: "suppe", explanation: { vi: "x" }, ...provenance }],
    substitutions: [{ original: "shallot", substitute: "onion", fidelity: 3, notes: { vi: "x" }, ...provenance }],
  });

  let counter = 0;
  // Writes the seed into its own pair folder and returns the folder name.
  const writeSeed = (edit: (seed: Seed) => void = () => {}, folder = `pair-${counter++}`) => {
    const seed = validSeed();
    (seed.pair as { slug: string }).slug = folder;
    edit(seed);
    const dir = path.join(root, "content", "seed", folder);
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, value] of Object.entries(seed)) fs.writeFileSync(path.join(dir, `${name}.yaml`), stringify(value));
    return folder;
  };
  const errorsOf = (folder: string) => {
    try {
      load.loadPair(folder);
    } catch (e) {
      return (e as Error).message;
    }
    return "";
  };

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "nho-nha-seed-"));
    fs.mkdirSync(path.join(root, "content", "seed"), { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.resetModules();
    load = await import("./load");
  });

  afterAll(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("loads a valid seed", () => {
    const folder = writeSeed();
    expect(load.loadPair(folder).dishes.map((d) => d.slug)).toEqual(["pho", "suppe"]);
    expect(load.listPairs()).toContain(folder);
  });

  it("prefixes errors with the pair name, one per line", () => {
    const folder = writeSeed((s) => {
      (s.ingredients as { availability: { store: string }[] }[])[0].availability[0].store = "aldi";
      (s.dishes as { keyIngredients: string[] }[])[0].keyIngredients.push("ghost");
    });
    expect(errorsOf(folder)).toBe(
      `Invalid seed data in ${folder}:\n- ingredient "onion" uses unknown store "aldi"\n- dish "pho" uses unknown ingredient "ghost"`,
    );
  });

  it("rejects a pair.yaml slug that differs from the folder", () => {
    const folder = writeSeed((s) => ((s.pair as { slug: string }).slug = "other"));
    expect(errorsOf(folder)).toContain(`pair.yaml slug "other" must match folder "${folder}"`);
  });

  it("reports only the region clash when home equals host", () => {
    const folder = writeSeed((s) => ((s.pair as { host: string }).host = "VN"));
    const message = errorsOf(folder);
    expect(message).toContain('pair home and host are both "VN"');
    expect(message).not.toContain("link");
  });

  it("reports duplicate slugs and links", () => {
    const folder = writeSeed((s) => {
      (s.stores as unknown[]).push((s.stores as unknown[])[0]);
      (s.ingredients as unknown[]).push((s.ingredients as unknown[])[1]);
      (s.dishes as unknown[]).push((s.dishes as unknown[])[1]);
      (s.links as unknown[]).push((s.links as unknown[])[0]);
    });
    const message = errorsOf(folder);
    expect(message).toContain('duplicate store slug "rewe"');
    expect(message).toContain('duplicate ingredient slug "shallot"');
    expect(message).toContain('duplicate dish slug "suppe"');
    expect(message).toContain('duplicate link "pho/suppe"');
  });

  it("reports unknown recipe ingredients", () => {
    const folder = writeSeed((s) => Object.assign((s.dishes as object[])[0], recipe("shallot", "lemongrass")));
    expect(errorsOf(folder)).toContain('recipe "pho" uses unknown ingredient "lemongrass"');
  });

  it("reports a missing ingredient image", () => {
    const folder = writeSeed((s) =>
      Object.assign((s.ingredients as object[])[0], {
        image: { file: "/images/ingredients/missing.jpg", credit: "x", license: "CC0" },
      }),
    );
    expect(errorsOf(folder)).toContain('ingredient "onion" image not found: public/images/ingredients/missing.jpg');
  });

  it("reports links to unknown dishes or dishes from the wrong region", () => {
    const unknown = writeSeed((s) => ((s.links as { localDish: string }[])[0].localDish = "ghost"));
    expect(errorsOf(unknown)).toContain('link localDish uses unknown dish "ghost"');

    const swapped = writeSeed((s) => {
      const [l] = s.links as { homeDish: string; localDish: string }[];
      [l.homeDish, l.localDish] = [l.localDish, l.homeDish];
    });
    const message = errorsOf(swapped);
    expect(message).toContain('link homeDish "suppe" is not a VN dish');
    expect(message).toContain('link localDish "pho" is not a DE dish');
  });

  it("reports host-region dishes that no link points to", () => {
    const folder = writeSeed((s) => (s.dishes as unknown[]).push(dish("eintopf", "DE")));
    expect(errorsOf(folder)).toContain('DE dish "eintopf" has no link, so no page lists it');
  });

  it("reports bad substitutions", () => {
    const folder = writeSeed((s) =>
      (s.substitutions as unknown[]).push(
        { original: "ghost", substitute: "onion", fidelity: 2, notes: { vi: "x" }, ...provenance },
        { original: "onion", substitute: "onion", fidelity: 2, notes: { vi: "x" }, ...provenance },
        { original: "shallot", substitute: "onion", dish: "nope", fidelity: 2, notes: { vi: "x" }, ...provenance },
        { original: "onion", substitute: "shallot", dish: "suppe", fidelity: 2, notes: { vi: "x" }, ...provenance },
      ),
    );
    const message = errorsOf(folder);
    expect(message).toContain('substitution "ghost" -> "onion" uses unknown ingredient "ghost"');
    expect(message).toContain('substitution "onion" -> "onion" swaps an ingredient for itself');
    expect(message).toContain('substitution "shallot" -> "onion" uses unknown dish "nope"');
    expect(message).toContain(`substitution "onion" -> "shallot" is for dish "suppe", which doesn't use "onion"`);
  });

  it("accepts a dish-specific substitution for an ingredient the dish uses via keyIngredients or recipe", () => {
    const folder = writeSeed((s) =>
      (s.substitutions as unknown[]).push(
        { original: "onion", substitute: "shallot", dish: "pho", fidelity: 2, notes: { vi: "x" }, ...provenance },
        { original: "shallot", substitute: "onion", dish: "pho", fidelity: 4, notes: { vi: "x" }, ...provenance },
      ),
    );
    expect(errorsOf(folder)).toBe("");
  });

  it("rejects schema violations such as unknown keys (strict objects)", () => {
    const folder = writeSeed((s) => Object.assign((s.stores as object[])[0], { nmae: "typo" }));
    expect(() => load.loadPair(folder)).toThrow(/nmae/);
  });
});
