import { notFound } from "next/navigation";
import { allPairs } from "@/data/pair";
import { t } from "@/domain/localize";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { IngredientImage } from "@/components/ingredient-image";

export async function generateMetadata({ params }: PageProps<"/[lang]/credits">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).credits.title };
}

// Attribution for every photo, as the CC BY / CC BY-SA licenses require.
export default async function CreditsPage({ params }: PageProps<"/[lang]/credits">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const seen = new Set<string>();
  const credited = allPairs()
    .flatMap((pair) => pair.ingredients)
    .flatMap((ingredient) => {
      const { image } = ingredient;
      return image && !seen.has(image.file) && seen.add(image.file) ? [{ ingredient, image }] : [];
    });

  return (
    <div className="flex flex-col gap-6 pt-6">
      <header>
        <h1 className="text-2xl font-bold">{dict.credits.title}</h1>
        <p className="mt-1 text-muted">{dict.credits.intro}</p>
      </header>
      <ul className="flex flex-col gap-3">
        {credited.map(({ ingredient, image }) => {
          return (
            <li key={image.file} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-sm">
              <IngredientImage ingredient={ingredient} size={48} />
              <div className="min-w-0">
                <p className="font-medium">{t(ingredient.name, lang)}</p>
                <p className="text-muted">
                  {image.credit} ·{" "}
                  {image.licenseUrl ? (
                    <a href={image.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline underline-offset-2">
                      {image.license}
                    </a>
                  ) : (
                    image.license
                  )}
                  {image.source && (
                    <>
                      {" · "}
                      <a href={image.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                        {dict.credits.source}
                      </a>
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
