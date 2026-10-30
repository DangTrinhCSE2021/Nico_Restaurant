// Shopping list logic. Pure and client-safe: the page passes in a compact data snapshot.

export type ShopStore = { slug: string; name: string; kind: string; priceLevel: number };
export type ShopIngredient = {
  slug: string;
  name: string;
  de: string;
  image?: string;
  availability: { store: string; likelihood: string; productHint?: string }[];
};
export type ShopDish = {
  slug: string;
  name: string;
  ingredients: { ingredient: string; amount: string; optional: boolean }[];
};
export type ShopData = { stores: ShopStore[]; ingredients: ShopIngredient[]; dishes: ShopDish[] };

export type ListItem = {
  ingredient: ShopIngredient;
  productHint?: string;
  uses: { dish: string; amount: string; optional: boolean }[];
  // Every use is optional, so the item can be skipped.
  optional: boolean;
};
export type ListGroup = { store: ShopStore | null; items: ListItem[] };

const LIKELIHOOD_ORDER = ["usually", "sometimes", "seasonal", "rare"];

// Where to buy: the preferred supermarket if it usually has it, then the cheapest other
// supermarket that usually has it, then the Asia-Markt; "sometimes" only as a last resort.
export function pickStore(ingredient: ShopIngredient, stores: ShopStore[], preferred?: string): ShopStore | null {
  const rank = (s: ShopStore) =>
    (s.slug === preferred ? 0 : s.kind === "asia-market" ? 2 : 1) * 10 + s.priceLevel;
  for (const likelihood of LIKELIHOOD_ORDER) {
    const candidates = ingredient.availability
      .filter((a) => a.likelihood === likelihood)
      .map((a) => stores.find((s) => s.slug === a.store))
      .filter((s): s is ShopStore => !!s)
      .sort((a, b) => rank(a) - rank(b));
    if (candidates.length > 0) return candidates[0];
  }
  return null;
}

export function buildList(data: ShopData, dishSlugs: string[], preferred?: string): ListGroup[] {
  const items = new Map<string, ListItem>();
  for (const dish of data.dishes.filter((d) => dishSlugs.includes(d.slug))) {
    for (const use of dish.ingredients) {
      const ingredient = data.ingredients.find((i) => i.slug === use.ingredient);
      if (!ingredient) continue;
      const item = items.get(ingredient.slug) ?? { ingredient, uses: [], optional: true };
      item.uses.push({ dish: dish.name, amount: use.amount, optional: use.optional });
      item.optional = item.optional && use.optional;
      items.set(ingredient.slug, item);
    }
  }

  const groups = new Map<string, ListGroup>();
  for (const item of items.values()) {
    const store = pickStore(item.ingredient, data.stores, preferred);
    item.productHint = item.ingredient.availability.find((a) => a.store === store?.slug)?.productHint;
    const key = store?.slug ?? "";
    const group = groups.get(key) ?? { store, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }

  // Preferred store first, Asia-Markt after supermarkets, unknown last; required items before optional.
  const order = (g: ListGroup) =>
    !g.store ? 99 : g.store.slug === preferred ? 0 : g.store.kind === "asia-market" ? 50 : g.store.priceLevel;
  return [...groups.values()]
    .sort((a, b) => order(a) - order(b))
    .map((g) => ({ ...g, items: g.items.sort((a, b) => Number(a.optional) - Number(b.optional)) }));
}

// Plain text for sharing to chat apps. German names first: that's what's on the shelf.
export function listToText(groups: ListGroup[], checked: string[], title: string, unknownStore: string): string {
  const lines = [title];
  for (const group of groups) {
    lines.push("", `🛒 ${group.store?.name ?? unknownStore}`);
    for (const item of group.items) {
      const box = checked.includes(item.ingredient.slug) ? "☑" : "☐";
      const amounts = item.uses.map((u) => u.amount).join(" + ");
      lines.push(`${box} ${item.ingredient.de} (${item.ingredient.name}) – ${amounts}`);
    }
  }
  return lines.join("\n");
}
