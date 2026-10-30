export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "vi";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// Weight of one Accept-Language entry, e.g. "en; q=0.8". A missing or malformed
// q counts as 1 (the default), so odd headers never throw.
function qualityOf(params: string[]): number {
  for (const param of params) {
    const match = /^q\s*=\s*([0-9.]+)$/i.exec(param.trim());
    if (match) {
      const q = Number(match[1]);
      return Number.isFinite(q) ? Math.min(q, 1) : 1;
    }
  }
  return 1;
}

// Picks the first supported language from an Accept-Language header.
export function matchLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const preferred = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.split(";");
      return { lang: tag.trim().toLowerCase().split("-")[0], q: qualityOf(params) };
    })
    // q=0 means "not acceptable", so it must never be picked.
    .filter((p) => p.q > 0)
    .sort((a, b) => b.q - a.q);
  return (preferred.find((p) => hasLocale(p.lang))?.lang as Locale | undefined) ?? defaultLocale;
}

// Where a request without a valid locale prefix should go, or null if it already has one.
// "/VI/x" becomes "/vi/x" rather than "/vi/VI/x", which would 404.
export function localeRedirectPath(pathname: string, acceptLanguage: string | null): string | null {
  const [, first = "", ...rest] = pathname.split("/");
  if (hasLocale(first)) return null;
  const lowered = first.toLowerCase();
  if (hasLocale(lowered)) return ["", lowered, ...rest].join("/");
  return `/${matchLocale(acceptLanguage)}${pathname === "/" ? "" : pathname}`;
}
