import { NextRequest, NextResponse } from "next/server";

/**
 * Adds security headers to every response.
 * Note: we don't do auth checks here — auth is enforced in Server Components and
 * Server Actions via lib/auth.ts. Middleware on the Edge runtime can't access
 * our Prisma client, so we use it strictly for headers and rate-limit hints.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const isProd = process.env.NODE_ENV === "production";

  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (isProd) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
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
      "frame-src https://js.stripe.com https://checkout.stripe.com",
      "connect-src 'self' https://api.stripe.com",
      "font-src 'self' data:",
    ].join("; ")
  );
  return res;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
