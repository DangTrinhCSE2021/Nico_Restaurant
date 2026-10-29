import type { Locale } from "@/i18n/config";
import type { LocalizedText } from "./schema";

export const t = (text: LocalizedText, locale: Locale): string =>
  (locale === "en" ? text.en : undefined) ?? text.vi;
