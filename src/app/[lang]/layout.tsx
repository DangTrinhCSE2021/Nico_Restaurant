import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Be_Vietnam_Pro } from "next/font/google";
import { routes } from "@/domain/routes";
import { hasLocale, locales, type Locale } from "@/i18n/config";
import { LanguageSwitch } from "@/components/language-switch";
import { getDictionary } from "@/i18n/dictionaries";
import "../globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.site.name, description: dict.site.description };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const otherLang: Locale = lang === "vi" ? "en" : "vi";

  return (
    <html lang={lang} className={`${beVietnamPro.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
          <Link href={routes.home(lang)} className="text-lg font-bold text-primary">
            {dict.site.name}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitch
              lang={otherLang}
              label={dict.nav.switchLanguage}
              className="text-sm text-muted underline-offset-4 hover:underline"
            />
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12">{children}</main>
        <footer className="mx-auto w-full max-w-3xl border-t border-border px-4 py-6 text-xs text-muted">
          <Link href={routes.credits(lang)} className="underline underline-offset-2">
            {dict.credits.footerLink}
          </Link>
        </footer>
      </body>
    </html>
  );
}
