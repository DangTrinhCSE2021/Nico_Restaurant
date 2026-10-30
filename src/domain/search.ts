// Lowercase and strip accents so "nuoc mam" finds "nước mắm".
export const normalize = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

const hasAccents = (text: string) => normalize(text) !== text.toLowerCase();
const words = (text: string) => text.split(/[\s/(),.+-]+/).filter(Boolean);

// Long terms may match inside German compounds ("sauce" → "Fischsauce").
const SUBSTRING_MIN_LENGTH = 5;

// Every query term must match a word in `text`. Terms typed with accents match
// accents exactly ("sả" ≠ "sauce"); short terms match word starts ("hanh" ≠ "chanh").
export function matchesQuery(query: string, text: string): boolean {
  const accentSensitive = hasAccents(query);
  // NFC so a decomposed "sả" (some keyboards/OSes) still equals the precomposed one in the data.
  const prep = (s: string) => (accentSensitive ? s.normalize("NFC").toLowerCase() : normalize(s));
  const textWords = words(prep(text));
  return words(prep(query)).every((term) =>
    textWords.some((word) =>
      term.length >= SUBSTRING_MIN_LENGTH ? word.includes(term) : word.startsWith(term),
    ),
  );
}
