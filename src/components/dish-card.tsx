import Link from "next/link";
import { t } from "@/domain/localize";
import type { Dish } from "@/domain/schema";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type Props = {
  dish: Dish;
  href: string;
  lang: Locale;
  dict: Dictionary;
  badge?: string;
  footnote?: string;
  draft?: boolean;
};

export function DishCard({ dish, href, lang, dict, badge, footnote, draft }: Props) {
  return (
    <Link href={href} className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2 className="text-lg font-bold">{t(dish.name, lang)}</h2>
        {/* Always show the German name so it can be found in shops and restaurants. */}
        {dish.name.de && dish.name.de !== t(dish.name, lang) && (
          <span lang="de" className="text-sm text-muted">
            {dish.name.de}
          </span>
        )}
      </div>
      {badge && (
        <p className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          {badge}
        </p>
      )}
      <p className="mt-2 text-sm">{footnote ?? t(dish.description, lang)}</p>
      <p className="mt-3 text-xs text-muted">
        {dish.timeMin} {dict.dish.minutes} · ~€{dish.costPerServingEur.toFixed(2)} {dict.dish.perServing}
        {draft && <span className="ml-2 text-accent">· {dict.dish.draft}</span>}
      </p>
    </Link>
  );
}
