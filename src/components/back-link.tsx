"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

// Dish lists keep their filters in the query string (history.replaceState), so a plain link back
// would drop them. Lists remember their last query per path for this tab; the back link reuses it.
// Unlike router.back() this doesn't depend on how the dish page was reached (shared link, related
// dish, reload), and it stays a real link: prerendered and without JS it points at the plain list.
const storageKey = (listPath: string) => `list-query:${listPath}`;

function readQuery(listPath: string): string {
  try {
    return sessionStorage.getItem(storageKey(listPath)) ?? "";
  } catch {
    return ""; // Storage can be blocked (privacy settings); the plain list is still fine.
  }
}

export function useRememberListQuery(listPath: string, query: string) {
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(listPath), query);
    } catch {}
  }, [listPath, query]);
}

// The query only changes on the list page, so there's nothing to listen to. React still re-reads
// the snapshot whenever it (re)subscribes, e.g. when a preserved dish page is shown again.
const subscribe = () => () => {};

export function BackLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const query = useSyncExternalStore(
    subscribe,
    () => readQuery(href),
    () => "",
  );
  return (
    <Link href={query ? `${href}?${query}` : href} className={className}>
      {children}
    </Link>
  );
}
