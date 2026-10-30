import "server-only";
import { cache } from "react";
import { listPairs as readPairDirs, loadPair } from "./load";
import { buildModel, type PairModel } from "./model";

// Per-request memo (React cache): a page, its generateMetadata and its components share one
// parsed, validated, indexed copy. Outside a request (generateStaticParams) it just runs.
// Not "use cache": the model holds Maps and functions, which a cache entry can't serialize.

export const listPairs = cache(readPairDirs);

const loadModel = cache((slug: string) => buildModel(loadPair(slug)));

// Undefined for an unknown pair, so pages can 404 instead of crashing on a missing folder.
export const getPair = (slug: string): PairModel | undefined =>
  listPairs().includes(slug) ? loadModel(slug) : undefined;

export const allPairs = (): PairModel[] => listPairs().map((slug) => loadModel(slug));
