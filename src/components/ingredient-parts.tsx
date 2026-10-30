import { t } from "@/domain/localize";
import type { Ingredient, Store, Substitution } from "@/domain/schema";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

export type Swap = {
  substitution: Substitution;
  substitute: Ingredient;
  // Set when the swap only applies to one dish, e.g. "for Bún chả".
  dishName?: string;
};

export function StoreBadges({ ingredient, stores, dict }: { ingredient: Ingredient; stores: Store[]; dict: Dictionary }) {
  const storeName = (slug: string) => stores.find((s) => s.slug === slug)?.name ?? slug;

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={dict.dish.whereToBuy}>
      {ingredient.availability.length === 0 && <li className="text-xs text-muted">{dict.dish.notFoundHere}</li>}
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
  );
}

export function SwapList({ swaps, lang, dict }: { swaps: Swap[]; lang: Locale; dict: Dictionary }) {
  return (
    <ul className="flex flex-col gap-2 rounded-xl bg-background p-3">
      {swaps.map(({ substitution, substitute, dishName }) => (
        <li key={`${substitute.slug}-${substitution.dish ?? "any"}`}>
          <p className="font-medium">
            {t(substitute.name, lang)}{" "}
            <span lang="de" className="font-normal text-muted">
              ({substitute.name.de})
            </span>
          </p>
          <p className="text-xs text-muted">
            {dict.dish.fidelity}: {substitution.fidelity}/5
            {dishName && ` · ${dict.guide.onlyFor} ${dishName}`}
          </p>
          <p className="mt-1">{t(substitution.notes, lang)}</p>
        </li>
      ))}
    </ul>
  );
}
