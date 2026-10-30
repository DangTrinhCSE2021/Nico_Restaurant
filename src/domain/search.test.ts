import { describe, expect, it } from "vitest";
import { matchesQuery, normalize } from "./search";

describe("normalize", () => {
  it("lowercases and strips Vietnamese diacritics", () => {
    expect(normalize("Nước Mắm")).toBe("nuoc mam");
    expect(normalize("Hành tây")).toBe("hanh tay");
  });

  it("maps đ/Đ to d", () => {
    expect(normalize("Đậu phụ")).toBe("dau phu");
    expect(normalize("bánh đa")).toBe("banh da");
  });

  it("handles already-decomposed input", () => {
    expect(normalize("sả")).toBe("sa");
  });
});

describe("matchesQuery", () => {
  it("is accent-insensitive for an unaccented query", () => {
    expect(matchesQuery("nuoc mam", "Nước mắm")).toBe(true);
    expect(matchesQuery("NUOC", "Nước mắm")).toBe(true);
  });

  it("is accent-sensitive when the query has accents", () => {
    expect(matchesQuery("sả", "Fish sauce")).toBe(false);
    expect(matchesQuery("sả", "Sả cây")).toBe(true);
    expect(matchesQuery("mắm", "Nước mắm")).toBe(true);
    expect(matchesQuery("mám", "Nước mắm")).toBe(false);
  });

  it("matches a decomposed (NFD) query against precomposed (NFC) data", () => {
    const nfdQuery = "sả".normalize("NFD");
    expect(nfdQuery).not.toBe("sả");
    expect(matchesQuery(nfdQuery, "Sả")).toBe(true);
    expect(matchesQuery(nfdQuery, "sauce")).toBe(false);
  });

  it("matches a precomposed query against decomposed data", () => {
    expect(matchesQuery("sả", "Sả".normalize("NFD"))).toBe(true);
  });

  it("matches short terms only at word starts", () => {
    expect(matchesQuery("hanh", "Chanh")).toBe(false);
    expect(matchesQuery("hanh", "Hành tây")).toBe(true);
    expect(matchesQuery("tay", "Hành tây")).toBe(true);
  });

  it("matches terms of 5+ characters inside German compounds", () => {
    expect(matchesQuery("sauce", "Fischsauce")).toBe(true);
    expect(matchesQuery("nudel", "Reisbandnudeln")).toBe(true);
    // 4 characters is still word-start only.
    expect(matchesQuery("isch", "Fischsauce")).toBe(false);
  });

  it("requires every term to match (AND)", () => {
    expect(matchesQuery("nuoc mam", "Nước mắm Fischsauce")).toBe(true);
    expect(matchesQuery("nuoc tuong", "Nước mắm")).toBe(false);
  });

  it("splits text on punctuation and hyphens", () => {
    expect(matchesQuery("basil", "Thai-Basilikum")).toBe(true);
    expect(matchesQuery("asia", "Reisnudeln (Asia-Regal)")).toBe(true);
    expect(matchesQuery("regal", "Gewürze/Regal")).toBe(true);
  });

  it("treats đ as d", () => {
    expect(matchesQuery("dau", "Đậu phụ")).toBe(true);
    expect(matchesQuery("đậu", "Đậu phụ")).toBe(true);
  });

  it("matches everything for an empty or whitespace query", () => {
    expect(matchesQuery("", "anything")).toBe(true);
    expect(matchesQuery("   ", "anything")).toBe(true);
  });

  it("does not match a non-empty query against empty text", () => {
    expect(matchesQuery("pho", "")).toBe(false);
  });
});
