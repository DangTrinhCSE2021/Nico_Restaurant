import { Suspense } from "react";
import { notFound } from "next/navigation";
import { listPairs, loadPair } from "@/data/load";
import { dishHref, facetsFor } from "@/data/queries";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { DishCard } from "@/components/dish-card";
import { DishList, FilteredDishList, type ListItem } from "@/components/filtered-dish-list";

export function generateStaticParams() {
  return listPairs().map((pair) => ({ pair }));
}

export default async function HomeCookingPage({ params }: PageProps<"/[lang]/[pair]/home-cooking">) {
  const { lang, pair } = await params;
  if (!hasLocale(lang) || !listPairs().includes(pair)) notFound();
  const dict = await getDictionary(lang);
  const data = loadPair(pair);

  const items: ListItem[] = data.dishes
    .filter((d) => d.region === data.pair.home && d.recipe)
    .map((dish) => ({
      key: dish.slug,
      facets: facetsFor(data, dish),
      card: (
        <DishCard
          dish={dish}
          href={dishHref(lang, pair, dish.slug)}
          lang={lang}
          dict={dict}
          draft={dish.reviewStatus === "draft"}
        />
      ),
    }));

  return (
    <div className="flex flex-col gap-6 pt-6">
      <header>
        <h1 className="text-2xl font-bold">{dict.modes.homeCooking.title}</h1>
        <p className="mt-1 text-muted">{dict.modes.homeCooking.description}</p>
      </header>
      {/* Filters read the URL, so they render in the browser; the full list is the static fallback. */}
      <Suspense fallback={<DishList items={items} />}>
        <FilteredDishList items={items} labels={dict.filters} showSupermarketFilter />
      </Suspense>
    </div>
  );
}
