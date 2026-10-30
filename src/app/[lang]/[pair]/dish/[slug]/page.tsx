import Link from "next/link";
import { notFound } from "next/navigation";
import { listPairs, loadPair } from "@/data/load";
import { dishHref, findDish, findIngredient, guideHref, linksFor, storesHref, substitutionsFor } from "@/data/queries";
import { t } from "@/domain/localize";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { FlavorBars } from "@/components/flavor-bars";
import { IngredientRow } from "@/components/ingredient-row";

export function generateStaticParams() {
  return listPairs().flatMap((pair) =>
    loadPair(pair).dishes.map((dish) => ({ pair, slug: dish.slug })),
  );
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[pair]/dish/[slug]">) {
  const { lang, pair, slug } = await params;
  if (!hasLocale(lang) || !listPairs().includes(pair)) return {};
  const dish = findDish(loadPair(pair), slug);
  return dish ? { title: t(dish.name, lang), description: t(dish.description, lang) } : {};
}

export default async function DishPage({ params }: PageProps<"/[lang]/[pair]/dish/[slug]">) {
  const { lang, pair, slug } = await params;
  if (!hasLocale(lang) || !listPairs().includes(pair)) notFound();
  const data = loadPair(pair);
  const dish = findDish(data, slug);
  if (!dish) notFound();
  const dict = await getDictionary(lang);

  const isHomeDish = dish.region === data.pair.home;
  const backHref = `/${lang}/${pair}/${isHomeDish ? "home-cooking" : "familiar"}`;
  const links = linksFor(data, dish.slug);
  const draft = dish.reviewStatus === "draft";

  return (
    <article className="flex flex-col gap-8 pt-6">
      <div>
        <Link href={backHref} className="text-sm text-muted hover:underline">
          ← {dict.dish.back}
        </Link>
        <h1 className="mt-3 text-3xl font-bold">{t(dish.name, lang)}</h1>
        {dish.name.de && dish.name.de !== t(dish.name, lang) && (
          <p lang="de" className="text-muted">
            {dish.name.de}
          </p>
        )}
        <p className="mt-3">{t(dish.description, lang)}</p>
        <p className="mt-3 text-sm text-muted">
          {dish.timeMin} {dict.dish.minutes} · ~€{dish.costPerServingEur.toFixed(2)} {dict.dish.perServing} ·{" "}
          {dict.dish.equipment}: {dish.equipment.map((e) => dict.equipment[e]).join(", ")}
        </p>
        {draft && <p className="mt-1 text-sm text-accent">{dict.dish.draft}</p>}
      </div>

      {links.length > 0 && (
        <section className="rounded-2xl border border-primary bg-card p-5">
          <h2 className="text-lg font-bold text-primary">{dict.dish.whyFamiliar}</h2>
          <ul className="mt-3 flex flex-col gap-4">
            {links.map((link) => {
              const otherSlug = link.homeDish === dish.slug ? link.localDish : link.homeDish;
              const other = findDish(data, otherSlug)!;
              return (
                <li key={otherSlug}>
                  <Link href={dishHref(lang, pair, otherSlug)} className="font-medium underline-offset-4 hover:underline">
                    {dict.dish.tastesLike} {t(other.name, lang)}
                  </Link>
                  <p className="mt-1 text-sm">{t(link.explanation, lang)}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">{dict.dish.flavor}</h2>
        <FlavorBars flavor={dish.flavor} dict={dict} />
      </section>

      {dish.recipe && (
        <>
          <section>
            <h2 className="text-lg font-bold">
              {dict.dish.ingredients}{" "}
              <span className="text-sm font-normal text-muted">
                ({dish.recipe.servings} {dict.dish.servings})
              </span>
            </h2>
            <ul className="mt-2">
              {dish.recipe.ingredients.map((item) => {
                const ingredient = findIngredient(data, item.ingredient)!;
                const swaps = substitutionsFor(data, item.ingredient, dish.slug).map((substitution) => ({
                  substitution,
                  substitute: findIngredient(data, substitution.substitute)!,
                }));
                return (
                  <IngredientRow
                    key={item.ingredient}
                    ingredient={ingredient}
                    amount={item.amount}
                    optional={item.optional}
                    stores={data.stores}
                    guideHref={guideHref(lang, pair, item.ingredient)}
                    storesHref={storesHref(lang, pair)}
                    swaps={swaps}
                    lang={lang}
                    dict={dict}
                  />
                );
              })}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">{dict.dish.steps}</h2>
            <ol className="mt-3 flex flex-col gap-4">
              {dish.recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="pt-1">{t(step, lang)}</p>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </article>
  );
}
