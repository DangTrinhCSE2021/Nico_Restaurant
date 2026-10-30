import { NextResponse, type NextRequest } from "next/server";
import { localeRedirectPath } from "@/i18n/config";

// Redirects locale-less paths (e.g. "/") to "/vi" or "/en".
export function proxy(request: NextRequest) {
  const target = localeRedirectPath(request.nextUrl.pathname, request.headers.get("accept-language"));
  if (target === null) return;
  request.nextUrl.pathname = target;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Skip Next internals, API routes (/api and /api/..., not /apis) and files with an extension.
  matcher: ["/((?!_next|api$|api/|.*\\..*).*)"],
};
