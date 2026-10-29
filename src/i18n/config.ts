export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "vi";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// Picks the first supported language from an Accept-Language header.
export function matchLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const preferred = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return preferred.find((p) => hasLocale(p.lang))?.lang as Locale ?? defaultLocale;
}
