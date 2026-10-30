# Nhớ Nhà

Food ideas for Vietnamese students in Germany:

- **Familiar German food**: German dishes that taste familiar to Vietnamese people, with an explanation of why.
- **Vietnamese food in Germany**: Vietnamese dishes cooked with ingredients from Rewe, Lidl, Aldi, Edeka or an Asia-Markt, plus substitutes.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000 (redirects to /vi or /en)
npm run validate   # check the seed data
npm run build
```

## Project layout

```
content/seed/<pair>/     Curated data, one folder per country pair (only vn-de for now)
  pair.yaml              home and host region
  stores.yaml            store chains
  ingredients.yaml       ingredients with German names and per-store availability
  dishes.yaml            dishes from both regions; VN dishes with a recipe show in "home cooking"
  links.yaml             "German dish X feels familiar to fans of VN dish Y"
  substitutions.yaml     ingredient swaps
src/domain/schema.ts     Zod schema for all seed data (the source of truth for fields)
src/domain/vocab.ts      allowed enum values (diet, equipment, store kinds…), Zod-free so client code can use them
src/domain/routes.ts     every URL in the site (client-safe)
src/domain/filters.ts    dish list filters (client-safe)
src/data/load.ts         loads a pair and checks cross-references between files
src/data/model.ts        indexed pair model (lookups by slug, resolved links, swaps, facets, store summaries)
src/data/pair.ts         getPair()/listPairs(): cached per request, what pages use
src/i18n/                locales (vi default, en) and UI string dictionaries
src/proxy.ts             redirects "/" to the visitor's language
src/app/[lang]/          pages
scripts/validate-seed.ts `npm run validate`
```

## Adding content

1. Add or edit entries in `content/seed/vn-de/*.yaml`. Slugs are kebab-case ASCII (`pho-bo`, `fish-sauce`).
2. New entries start with `reviewStatus: draft`. Change it to `reviewed` only after a Vietnamese student in Germany has checked the dish, and after availability has been checked in a real store (set `lastVerified` on the ingredient).
3. Run `npm run validate` before committing.

Text fields take `vi` (required), `en` (falls back to `vi`) and `de` (the name used in German shops).

## Ingredient photos

Photos live in `public/images/ingredients/<slug>.jpg` and are referenced from `ingredients.yaml`:

```yaml
image: { file: /images/ingredients/garlic.jpg, credit: Your Name, license: CC BY 4.0 }
```

`credit` and `license` are required and are listed on the `/credits` page. `source` (a URL) is optional.
Ingredients without `image` show a placeholder. The current photos come from Wikimedia Commons.
To replace one with your own (ideally the product on a German shelf), overwrite the file and update `credit`/`license`.
A square-ish photo of at least 400 px works best. `npm run validate` fails if a referenced file is missing.
