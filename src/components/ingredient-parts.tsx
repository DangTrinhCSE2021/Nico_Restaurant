import Link from "next/link";
import { storeAnchor } from "@/domain/anchors";
import { t } from "@/domain/localize";
import type { Ingredient, Store, Substitution } from "@/domain/schema";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { IngredientImage } from "./ingredient-image";

export type Swap = {
  substitution: Substitution;
  substitute: Ingredient;
  // Set when the swap only applies to one dish, e.g. "for Bún chả".
  dishName?: string;
};

type StoreBadgesProps = { ingredient: Ingredient; stores: Store[]; storesHref: string; dict: Dictionary };

export function StoreBadges({ ingredient, stores, storesHref, dict }: StoreBadgesProps) {
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
          <Link href={`${storesHref}#${storeAnchor(a.store)}`} className="hover:underline">
            {storeName(a.store)}
          </Link>{" "}
          · {dict.likelihood[a.likelihood]}
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
        <li key={`${substitute.slug}-${substitution.dish ?? "any"}`} className="flex gap-3">
          <IngredientImage ingredient={substitute} alt={t(substitute.name, lang)} size={40} />
          <div className="min-w-0">
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
          </div>
        </li>
      ))}
    </ul>
  );
}
