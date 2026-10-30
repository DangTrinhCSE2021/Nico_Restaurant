"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  activeFilterCount,
  budgetOptions,
  dietOptions,
  kitchenOptions,
  matchesFilters,
  parseFilters,
  serializeFilters,
  timeOptions,
  type DishFacets,
  type Filters,
} from "@/domain/filters";
import type { Dictionary } from "@/i18n/dictionaries";

export type ListItem = { key: string; facets: DishFacets; card: ReactNode };

type Props = {
  items: ListItem[];
  labels: Dictionary["filters"];
  showSupermarketFilter: boolean;
};

export function FilteredDishList({ items, labels, showSupermarketFilter }: Props) {
  const pathname = usePathname();
  const filters = parseFilters(new URLSearchParams(useSearchParams().toString()));
  const visible = items.filter((item) => matchesFilters(item.facets, filters));
  const active = activeFilterCount(filters);

  // Next.js syncs useSearchParams with the native History API, so no server round trip.
  const update = (next: Filters) => {
    const query = serializeFilters(next);
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  };

  const toggleOne = <K extends "budget" | "time">(key: K, value: Filters[K]) =>
    update({ ...filters, [key]: filters[key] === value ? undefined : value });

  const toggleMany = <K extends "kitchen" | "diet">(key: K, value: Filters[K][number]) => {
    const current = filters[key] as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ ...filters, [key]: next });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <ChipGroup label={labels.budget}>
          {budgetOptions.map((o) => (
            <Chip key={o} pressed={filters.budget === o} onClick={() => toggleOne("budget", o)}>
              {labels.budgetOptions[o]}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup label={labels.time}>
          {timeOptions.map((o) => (
            <Chip key={o} pressed={filters.time === o} onClick={() => toggleOne("time", o)}>
              {labels.timeOptions[o]}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup label={labels.kitchen}>
          {kitchenOptions.map((o) => (
            <Chip key={o} pressed={filters.kitchen.includes(o)} onClick={() => toggleMany("kitchen", o)}>
              {labels.kitchenOptions[o]}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup label={labels.diet}>
          {dietOptions.map((o) => (
            <Chip key={o} pressed={filters.diet.includes(o)} onClick={() => toggleMany("diet", o)}>
              {labels.dietOptions[o]}
            </Chip>
          ))}
        </ChipGroup>
        {showSupermarketFilter && (
          <ChipGroup label={labels.shopping}>
            <Chip pressed={filters.supermarket} onClick={() => update({ ...filters, supermarket: !filters.supermarket })}>
              {labels.supermarketOnly}
            </Chip>
          </ChipGroup>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted" aria-live="polite">
        <span>{labels.count.replace("{count}", String(visible.length))}</span>
        {active > 0 && (
          <button
            type="button"
            onClick={() => update({ kitchen: [], diet: [], supermarket: false })}
            className="min-h-11 px-2 underline underline-offset-4"
          >
            {labels.clear} ({active})
          </button>
        )}
      </div>

      {visible.length > 0 ? (
        <DishList items={visible} />
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted">{labels.empty}</p>
      )}
    </div>
  );
}

export function DishList({ items }: { items: ListItem[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.key}>{item.card}</li>
      ))}
    </ul>
  );
}

function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-medium text-muted">{label}</span>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{children}</div>
    </div>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        pressed
          ? "border-primary bg-primary font-medium text-primary-foreground"
          : "border-border bg-background hover:border-primary"
      }`}
    >
      {pressed && <span aria-hidden="true">✓ </span>}
      {children}
    </button>
  );
}
