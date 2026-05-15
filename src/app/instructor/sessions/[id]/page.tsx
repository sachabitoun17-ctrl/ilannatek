import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import AttendanceList from "./AttendanceList";

export default async function InstructorSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const me = await requireStaff();
  const session = await db.session.findUnique({
    where: { id: params.id },
    include: {
      classType: true,
      location: true,
      instructor: { select: { id: true, firstName: true, lastName: true } },
      bookings: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: [{ status: "asc" }, { waitlistPos: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!session) notFound();
  // instructors only see their own sessions; admins see everything
  if (me.role !== "ADMIN" && session.instructorId !== me.id) {
    redirect("/instructor");
  }

  const confirmed = session.bookings.filter((b) => b.status === "CONFIRMED");
  const attended = session.bookings.filter((b) => b.status === "ATTENDED");
  const noShow = session.bookings.filter((b) => b.status === "NO_SHOW");
  const waitlist = session.bookings.filter((b) => b.status === "WAITLIST");

  return (
    <div className="space-y-6">
      <Link href="/instructor" className="text-sm text-brand-600 hover:underline">
        ← Retour
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{session.classType.name}</h1>
        <p className="text-sm text-gray-600">
          {formatDateTime(session.startTime)} · {session.location.name}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {confirmed.length + attended.length + noShow.length}/{session.capacity} inscrits ·{" "}
          {attended.length} présents · {noShow.length} absents
        </p>
      </div>

      <AttendanceList
        bookings={session.bookings
          .filter((b) => ["CONFIRMED", "WAITLIST", "ATTENDED", "NO_SHOW"].includes(b.status))
          .map((b) => ({
            id: b.id,
            firstName: b.user.firstName,
            lastName: b.user.lastName,
            email: b.user.email,
            status: b.status,
            waitlistPos: b.waitlistPos,
          }))}
      />
    </div>
  );
}
