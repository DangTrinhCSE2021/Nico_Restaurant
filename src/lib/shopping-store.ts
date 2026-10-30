"use client";

import { useSyncExternalStore } from "react";

// The shopping list lives in this browser only. Every access is guarded because storage
// can be blocked (private mode, disabled site data) and the page must still work.

export type ShoppingState = { dishes: string[]; checked: string[]; preferred?: string };

const KEY = "nhonha:shopping:v1";
const EVENT = "nhonha:shopping";
const EMPTY: ShoppingState = { dishes: [], checked: [] };

let cachedRaw: string | null = null;
let cachedState: ShoppingState = EMPTY;
// Fallback when storage is unavailable, so the list still works until the tab closes.
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return memoryRaw;
  }
}

function getSnapshot(): ShoppingState {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedState;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : EMPTY;
    cachedState = {
      dishes: Array.isArray(parsed.dishes) ? parsed.dishes.filter((d: unknown) => typeof d === "string") : [],
      checked: Array.isArray(parsed.checked) ? parsed.checked.filter((c: unknown) => typeof c === "string") : [],
      preferred: typeof parsed.preferred === "string" ? parsed.preferred : undefined,
    };
  } catch {
    cachedState = EMPTY;
  }
  return cachedState;
}

function subscribe(onChange: () => void) {
  // "storage" covers other tabs; the custom event covers this tab.
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function updateShopping(update: (state: ShoppingState) => ShoppingState) {
  const raw = JSON.stringify(update(getSnapshot()));
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    memoryRaw = raw;
  }
  window.dispatchEvent(new Event(EVENT));
}

// Server render and first client render see an empty list, then the stored one.
export function useShopping(): ShoppingState {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export const toggleIn = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
