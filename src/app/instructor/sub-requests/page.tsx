import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import SubRequestClient from "./SubRequestClient";

export const dynamic = "force-dynamic";

export default async function InstructorSubRequestsPage() {
  const user = await requireStaff();

  // Upcoming sessions for this instructor
  const sessions = await db.session.findMany({
    where: {
      instructorId: user.id,
      startTime: { gte: new Date() },
      status: "SCHEDULED",
    },
    include: {
      classType: true,
      location: true,
      subRequest: {
        include: { sub: { select: { firstName: true, lastName: true } } },
      },
      _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: { startTime: "asc" },
    take: 30,
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="section-title">Remplacement</p>
        <h2 className="font-serif text-3xl font-medium text-brand-600 mt-1">Mes séances à venir</h2>
        <p className="text-sm text-stone2-500 mt-2">
          Signalez une indisponibilité pour qu&apos;un remplaçant soit assigné par l&apos;admin.
        </p>
      </div>

      <SubRequestClient sessions={sessions} />
    </div>
  );
}
