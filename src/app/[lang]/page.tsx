import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

// Only one country pair exists for now; the picker comes later.
const DEFAULT_PAIR = "vn-de";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const modes = [
    { href: `/${lang}/${DEFAULT_PAIR}/familiar`, ...dict.modes.familiar },
    { href: `/${lang}/${DEFAULT_PAIR}/home-cooking`, ...dict.modes.homeCooking },
  ];

  return (
    <div className="flex flex-col gap-8 pt-6">
      <section>
        <h1 className="text-3xl font-bold">{dict.site.tagline}</h1>
        <p className="mt-2 text-muted">{dict.site.description}</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {modes.map((mode) => (
          <Link
            key={mode.href}
            href={mode.href}
            className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary"
          >
            <h2 className="text-xl font-bold">{mode.title}</h2>
            <p className="mt-1 text-sm text-muted">{mode.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
