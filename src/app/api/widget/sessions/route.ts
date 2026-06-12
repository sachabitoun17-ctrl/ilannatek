import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay, addDays } from "@/lib/utils";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "7"), 1), 30);
  const locationId = searchParams.get("location") ?? undefined;

  const now = new Date();
  const rangeStart = startOfDay(now);
  const rangeEnd = endOfDay(addDays(now, days - 1));

  const sessions = await db.session.findMany({
    where: {
      startTime: { gte: rangeStart, lte: rangeEnd },
      status: "SCHEDULED",
      ...(locationId ? { locationId } : {}),
    },
    include: {
      classType: {
        select: { id: true, name: true, color: true, durationMin: true, creditCost: true },
      },
      instructor: { select: { firstName: true, lastName: true } },
      location: { select: { id: true, name: true } },
      bookings: {
        where: { status: { not: "CANCELLED" } },
        select: { status: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const data = sessions.map((s) => {
    const confirmed = s.bookings.filter((b) => b.status === "CONFIRMED").length;
    const spotsLeft = Math.max(0, s.capacity - confirmed);
    return {
      id: s.id,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      capacity: s.capacity,
      spotsLeft,
      isFull: spotsLeft === 0,
      classType: {
        id: s.classType.id,
        name: s.classType.name,
        color: s.classType.color,
        durationMin: s.classType.durationMin,
        creditCost: s.classType.creditCost,
      },
      instructor: `${s.instructor.firstName} ${s.instructor.lastName}`,
      location: { id: s.location.id, name: s.location.name },
    };
  });

  return NextResponse.json(data, { headers: CORS_HEADERS });
}
