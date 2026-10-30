"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { routes, withLocale } from "@/domain/routes";
import type { Locale } from "@/i18n/config";

type Props = { lang: Locale; label: string; className?: string };

// Links to the current page in `lang`, keeping filters in the query string.
// Prerendering can't read the query (and not the path, for slugs outside generateStaticParams),
// so each step falls back to a less precise link: same path without query, then the home page.
export function LanguageSwitch(props: Props) {
  return (
    <Suspense fallback={<SwitchLink {...props} href={routes.home(props.lang)} />}>
      <WithPath {...props} />
    </Suspense>
  );
}

function WithPath(props: Props) {
  const href = withLocale(usePathname(), props.lang);
  return (
    <Suspense fallback={<SwitchLink {...props} href={href} />}>
      <WithQuery {...props} href={href} />
    </Suspense>
  );
}

function WithQuery(props: Props & { href: string }) {
  const query = useSearchParams().toString();
  return <SwitchLink {...props} href={query ? `${props.href}?${query}` : props.href} />;
}

function SwitchLink({ lang, label, className, href }: Props & { href: string }) {
  // The label is written in the target language, and the link leads to a page in it.
  return (
    <Link href={href} hrefLang={lang} lang={lang} className={className}>
      {label}
    </Link>
  );
}
