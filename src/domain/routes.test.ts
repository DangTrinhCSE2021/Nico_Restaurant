import { describe, expect, it } from "vitest";
import { routes, withLocale } from "./routes";

describe("routes", () => {
  it("builds page URLs", () => {
    expect(routes.home("vi")).toBe("/vi");
    expect(routes.credits("en")).toBe("/en/credits");
    expect(routes.familiar("vi", "vn-de")).toBe("/vi/vn-de/familiar");
    expect(routes.homeCooking("en", "vn-de")).toBe("/en/vn-de/home-cooking");
    expect(routes.dish("vi", "vn-de", "pho-bo")).toBe("/vi/vn-de/dish/pho-bo");
  });

  it("links to the ingredient guide, optionally at one ingredient's card", () => {
    expect(routes.ingredients("vi", "vn-de")).toBe("/vi/vn-de/ingredients");
    expect(routes.ingredients("vi", "vn-de", "fish-sauce")).toBe("/vi/vn-de/ingredients#ingredient-fish-sauce");
    expect(routes.ingredients("vi", "vn-de", "")).toBe("/vi/vn-de/ingredients");
  });

  it("links to the store guide, optionally at one store's card", () => {
    expect(routes.stores("en", "vn-de")).toBe("/en/vn-de/stores");
    expect(routes.stores("en", "vn-de", "lidl")).toBe("/en/vn-de/stores#store-lidl");
  });
});

describe("withLocale", () => {
  it("swaps the locale of a localized path", () => {
    expect(withLocale("/vi/vn-de/stores", "en")).toBe("/en/vn-de/stores");
    expect(withLocale("/en/vn-de/dish/pho-bo", "vi")).toBe("/vi/vn-de/dish/pho-bo");
  });

  it("keeps the same locale unchanged", () => {
    expect(withLocale("/vi/credits", "vi")).toBe("/vi/credits");
  });

  it("handles the locale root with and without a trailing slash", () => {
    expect(withLocale("/vi", "en")).toBe("/en");
    expect(withLocale("/vi/", "en")).toBe("/en");
    expect(withLocale("/", "en")).toBe("/en");
  });

  it("prefixes a path that has no locale", () => {
    expect(withLocale("/vn-de/stores", "en")).toBe("/en/vn-de/stores");
  });

  it("drops a trailing slash", () => {
    expect(withLocale("/vi/vn-de/stores/", "en")).toBe("/en/vn-de/stores");
  });
});
