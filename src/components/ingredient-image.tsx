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

type Props = { ingredient: Ingredient; alt: string; size: number };

export function IngredientImage({ ingredient, alt, size }: Props) {
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
      title={`${ingredient.image.credit}, ${ingredient.image.license}`}
      width={size}
      height={size}
      style={box}
      className="shrink-0 rounded-xl object-cover"
    />
  );
}
