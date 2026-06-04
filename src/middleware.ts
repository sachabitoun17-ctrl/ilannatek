import { NextRequest, NextResponse } from "next/server";

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
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' https://js.stripe.com",
      "frame-src https://js.stripe.com https://checkout.stripe.com",
      "frame-ancestors 'none'",
      "connect-src 'self' https://api.stripe.com",
      "font-src 'self' data:",
    ].join("; ")
  );
  return res;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
