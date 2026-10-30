import { listPairs, loadPair } from "../src/data/load";
import { buildModel } from "../src/data/model";

let failed = false;
for (const pair of listPairs()) {
  try {
    const data = loadPair(pair);
    // Building the model also checks that every reference resolves the way pages use it.
    buildModel(data);
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
