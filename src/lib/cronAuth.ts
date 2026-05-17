import { NextRequest, NextResponse } from "next/server";

/**
 * Vercel sends Authorization: Bearer <CRON_SECRET> on cron invocations.
 * Manual/external calls can still pass ?key=<CRON_SECRET> as a query param.
 */
export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return null;
  const key = req.nextUrl.searchParams.get("key");
  if (key === secret) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
