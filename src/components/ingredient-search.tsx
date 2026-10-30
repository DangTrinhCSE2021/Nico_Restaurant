"use client";

import { useState, type ReactNode } from "react";
import { matchesQuery } from "@/domain/search";

// `anchorId` is the element ID that links (e.g. from dish pages) jump to.
export type SearchItem = { key: string; anchorId: string; searchText: string; card: ReactNode };
export type SearchGroup = { key: string; label: string; items: SearchItem[] };

type Labels = { searchLabel: string; searchPlaceholder: string; count: string; noResults: string };

export function IngredientSearch({ groups, labels }: { groups: SearchGroup[]; labels: Labels }) {
  const [query, setQuery] = useState("");
  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => matchesQuery(query, i.searchText)) }))
    .filter((g) => g.items.length > 0);
  const count = visibleGroups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="ingredient-search" className="text-sm font-medium">
          {labels.searchLabel}
        </label>
        <input
          id="ingredient-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="min-h-11 rounded-xl border border-border bg-card px-4 focus-visible:outline-2 focus-visible:outline-primary"
        />
        <p className="text-sm text-muted" aria-live="polite">
          {labels.count.replace("{count}", String(count))}
        </p>
      </div>

      {visibleGroups.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted">{labels.noResults}</p>
      )}
      {visibleGroups.map((group) => (
        <section key={group.key} aria-labelledby={`group-${group.key}`}>
          <h2 id={`group-${group.key}`} className="mb-3 text-lg font-bold">
            {group.label}
          </h2>
          <ul className="flex flex-col gap-3">
            {group.items.map((item) => (
              <li key={item.key} id={item.anchorId} className="scroll-mt-4">
                {item.card}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
