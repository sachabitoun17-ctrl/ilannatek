import { NextRequest, NextResponse } from "next/server";

/**
 * Adds security headers to every response.
 * Note: we don't do auth checks here — auth is enforced in Server Components and
 * Server Actions via lib/auth.ts. Middleware on the Edge runtime can't access
 * our Prisma client, so we use it strictly for headers and rate-limit hints.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isWidget = pathname.startsWith("/widget");
  const isWidgetApi = pathname.startsWith("/api/widget");

  // Forward pathname as a request header so Server Components can detect widget routes
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-invoke-path", pathname);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  const isProd = process.env.NODE_ENV === "production";

  res.headers.set("X-Content-Type-Options", "nosniff");
  // Widget pages must be embeddable via iframe — skip X-Frame-Options for them
  if (!isWidget) {
    res.headers.set("X-Frame-Options", "DENY");
  }
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (isProd) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // Widget API: open CORS so external sites can fetch the JSON schedule
  if (isWidgetApi) {
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  }

  // We allow Stripe checkout to load if linked. Keep CSP loose to avoid breaking
  // the Next dev runtime; tighten later if needed.
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
      "connect-src 'self' https://api.stripe.com",
      "font-src 'self' data:",
    ].join("; ")
  );
  return res;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
