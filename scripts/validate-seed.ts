import { listPairs, loadPair } from "../src/data/load";

let failed = false;
for (const pair of listPairs()) {
  try {
    const data = loadPair(pair);
    const drafts = [...data.dishes, ...data.links, ...data.substitutions].filter(
      (item) => item.reviewStatus === "draft",
    ).length;
    console.log(
      `✓ ${pair}: ${data.dishes.length} dishes, ${data.ingredients.length} ingredients, ` +
        `${data.links.length} links, ${data.substitutions.length} substitutions (${drafts} drafts)`,
    );
  } catch (error) {
    failed = true;
    console.error(`✗ ${pair}\n${error instanceof Error ? error.message : error}`);
  }
}
process.exit(failed ? 1 : 0);
