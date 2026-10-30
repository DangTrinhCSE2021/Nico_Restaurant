import { notFound } from "next/navigation";
import { shoppingData } from "@/data/model";
import { getPair, listPairs } from "@/data/pair";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ShoppingListView } from "@/components/shopping-ui";

export function generateStaticParams() {
  return listPairs().map((pair) => ({ pair }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[pair]/shopping-list">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).shopping.title, robots: { index: false } };
}

export default async function ShoppingListPage({ params }: PageProps<"/[lang]/[pair]/shopping-list">) {
  const { lang, pair } = await params;
  const data = getPair(pair);
  if (!hasLocale(lang) || !data) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-col gap-6 pt-6">
      <header>
        <h1 className="text-2xl font-bold">{dict.shopping.title}</h1>
        <p className="mt-1 text-muted">{dict.shopping.description}</p>
      </header>
      <ShoppingListView data={shoppingData(data, lang)} labels={dict.shopping} lang={lang} pair={pair} />
    </div>
  );
}
