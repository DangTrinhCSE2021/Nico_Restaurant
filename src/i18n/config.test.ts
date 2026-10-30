import { describe, expect, it } from "vitest";
import { defaultLocale, hasLocale, localeRedirectPath, matchLocale } from "./config";

describe("hasLocale", () => {
  it("accepts only supported lowercase locales", () => {
    expect(hasLocale("vi")).toBe(true);
    expect(hasLocale("en")).toBe(true);
    expect(hasLocale("EN")).toBe(false);
    expect(hasLocale("de")).toBe(false);
    expect(hasLocale("")).toBe(false);
  });
});

describe("matchLocale", () => {
  it("falls back to the default for a missing or empty header", () => {
    expect(defaultLocale).toBe("vi");
    expect(matchLocale(null)).toBe("vi");
    expect(matchLocale("")).toBe("vi");
  });

  it("picks the first supported language", () => {
    expect(matchLocale("en")).toBe("en");
    expect(matchLocale("de, en, vi")).toBe("en");
    expect(matchLocale("fr,vi,en")).toBe("vi");
  });

  it("orders by q value rather than position", () => {
    expect(matchLocale("vi;q=0.5,en;q=0.9")).toBe("en");
    expect(matchLocale("en;q=0.1,vi")).toBe("vi");
  });

  it("keeps header order between equal q values", () => {
    expect(matchLocale("en;q=0.8,vi;q=0.8")).toBe("en");
  });

  it("never picks a language with q=0", () => {
    expect(matchLocale("en;q=0")).toBe("vi");
    expect(matchLocale("vi;q=0,en;q=0.1")).toBe("en");
    expect(matchLocale("en;q=0.0, de")).toBe("vi");
  });

  it("tolerates spaces around separators", () => {
    expect(matchLocale("de , en; q=0.8")).toBe("en");
    expect(matchLocale("vi; q = 0.2, en ;q=0.9")).toBe("en");
  });

  it("matches region tags by their base language", () => {
    expect(matchLocale("en-US,de;q=0.9")).toBe("en");
    expect(matchLocale("vi-VN")).toBe("vi");
    expect(matchLocale("EN-gb")).toBe("en");
  });

  it("falls back to the default when only unsupported languages are listed", () => {
    expect(matchLocale("de-DE,fr;q=0.9,*;q=0.1")).toBe("vi");
  });

  it("treats a malformed q as 1 instead of throwing", () => {
    expect(matchLocale("vi;q=0.5,en;q=abc")).toBe("en");
  });
});

describe("localeRedirectPath", () => {
  it("redirects the root to the preferred locale", () => {
    expect(localeRedirectPath("/", null)).toBe("/vi");
    expect(localeRedirectPath("/", "en-US")).toBe("/en");
  });

  it("returns null when the path already has a locale", () => {
    expect(localeRedirectPath("/vi", null)).toBeNull();
    expect(localeRedirectPath("/vi/x", "en")).toBeNull();
    expect(localeRedirectPath("/en/vn-de/stores", null)).toBeNull();
  });

  it("lowercases a wrongly-cased locale instead of nesting it", () => {
    expect(localeRedirectPath("/VI/x", "en")).toBe("/vi/x");
    expect(localeRedirectPath("/En", null)).toBe("/en");
  });

  it("prefixes other paths with the preferred locale", () => {
    expect(localeRedirectPath("/foo", null)).toBe("/vi/foo");
    expect(localeRedirectPath("/vn-de/stores", "en")).toBe("/en/vn-de/stores");
  });

  it("does not treat a locale-like prefix as a locale", () => {
    expect(localeRedirectPath("/vietnam", "en")).toBe("/en/vietnam");
  });
});
