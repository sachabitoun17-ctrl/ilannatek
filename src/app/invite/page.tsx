export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import InviteClient from "./InviteClient";

export default async function InvitePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const now = new Date();

  const invites = await db.friendInvite.findMany({
    where: { fromUserId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const serialized = invites.map((inv) => ({
    id: inv.id,
    toEmail: inv.toEmail,
    createdAt: inv.createdAt.toISOString(),
    expiresAt: inv.expiresAt.toISOString(),
    usedAt: inv.usedAt?.toISOString() ?? null,
    status:
      inv.usedAt
        ? ("accepted" as const)
        : inv.expiresAt < now
        ? ("expired" as const)
        : ("pending" as const),
  }));

  const activeCount = invites.filter(
    (inv) => !inv.usedAt && inv.expiresAt > now
  ).length;

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <p className="section-title">Mode Duo</p>
        <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-1 leading-none">
          Inviter un ami
        </h1>
        <p className="text-sm text-stone2-500 mt-3 max-w-lg">
          Invitez un ami à rejoindre le studio. Il recevra un crédit offert à l'inscription, et vous aussi !
        </p>
      </div>

      <InviteClient invites={serialized} activeCount={activeCount} />
    </div>
  );
}
