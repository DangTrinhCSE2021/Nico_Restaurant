"use client";

import { Children, Suspense, useRef, type ReactNode, type Ref } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  activeFilterCount,
  availableFilterOptions,
  emptyFilters,
  matchesFilters,
  parseFilters,
  serializeFilters,
  type DishFacets,
  type Filters,
} from "@/domain/filters";
import type { Dictionary } from "@/i18n/dictionaries";
import { useRememberListQuery } from "./back-link";

export type ListItem = { key: string; facets: DishFacets; card: ReactNode };

type Props = {
  items: ListItem[];
  labels: Dictionary["filters"];
  showSupermarketFilter: boolean;
};

type Options = ReturnType<typeof availableFilterOptions>;

// Filters read the URL, which prerendering can't, so the static HTML shows the same panel
// with nothing selected and the chips disabled: no layout shift when the real one hydrates.
export function FilteredDishList(props: Props) {
  const options = availableFilterOptions(props.items.map((item) => item.facets), props.showSupermarketFilter);
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <FilterPanel filters={emptyFilters} options={options} labels={props.labels} />
          <CountLine count={props.items.length} labels={props.labels} />
          <DishList items={props.items} />
        </div>
      }
    >
      <InteractiveList {...props} options={options} />
    </Suspense>
  );
}

function InteractiveList({ items, labels, options }: Props & { options: Options }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const searchParams = new URLSearchParams(query);
  const filters = parseFilters(searchParams, options);
  const visible = items.filter((item) => matchesFilters(item.facets, filters));
  const active = activeFilterCount(filters);
  const panelRef = useRef<HTMLDivElement>(null);
  useRememberListQuery(pathname, query);

  // Next.js syncs useSearchParams with the native History API, so no server round trip.
  const update = (next: Filters) => {
    const nextQuery = serializeFilters(next, searchParams);
    window.history.replaceState(null, "", nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const clear = () => {
    update(emptyFilters);
    // The clear button disappears with the last filter; without this, focus would drop to <body>.
    // The first chip is where a fresh selection starts, and the live count still announces the result.
    panelRef.current?.querySelector("button")?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      <FilterPanel ref={panelRef} filters={filters} options={options} labels={labels} onChange={update} />
      <CountLine count={visible.length} labels={labels}>
        {active > 0 && (
          <button type="button" onClick={clear} className="min-h-11 px-2 underline underline-offset-4">
            {labels.clear} ({active})
          </button>
        )}
      </CountLine>

      {visible.length > 0 ? (
        <DishList items={visible} />
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted">{labels.empty}</p>
      )}
    </div>
  );
}

type PanelProps = {
  filters: Filters;
  options: Options;
  labels: Dictionary["filters"];
  // Without a handler (the prerendered fallback) the chips render disabled.
  onChange?: (next: Filters) => void;
  ref?: Ref<HTMLDivElement>;
};

function FilterPanel({ filters, options, labels, onChange, ref }: PanelProps) {
  const toggle = onChange && ((next: Filters) => () => onChange(next));
  const one = <K extends "budget" | "time">(key: K, value: Filters[K]) =>
    toggle?.({ ...filters, [key]: filters[key] === value ? undefined : value });
  const many = <K extends "kitchen" | "diet">(key: K, value: Filters[K][number]) => {
    const current = filters[key] as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    return toggle?.({ ...filters, [key]: next });
  };

  return (
    <div ref={ref} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <ChipGroup label={labels.budget}>
        {options.budget.map((o) => (
          <Chip key={o} pressed={filters.budget === o} onClick={one("budget", o)}>
            {labels.budgetOptions[o]}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup label={labels.time}>
        {options.time.map((o) => (
          <Chip key={o} pressed={filters.time === o} onClick={one("time", o)}>
            {labels.timeOptions[o]}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup label={labels.kitchen}>
        {options.kitchen.map((o) => (
          <Chip key={o} pressed={filters.kitchen.includes(o)} onClick={many("kitchen", o)}>
            {labels.kitchenOptions[o]}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup label={labels.diet}>
        {options.diet.map((o) => (
          <Chip key={o} pressed={filters.diet.includes(o)} onClick={many("diet", o)}>
            {labels.dietOptions[o]}
          </Chip>
        ))}
      </ChipGroup>
      {options.supermarket && (
        <ChipGroup label={labels.shopping}>
          <Chip pressed={filters.supermarket} onClick={toggle?.({ ...filters, supermarket: !filters.supermarket })}>
            {labels.supermarketOnly}
          </Chip>
        </ChipGroup>
      )}
    </div>
  );
}

function CountLine({ count, labels, children }: { count: number; labels: Dictionary["filters"]; children?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between text-sm text-muted" aria-live="polite">
      <span>{labels.count.replace("{count}", String(count))}</span>
      {children}
    </div>
  );
}

function DishList({ items }: { items: ListItem[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.key}>{item.card}</li>
      ))}
    </ul>
  );
}

function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  // A group whose options were all hidden (see availableFilterOptions) shouldn't leave an empty label.
  if (Children.count(children) === 0) return null;
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-medium text-muted">{label}</span>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{children}</div>
    </div>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      disabled={!onClick}
      className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        pressed
          ? "border-primary bg-primary font-medium text-primary-foreground"
          : "border-border bg-background enabled:hover:border-primary"
      }`}
    >
      {pressed && <span aria-hidden="true">✓ </span>}
      {children}
    </button>
  );
}
