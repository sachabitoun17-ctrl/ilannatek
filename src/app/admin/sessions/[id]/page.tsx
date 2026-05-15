import { notFound } from "next/navigation";
import QRCode from "qrcode";
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const checkInUrl = `${siteUrl}/check-in/${params.id}`;
  const qrDataUrl = await QRCode.toDataURL(checkInUrl, { width: 200, margin: 1 });

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

      <div className="card flex flex-wrap items-start gap-6">
        <div>
          <h2 className="font-semibold mb-2">QR Code Check-in</h2>
          <img src={qrDataUrl} alt="QR check-in" className="rounded border" width={160} height={160} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-600 mb-1">Lien direct :</p>
          <a
            href={checkInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-600 break-all underline"
          >
            {checkInUrl}
          </a>
          <p className="text-xs text-gray-500 mt-3">
            Affichez ce QR code à l'entrée du studio ou envoyez-le par email. Les membres
            scannent et se pointent directement depuis leur téléphone dans la fenêtre
            −15 min / +90 min autour du début du cours.
          </p>
        </div>
      </div>

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
