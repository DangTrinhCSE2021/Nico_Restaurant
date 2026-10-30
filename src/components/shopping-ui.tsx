"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { routes } from "@/domain/routes";
import { buildList, listToText, type ShopData } from "@/domain/shopping";
import type { Locale } from "@/i18n/config";
import { toggleIn, updateShopping, useShopping } from "@/lib/shopping-store";

export type ShoppingLabels = {
  title: string;
  add: string;
  added: string;
  viewList: string;
  headerLabel: string;
  preferredStore: string;
  noPreference: string;
  dishesInList: string;
  remove: string;
  progress: string;
  optional: string;
  unknownStore: string;
  share: string;
  copied: string;
  clearChecked: string;
  clearAll: string;
  empty: string;
  emptyCta: string;
  shareTitle: string;
};

export function AddToListButton({ dish, listHref, labels }: { dish: string; listHref: string; labels: ShoppingLabels }) {
  const { dishes } = useShopping();
  const inList = dishes.includes(dish);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-pressed={inList}
        onClick={() => updateShopping((s) => ({ ...s, dishes: toggleIn(s.dishes, dish) }))}
        className={`min-h-11 rounded-full px-5 text-sm font-medium transition ${
          inList ? "border border-primary text-primary" : "bg-primary text-primary-foreground"
        }`}
      >
        {inList ? `✓ ${labels.added}` : `🛒 ${labels.add}`}
      </button>
      {inList && (
        <Link href={listHref} className="text-sm underline underline-offset-4">
          {labels.viewList} →
        </Link>
      )}
    </div>
  );
}

export function ShoppingHeaderLink({ href, label }: { href: string; label: string }) {
  const { dishes } = useShopping();
  return (
    <Link
      href={href}
      aria-label={`${label} (${dishes.length})`}
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center text-lg"
    >
      🛒
      {dishes.length > 0 && (
        <span className="absolute right-0 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-white">
          {dishes.length}
        </span>
      )}
    </Link>
  );
}

type ViewProps = { data: ShopData; labels: ShoppingLabels; lang: Locale; pair: string };

export function ShoppingListView({ data, labels, lang, pair }: ViewProps) {
  const state = useShopping();
  const [copied, setCopied] = useState(false);
  // Ignore dishes that no longer exist in the data (e.g. renamed slugs).
  const dishes = data.dishes.filter((d) => state.dishes.includes(d.slug));
  const groups = buildList(data, state.dishes, state.preferred);
  const allItems = groups.flatMap((g) => g.items);
  const done = allItems.filter((i) => state.checked.includes(i.ingredient.slug)).length;
  const supermarkets = data.stores.filter((s) => s.kind !== "asia-market");

  if (dishes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-muted">{labels.empty}</p>
        <Link href={routes.homeCooking(lang, pair)} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
          {labels.emptyCta}
        </Link>
      </div>
    );
  }

  const share = async () => {
    const text = listToText(groups, state.checked, labels.shareTitle, labels.unknownStore);
    try {
      if (navigator.share) {
        await navigator.share({ title: labels.shareTitle, text });
        return;
      }
    } catch (error) {
      // User closed the share sheet: nothing to do.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the list is still on screen.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-label={labels.dishesInList}>
        <h2 className="mb-2 text-sm font-medium text-muted">{labels.dishesInList}</h2>
        <ul className="flex flex-wrap gap-2">
          {dishes.map((dish) => (
            <li key={dish.slug} className="flex items-center rounded-full border border-border bg-card pl-3 text-sm">
              <Link href={routes.dish(lang, pair, dish.slug)} className="hover:underline">
                {dish.name}
              </Link>
              <button
                type="button"
                aria-label={`${labels.remove}: ${dish.name}`}
                onClick={() => updateShopping((s) => ({ ...s, dishes: s.dishes.filter((d) => d !== dish.slug) }))}
                className="min-h-9 min-w-9 text-muted hover:text-accent"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section role="group" aria-label={labels.preferredStore} className="flex items-center gap-3">
        <span className="shrink-0 text-sm font-medium text-muted">{labels.preferredStore}</span>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[{ slug: undefined, name: labels.noPreference }, ...supermarkets].map((store) => {
            const pressed = state.preferred === store.slug;
            return (
              <button
                key={store.slug ?? "none"}
                type="button"
                aria-pressed={pressed}
                onClick={() => updateShopping((s) => ({ ...s, preferred: store.slug }))}
                className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-sm ${
                  pressed ? "border-primary bg-primary font-medium text-primary-foreground" : "border-border bg-card hover:border-primary"
                }`}
              >
                {store.name}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted" aria-live="polite">
          {labels.progress.replace("{done}", String(done)).replace("{total}", String(allItems.length))}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={share} className="min-h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">
            {copied ? `✓ ${labels.copied}` : `↗ ${labels.share}`}
          </button>
          {done > 0 && (
            <button
              type="button"
              onClick={() => updateShopping((s) => ({ ...s, checked: [] }))}
              className="min-h-11 rounded-full border border-border px-4 text-sm"
            >
              {labels.clearChecked}
            </button>
          )}
          <button
            type="button"
            onClick={() => updateShopping((s) => ({ ...s, dishes: [], checked: [] }))}
            className="min-h-11 rounded-full border border-border px-4 text-sm text-muted"
          >
            {labels.clearAll}
          </button>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.store?.slug ?? "unknown"} aria-labelledby={`shop-${group.store?.slug ?? "unknown"}`}>
          <h2 id={`shop-${group.store?.slug ?? "unknown"}`} className="mb-2 text-lg font-bold">
            {group.store?.name ?? labels.unknownStore}
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {group.items.map((item) => {
              const checked = state.checked.includes(item.ingredient.slug);
              const id = `item-${item.ingredient.slug}`;
              return (
                <li key={item.ingredient.slug}>
                  <label htmlFor={id} className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2">
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        updateShopping((s) => ({ ...s, checked: toggleIn(s.checked, item.ingredient.slug) }))
                      }
                      className="h-5 w-5 shrink-0 accent-[var(--primary)]"
                    />
                    {item.ingredient.image ? (
                      <Image src={item.ingredient.image} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-lg border border-border" />
                    )}
                    <span className={`min-w-0 flex-1 ${checked ? "text-muted line-through" : ""}`}>
                      <span lang="de" className="font-medium">
                        {item.ingredient.de}
                      </span>{" "}
                      <span className="text-sm text-muted">({item.ingredient.name})</span>
                      {item.optional && <span className="ml-1 text-xs text-muted">· {labels.optional}</span>}
                      <span className="block text-xs text-muted">
                        {item.uses.map((u) => `${u.amount} · ${u.dish}`).join(" + ")}
                        {item.productHint && <span lang="de"> · {item.productHint}</span>}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
