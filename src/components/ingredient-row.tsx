import { t } from "@/domain/localize";
import type { Ingredient, Store, Substitution } from "@/domain/schema";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type Props = {
  ingredient: Ingredient;
  amount: string;
  optional: boolean;
  stores: Store[];
  swaps: { substitution: Substitution; substitute: Ingredient }[];
  lang: Locale;
  dict: Dictionary;
};

export function IngredientRow({ ingredient, amount, optional, stores, swaps, lang, dict }: Props) {
  const storeName = (slug: string) => stores.find((s) => s.slug === slug)?.name ?? slug;

  return (
    <li className="border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p>
          <span className="font-medium">{t(ingredient.name, lang)}</span>{" "}
          <span lang="de" className="text-sm text-muted">
            ({ingredient.name.de})
          </span>
          {optional && <span className="ml-1 text-xs text-muted">· {dict.dish.optional}</span>}
        </p>
        <span className="text-sm text-muted">{amount}</span>
      </div>

      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={dict.dish.whereToBuy}>
        {ingredient.availability.length === 0 && (
          <li className="text-xs text-muted">{dict.dish.notFoundHere}</li>
        )}
        {ingredient.availability.map((a) => (
          <li
            key={a.store}
            title={a.productHint}
            className={`rounded-full border px-2 py-0.5 text-xs ${
              a.likelihood === "usually" ? "border-primary text-primary" : "border-border text-muted"
            }`}
          >
            {storeName(a.store)} · {dict.likelihood[a.likelihood]}
            {a.productHint && <span lang="de"> · {a.productHint}</span>}
          </li>
        ))}
      </ul>

      {swaps.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-accent">{dict.dish.swap}…</summary>
          <ul className="mt-2 flex flex-col gap-2 rounded-xl bg-background p-3">
            {swaps.map(({ substitution, substitute }) => (
              <li key={substitute.slug}>
                <p className="font-medium">
                  {t(substitute.name, lang)}{" "}
                  <span lang="de" className="font-normal text-muted">
                    ({substitute.name.de})
                  </span>
                </p>
                <p className="text-xs text-muted">
                  {dict.dish.fidelity}: {substitution.fidelity}/5
                </p>
                <p className="mt-1">{t(substitution.notes, lang)}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
