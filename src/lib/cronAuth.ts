import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still run a dummy comparison to avoid early exit timing leak
    timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Vercel sends Authorization: Bearer <CRON_SECRET> on cron invocations.
 * Only the Authorization header is accepted — query params are not (they appear in logs).
 */
export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization") ?? "";
  if (safeEqual(authHeader, `Bearer ${secret}`)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
