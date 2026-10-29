import "server-only";
import type { Locale } from "./config";

const dictionaries = {
  vi: () => import("./dictionaries/vi.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["vi"]>>;

export const getDictionary = (locale: Locale): Promise<Dictionary> =>
  dictionaries[locale]();
