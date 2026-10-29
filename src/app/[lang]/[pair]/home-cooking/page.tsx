import { notFound } from "next/navigation";
import { listPairs, loadPair } from "@/data/load";
import { dishHref } from "@/data/queries";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { DishCard } from "@/components/dish-card";

export function generateStaticParams() {
  return listPairs().map((pair) => ({ pair }));
}

export default async function HomeCookingPage({ params }: PageProps<"/[lang]/[pair]/home-cooking">) {
  const { lang, pair } = await params;
  if (!hasLocale(lang) || !listPairs().includes(pair)) notFound();
  const dict = await getDictionary(lang);
  const data = loadPair(pair);
  const dishes = data.dishes.filter((d) => d.region === data.pair.home && d.recipe);

  return (
    <div className="flex flex-col gap-6 pt-6">
      <header>
        <h1 className="text-2xl font-bold">{dict.modes.homeCooking.title}</h1>
        <p className="mt-1 text-muted">{dict.modes.homeCooking.description}</p>
      </header>
      <ul className="flex flex-col gap-4">
        {dishes.map((dish) => (
          <li key={dish.slug}>
            <DishCard dish={dish} href={dishHref(lang, pair, dish.slug)} lang={lang} dict={dict} draft={dish.reviewStatus === "draft"} />
          </li>
        ))}
      </ul>
    </div>
  );
}
