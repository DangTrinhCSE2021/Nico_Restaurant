import { Suspense } from "react";
import { notFound } from "next/navigation";
import { listPairs, loadPair } from "@/data/load";
import { dishHref, facetsFor } from "@/data/queries";
import { t } from "@/domain/localize";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { DishCard } from "@/components/dish-card";
import { DishList, FilteredDishList, type ListItem } from "@/components/filtered-dish-list";

export function generateStaticParams() {
  return listPairs().map((pair) => ({ pair }));
}

export default async function FamiliarPage({ params }: PageProps<"/[lang]/[pair]/familiar">) {
  const { lang, pair } = await params;
  if (!hasLocale(lang) || !listPairs().includes(pair)) notFound();
  const dict = await getDictionary(lang);
  const data = loadPair(pair);
  const dishes = new Map(data.dishes.map((d) => [d.slug, d]));

  const items: ListItem[] = data.links.map((link) => {
    const local = dishes.get(link.localDish)!;
    const home = dishes.get(link.homeDish)!;
    return {
      // "/" can't appear in a slug, so ("a-b", "c") and ("a", "b-c") get different keys.
      key: `${link.homeDish}/${link.localDish}`,
      facets: facetsFor(data, local),
      card: (
        <DishCard
          dish={local}
          href={dishHref(lang, pair, local.slug)}
          lang={lang}
          dict={dict}
          badge={`${dict.dish.tastesLike} ${t(home.name, lang)}`}
          footnote={t(link.explanation, lang)}
          draft={link.reviewStatus === "draft"}
        />
      ),
    };
  });

  return (
    <div className="flex flex-col gap-6 pt-6">
      <header>
        <h1 className="text-2xl font-bold">{dict.modes.familiar.title}</h1>
        <p className="mt-1 text-muted">{dict.modes.familiar.description}</p>
      </header>
      {/* Filters read the URL, so they render in the browser; the full list is the static fallback. */}
      <Suspense fallback={<DishList items={items} />}>
        <FilteredDishList items={items} labels={dict.filters} showSupermarketFilter={false} />
      </Suspense>
    </div>
  );
}
