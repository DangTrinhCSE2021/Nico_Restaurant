import { notFound } from "next/navigation";
import { getPair, listPairs } from "@/data/pair";
import { t } from "@/domain/localize";
import { routes } from "@/domain/routes";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { DishCard } from "@/components/dish-card";
import { FilteredDishList, type ListItem } from "@/components/filtered-dish-list";

export function generateStaticParams() {
  return listPairs().map((pair) => ({ pair }));
}

export default async function FamiliarPage({ params }: PageProps<"/[lang]/[pair]/familiar">) {
  const { lang, pair } = await params;
  const data = getPair(pair);
  if (!hasLocale(lang) || !data) notFound();
  const dict = await getDictionary(lang);

  const items: ListItem[] = data.links.map(({ link, home, local }) => {
    return {
      // "/" can't appear in a slug, so ("a-b", "c") and ("a", "b-c") get different keys.
      key: `${home.slug}/${local.slug}`,
      facets: data.facetsFor(local),
      card: (
        <DishCard
          dish={local}
          href={routes.dish(lang, pair, local.slug)}
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
      <FilteredDishList items={items} labels={dict.filters} showSupermarketFilter={false} />
    </div>
  );
}
