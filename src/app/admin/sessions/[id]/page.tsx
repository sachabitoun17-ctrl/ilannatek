import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import SessionForm from "../SessionForm";
import { updateSessionAction } from "../actions";
import BookingsManager from "./BookingsManager";

export default async function EditSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await db.session.findUnique({
    where: { id: params.id },
    include: {
      bookings: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: [{ status: "asc" }, { waitlistPos: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!session) notFound();

  const startLocal = session.startTime.toISOString().slice(0, 16);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Éditer le cours</h1>
      <SessionForm
        action={updateSessionAction.bind(null, params.id)}
        defaults={{
          classTypeId: session.classTypeId,
          instructorId: session.instructorId,
          locationId: session.locationId,
          startTime: startLocal,
          capacity: session.capacity,
          status: session.status,
          notes: session.notes,
        }}
        showStatus
      />

      <div>
        <h2 className="text-xl font-semibold mb-3">Réservations</h2>
        <BookingsManager
          bookings={session.bookings.map((b) => ({
            id: b.id,
            userName: `${b.user.firstName} ${b.user.lastName}`,
            email: b.user.email,
            status: b.status,
            waitlistPos: b.waitlistPos,
          }))}
        />
      </div>
    </div>
  );
}
