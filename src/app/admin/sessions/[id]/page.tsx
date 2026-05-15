import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { formatTime } from "@/lib/utils";
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
      classType: true,
      instructor: { select: { firstName: true, lastName: true } },
      location: true,
      bookings: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: [{ status: "asc" }, { waitlistPos: "asc" }, { createdAt: "asc" }],
      },
      checkIns: { select: { userId: true } },
    },
  });
  if (!session) notFound();

  const checkedInUserIds = new Set(session.checkIns.map((c) => c.userId));
  const confirmed = session.bookings.filter((b) => b.status === "CONFIRMED").length;
  const attended = session.bookings.filter((b) => b.status === "ATTENDED").length;

  const startLocal = session.startTime.toISOString().slice(0, 16);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const checkInUrl = `${siteUrl}/check-in/${params.id}`;
  const qrDataUrl = await QRCode.toDataURL(checkInUrl, { width: 200, margin: 1 });

  const isPast = session.startTime < new Date();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="section-title">Administration · Cours</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">
          {session.classType.name}
        </h1>
        <p className="text-stone2-500 text-sm mt-1">
          {session.startTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          {" · "}
          {formatTime(session.startTime)} — {formatTime(session.endTime)}
          {" · "}
          {session.instructor.firstName} {session.instructor.lastName}
          {" · "}
          {session.location.name}
        </p>
        {isPast && (
          <div className="mt-3 inline-flex items-center gap-2 text-sm">
            <span className="badge bg-stone2-100 text-stone2-500">Cours passé</span>
            <span className="text-stone2-500">
              Taux de présence :{" "}
              <strong className="text-brand-600">
                {confirmed + attended > 0
                  ? `${Math.round((attended / (confirmed + attended)) * 100)}%`
                  : "—"}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Check-in QR */}
      <div className="bg-white border border-stone2-200 p-6 flex flex-wrap items-start gap-8">
        <div>
          <p className="section-title mb-3">QR Check-in</p>
          <img src={qrDataUrl} alt="QR check-in" className="border border-stone2-200" width={160} height={160} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="section-title mb-2">Lien direct</p>
          <a
            href={checkInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-600 break-all underline"
          >
            {checkInUrl}
          </a>
          <p className="text-xs text-stone2-500 mt-3 leading-relaxed max-w-xs">
            Affichez ce QR à l'entrée du studio. Les membres scannent et se pointent dans
            une fenêtre de −15 min / +90 min autour du début du cours.
          </p>
          <p className="text-xs text-stone2-400 mt-2">
            Check-ins confirmés :{" "}
            <strong className="text-brand-600">{session.checkIns.length}</strong>
          </p>
        </div>
      </div>

      {/* Roster */}
      <div>
        <BookingsManager
          bookings={session.bookings.map((b) => ({
            id: b.id,
            userName: `${b.user.firstName} ${b.user.lastName}`,
            email: b.user.email,
            status: b.status,
            waitlistPos: b.waitlistPos,
            checkedIn: checkedInUserIds.has(b.userId),
          }))}
          capacity={session.capacity}
        />
      </div>

      {/* Edit form */}
      <div>
        <p className="section-title mb-4">Modifier le cours</p>
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
      </div>
    </div>
  );
}
