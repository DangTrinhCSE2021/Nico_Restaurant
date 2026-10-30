import Link from "next/link";
import { notFound } from "next/navigation";
import { getPair, listPairs } from "@/data/pair";
import { ingredientAnchor } from "@/domain/anchors";
import { t } from "@/domain/localize";
import { routes } from "@/domain/routes";
import type { Ingredient } from "@/domain/schema";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { IngredientImage } from "@/components/ingredient-image";
import { StoreBadges, SwapList, type Swap } from "@/components/ingredient-parts";
import { IngredientSearch, type SearchGroup } from "@/components/ingredient-search";

const CATEGORY_ORDER: Ingredient["category"][] = [
  "sauce", "herb", "spice", "noodle-rice", "protein", "vegetable", "other",
];

export function generateStaticParams() {
  return listPairs().map((pair) => ({ pair }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[pair]/ingredients">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.guide.title, description: dict.guide.description };
}

export default async function IngredientsPage({ params }: PageProps<"/[lang]/[pair]/ingredients">) {
  const { lang, pair } = await params;
  const data = getPair(pair);
  if (!hasLocale(lang) || !data) notFound();
  const dict = await getDictionary(lang);

  // All swaps, labelled with the dish when they only apply to one.
  const swapsFor = (slug: string): Swap[] =>
    data.swapsFor(slug).map(({ substitution, substitute, dish }) => ({
      substitution,
      substitute,
      dishName: dish && t(dish.name, lang),
    }));

  const groups: SearchGroup[] = CATEGORY_ORDER.map((category) => ({
    key: category,
    label: dict.guide.categories[category],
    items: data.guideEntries
      .filter(({ ingredient }) => ingredient.category === category)
      // Ingredients with swaps first: those are the ones people come here for.
      .sort((a, b) => swapsFor(b.ingredient.slug).length - swapsFor(a.ingredient.slug).length)
      .map(({ ingredient, usedIn }) => {
        const swaps = swapsFor(ingredient.slug);
        return {
          key: ingredient.slug,
          anchorId: ingredientAnchor(ingredient.slug),
          searchText: [ingredient.name.vi, ingredient.name.en, ingredient.name.de, ...ingredient.aliases].join(" "),
          card: (
            <article className="rounded-2xl border border-border bg-card p-4">
              <div className="flex gap-3">
                <IngredientImage ingredient={ingredient} size={72} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h3 className="font-bold">{t(ingredient.name, lang)}</h3>
                    <span lang="de" className="text-sm text-muted">
                      {[ingredient.name.de, ...ingredient.aliases].join(" / ")}
                    </span>
                    {data.isAsiaMarketOnly(ingredient) && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                        {dict.guide.asiaOnly}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <StoreBadges ingredient={ingredient} stores={data.storeBySlug} pair={pair} lang={lang} dict={dict} />
                  </div>
                </div>
              </div>
              {swaps.length > 0 && (
                <div className="mt-3 text-sm">
                  <p className="mb-1 font-medium text-accent">{dict.dish.swap}:</p>
                  <SwapList swaps={swaps} lang={lang} dict={dict} />
                </div>
              )}
              <p className="mt-3 text-xs text-muted">
                {dict.guide.usedIn}:{" "}
                {usedIn.map((dish, i) => (
                  <span key={dish.slug}>
                    {i > 0 && ", "}
                    <Link href={routes.dish(lang, pair, dish.slug)} className="underline underline-offset-2">
                      {t(dish.name, lang)}
                    </Link>
                  </span>
                ))}
              </p>
            </article>
          ),
        };
      }),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-6 pt-6">
      <header>
        <h1 className="text-2xl font-bold">{dict.guide.title}</h1>
        <p className="mt-1 text-muted">{dict.guide.description}</p>
      </header>
      <IngredientSearch
        groups={groups}
        // Only what the client needs: the rest of the dictionary would bloat the page payload.
        labels={{
          searchLabel: dict.guide.searchLabel,
          searchPlaceholder: dict.guide.searchPlaceholder,
          count: dict.guide.count,
          noResults: dict.guide.noResults,
        }}
      />
    </div>
  );
}
