import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Be_Vietnam_Pro } from "next/font/google";
import { hasLocale, locales } from "@/i18n/config";
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
  const otherLang = lang === "vi" ? "en" : "vi";

  return (
    <html lang={lang} className={`${beVietnamPro.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
          <Link href={`/${lang}`} className="text-lg font-bold text-primary">
            {dict.site.name}
          </Link>
          <Link href={`/${otherLang}`} className="text-sm text-muted underline-offset-4 hover:underline">
            {dict.nav.switchLanguage}
          </Link>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12">{children}</main>
      </body>
    </html>
  );
}
