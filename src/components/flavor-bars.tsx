import type { FlavorProfile } from "@/domain/schema";
import type { Dictionary } from "@/i18n/dictionaries";

const MAX_LEVEL = 3;

export function FlavorBars({ flavor, dict }: { flavor: FlavorProfile; dict: Dictionary }) {
  const entries = Object.entries(flavor) as [keyof FlavorProfile, number][];
  return (
    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
      {entries.map(([key, level]) => (
        <div key={key} className="contents">
          <dt className="text-muted">{dict.flavor[key]}</dt>
          <dd className="flex gap-1" aria-label={`${level}/${MAX_LEVEL}`}>
            {Array.from({ length: MAX_LEVEL }, (_, i) => (
              <span
                key={i}
                className={`h-2 w-8 rounded-full ${i < level ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
