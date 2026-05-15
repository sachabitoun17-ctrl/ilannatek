import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      time: new Date().toISOString(),
      db: "ok",
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", db: "fail", error: String(err) },
      { status: 503 }
    );
  }
}
