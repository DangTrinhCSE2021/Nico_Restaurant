import Image from "next/image";
import type { Ingredient } from "@/domain/schema";

// Shown until a real photo is added, so every row keeps the same shape.
const PLACEHOLDER: Record<Ingredient["category"], string> = {
  protein: "🥩",
  vegetable: "🥬",
  herb: "🌿",
  sauce: "🫙",
  spice: "🧂",
  "noodle-rice": "🍜",
  other: "🛒",
};

// Decorative by default: every caller prints the ingredient name next to the photo,
// so an alt would make screen readers say it twice. Pass `alt` only where the name isn't shown.
type Props = { ingredient: Ingredient; size: number; alt?: string };

export function IngredientImage({ ingredient, size, alt = "" }: Props) {
  const box = { width: size, height: size };
  if (!ingredient.image) {
    return (
      <span
        aria-hidden="true"
        style={{ ...box, fontSize: size * 0.45 }}
        className="flex shrink-0 items-center justify-center rounded-xl border border-border bg-card"
      >
        {PLACEHOLDER[ingredient.category]}
      </span>
    );
  }
  return (
    <Image
      src={ingredient.image.file}
      alt={alt}
      // Browsers expose an alt="" image that has a title, so the credit tooltip only goes on meaningful ones.
      title={alt ? `${ingredient.image.credit}, ${ingredient.image.license}` : undefined}
      width={size}
      height={size}
      style={box}
      className="shrink-0 rounded-xl object-cover"
    />
  );
}
