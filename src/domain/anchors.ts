// Page element IDs built from content slugs. The prefix keeps a slug like "search"
// or "main" from clashing with other IDs on the page.
export const ingredientAnchor = (slug: string) => `ingredient-${slug}`;
export const storeAnchor = (slug: string) => `store-${slug}`;
