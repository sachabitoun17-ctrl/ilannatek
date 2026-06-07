export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { encodeRefCode } from "@/lib/referral";
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

  const acceptedCount = invites.filter((inv) => inv.usedAt).length;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const referralUrl = `${siteUrl}/register?ref=${encodeRefCode(user.id)}`;

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <p className="section-title">Parrainage</p>
        <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-1 leading-none">
          Inviter un ami
        </h1>
        <p className="text-sm text-stone2-500 mt-3 max-w-lg">
          Partagez votre lien ou envoyez une invitation par email.
          À l&apos;inscription, votre ami reçoit <strong>1 crédit offert</strong> — et vous aussi.
        </p>
      </div>

      <InviteClient
        invites={serialized}
        activeCount={activeCount}
        acceptedCount={acceptedCount}
        referralUrl={referralUrl}
      />
    </div>
  );
}
