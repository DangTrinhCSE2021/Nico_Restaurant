import Link from "next/link";
import { notFound } from "next/navigation";
import { getPair, listPairs } from "@/data/pair";
import { storeAnchor } from "@/domain/anchors";
import { t } from "@/domain/localize";
import { routes } from "@/domain/routes";
import type { Ingredient } from "@/domain/schema";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

const ASIA_MARKT_MAPS_URL = "https://www.google.com/maps/search/Asia+Markt";

export function generateStaticParams() {
  return listPairs().map((pair) => ({ pair }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[pair]/stores">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.stores.title, description: dict.stores.description };
}

export default async function StoresPage({ params }: PageProps<"/[lang]/[pair]/stores">) {
  const { lang, pair } = await params;
  const data = getPair(pair);
  if (!hasLocale(lang) || !data) notFound();
  const dict = await getDictionary(lang);
  const inGuide = new Set(data.guideEntries.map((e) => e.ingredient.slug));
  const stores = [...data.stores].sort((a, b) => a.priceLevel - b.priceLevel || a.name.localeCompare(b.name));

  // Ingredient chip: links into the substitution guide when the ingredient is listed there.
  const chip = (ingredient: Ingredient, storeSlug: string, locale: Locale) => {
    const hint = ingredient.availability.find((a) => a.store === storeSlug)?.productHint;
    const label = (
      <>
        {t(ingredient.name, locale)}
        {hint && (
          <span lang="de" className="text-muted">
            {" "}
            · {hint}
          </span>
        )}
      </>
    );
    return (
      <li key={ingredient.slug} className="rounded-full border border-border bg-background px-2 py-0.5 text-xs">
        {inGuide.has(ingredient.slug) ? (
          <Link href={routes.ingredients(locale, pair, ingredient.slug)} className="hover:underline">
            {label}
          </Link>
        ) : (
          label
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6 pt-6">
      <header>
        <h1 className="text-2xl font-bold">{dict.stores.title}</h1>
        <p className="mt-1 text-muted">{dict.stores.description}</p>
      </header>

      <ul className="flex flex-col gap-4">
        {stores.map((store) => {
          const summary = data.storeSummary(store);
          return (
            <li key={store.slug} id={storeAnchor(store.slug)} className="scroll-mt-4">
              <article className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-bold">{store.name}</h2>
                  <p className="text-sm text-muted">
                    {dict.stores.kinds[store.kind]} ·{" "}
                    {/* aria-label on a plain span is often ignored, so screen readers get hidden text instead. */}
                    <span className="sr-only">{dict.stores.priceLevels[store.priceLevel - 1]}</span>
                    <span aria-hidden="true">
                      <span className="font-medium text-foreground">{"€".repeat(store.priceLevel)}</span>
                      {"€".repeat(3 - store.priceLevel)}
                    </span>
                  </p>
                </div>
                <p className="mt-2">{t(store.notes, lang)}</p>

                {summary.onlyHere.length > 0 && (
                  <section className="mt-4">
                    <h3 className="text-sm font-bold text-accent">{dict.stores.onlyHere}</h3>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {summary.onlyHere.map((i) => chip(i, store.slug, lang))}
                    </ul>
                  </section>
                )}

                {summary.oneTripDishes.length > 0 && (
                  <section className="mt-4">
                    <h3 className="text-sm font-bold text-primary">{dict.stores.oneTrip}</h3>
                    <p className="text-xs text-muted">{dict.stores.oneTripHint}</p>
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      {summary.oneTripDishes.map((dish) => (
                        <li key={dish.slug}>
                          <Link href={routes.dish(lang, pair, dish.slug)} className="underline underline-offset-2">
                            {t(dish.name, lang)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    {dict.stores.usually.replace("{count}", String(summary.usually.length))}
                  </summary>
                  <ul className="mt-2 flex flex-wrap gap-1.5">{summary.usually.map((i) => chip(i, store.slug, lang))}</ul>
                  {summary.sometimes.length > 0 && (
                    <>
                      <p className="mt-3 text-xs font-medium text-muted">{dict.stores.sometimes}</p>
                      <ul className="mt-1 flex flex-wrap gap-1.5">
                        {summary.sometimes.map((i) => chip(i, store.slug, lang))}
                      </ul>
                    </>
                  )}
                </details>

                {store.kind === "asia-market" && (
                  <a
                    href={ASIA_MARKT_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    {dict.stores.findAsiaMarkt} ↗
                  </a>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted">{dict.stores.disclaimer}</p>
    </div>
  );
}
