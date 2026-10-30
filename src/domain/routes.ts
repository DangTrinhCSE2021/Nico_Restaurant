// Every URL in the site, so a route change is one edit. Client-safe: no data loading here.
import { hasLocale, type Locale } from "@/i18n/config";
import { ingredientAnchor, storeAnchor } from "./anchors";

const hash = (id: string | undefined) => (id ? `#${id}` : "");

export const routes = {
  home: (lang: Locale) => `/${lang}`,
  credits: (lang: Locale) => `/${lang}/credits`,
  familiar: (lang: Locale, pair: string) => `/${lang}/${pair}/familiar`,
  homeCooking: (lang: Locale, pair: string) => `/${lang}/${pair}/home-cooking`,
  dish: (lang: Locale, pair: string, slug: string) => `/${lang}/${pair}/dish/${slug}`,
  shoppingList: (lang: Locale, pair: string) => `/${lang}/${pair}/shopping-list`,
  // With an ingredient/store slug, jumps to its card on the page.
  ingredients: (lang: Locale, pair: string, ingredient?: string) =>
    `/${lang}/${pair}/ingredients${hash(ingredient && ingredientAnchor(ingredient))}`,
  stores: (lang: Locale, pair: string, store?: string) =>
    `/${lang}/${pair}/stores${hash(store && storeAnchor(store))}`,
};

// The same page in another language: "/vi/vn-de/stores" -> "/en/vn-de/stores".
export function withLocale(pathname: string, lang: Locale): string {
  const [, first = "", ...rest] = pathname.split("/");
  const path = hasLocale(first) ? rest : [first, ...rest];
  return ["", lang, ...path].join("/").replace(/\/$/, "");
}
