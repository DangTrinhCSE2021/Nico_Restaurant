import { notFound } from "next/navigation";
import { getPair, listPairs } from "@/data/pair";
import { routes } from "@/domain/routes";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { DishCard } from "@/components/dish-card";
import { FilteredDishList, type ListItem } from "@/components/filtered-dish-list";

export function generateStaticParams() {
  return listPairs().map((pair) => ({ pair }));
}

export default async function HomeCookingPage({ params }: PageProps<"/[lang]/[pair]/home-cooking">) {
  const { lang, pair } = await params;
  const data = getPair(pair);
  if (!hasLocale(lang) || !data) notFound();
  const dict = await getDictionary(lang);

  const items: ListItem[] = data.dishes
    .filter((d) => d.region === data.pair.home && d.recipe)
    .map((dish) => ({
      key: dish.slug,
      facets: data.facetsFor(dish),
      card: (
        <DishCard
          dish={dish}
          href={routes.dish(lang, pair, dish.slug)}
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
      <FilteredDishList items={items} labels={dict.filters} showSupermarketFilter />
    </div>
  );
}
