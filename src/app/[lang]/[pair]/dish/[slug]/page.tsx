import Link from "next/link";
import { notFound } from "next/navigation";
import { allPairs, getPair } from "@/data/pair";
import { t } from "@/domain/localize";
import { routes } from "@/domain/routes";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { BackLink } from "@/components/back-link";
import { FlavorBars } from "@/components/flavor-bars";
import { IngredientRow } from "@/components/ingredient-row";

export function generateStaticParams() {
  return allPairs().flatMap((pair) => pair.dishes.map((dish) => ({ pair: pair.slug, slug: dish.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[pair]/dish/[slug]">) {
  const { lang, pair, slug } = await params;
  const dish = getPair(pair)?.dishBySlug.get(slug);
  if (!hasLocale(lang)) return {};
  return dish ? { title: t(dish.name, lang), description: t(dish.description, lang) } : {};
}

export default async function DishPage({ params }: PageProps<"/[lang]/[pair]/dish/[slug]">) {
  const { lang, pair, slug } = await params;
  const data = getPair(pair);
  const dish = data?.dishBySlug.get(slug);
  if (!hasLocale(lang) || !data || !dish) notFound();
  const dict = await getDictionary(lang);

  const isHomeDish = dish.region === data.pair.home;
  const backHref = isHomeDish ? routes.homeCooking(lang, pair) : routes.familiar(lang, pair);
  const links = data.linksFor(dish.slug);
  const draft = dish.reviewStatus === "draft";

  return (
    <article className="flex flex-col gap-8 pt-6">
      <div>
        <BackLink href={backHref} className="text-sm text-muted hover:underline">
          ← {dict.dish.back}
        </BackLink>
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
            {links.map(({ link, home, local }) => {
              const other = home.slug === dish.slug ? local : home;
              return (
                <li key={other.slug}>
                  <Link href={routes.dish(lang, pair, other.slug)} className="font-medium underline-offset-4 hover:underline">
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
                const ingredient = data.ingredientBySlug.get(item.ingredient);
                if (!ingredient) return null;
                // No dish label here: on its own dish page a dish-only swap needs no "only for".
                const swaps = data.swapsFor(item.ingredient, dish.slug).map(({ substitution, substitute }) => ({
                  substitution,
                  substitute,
                }));
                return (
                  <IngredientRow
                    key={item.ingredient}
                    ingredient={ingredient}
                    amount={item.amount}
                    optional={item.optional}
                    stores={data.storeBySlug}
                    pair={pair}
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
