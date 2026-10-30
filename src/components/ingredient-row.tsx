import Link from "next/link";
import { t } from "@/domain/localize";
import type { Ingredient, Store } from "@/domain/schema";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { IngredientImage } from "./ingredient-image";
import { StoreBadges, SwapList, type Swap } from "./ingredient-parts";

type Props = {
  ingredient: Ingredient;
  amount: string;
  optional: boolean;
  stores: Store[];
  swaps: Swap[];
  guideHref: string;
  storesHref: string;
  lang: Locale;
  dict: Dictionary;
};

export function IngredientRow({ ingredient, amount, optional, stores, swaps, guideHref, storesHref, lang, dict }: Props) {
  return (
    <li className="flex gap-3 border-b border-border py-3 last:border-b-0">
      <IngredientImage ingredient={ingredient} alt={t(ingredient.name, lang)} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p>
            <Link href={guideHref} className="font-medium underline-offset-4 hover:underline">
              {t(ingredient.name, lang)}
            </Link>{" "}
            <span lang="de" className="text-sm text-muted">
              ({ingredient.name.de})
            </span>
            {optional && <span className="ml-1 text-xs text-muted">· {dict.dish.optional}</span>}
          </p>
          <span className="text-sm text-muted">{amount}</span>
        </div>

        <div className="mt-2">
          <StoreBadges ingredient={ingredient} stores={stores} storesHref={storesHref} dict={dict} />
        </div>

        {swaps.length > 0 && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-accent">{dict.dish.swap}…</summary>
            <div className="mt-2">
              <SwapList swaps={swaps} lang={lang} dict={dict} />
            </div>
          </details>
        )}
      </div>
    </li>
  );
}
