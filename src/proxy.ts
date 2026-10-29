import { NextResponse, type NextRequest } from "next/server";
import { locales, matchLocale } from "@/i18n/config";

// Redirects locale-less paths (e.g. "/") to "/vi" or "/en".
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocalePrefix = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocalePrefix) return;

  const locale = matchLocale(request.headers.get("accept-language"));
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Skip Next internals, API routes and files with an extension.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
