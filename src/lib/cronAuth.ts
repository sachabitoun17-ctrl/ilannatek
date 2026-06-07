import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  try {
    // timingSafeEqual throws on length mismatch — constant-time for equal-length inputs
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
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
