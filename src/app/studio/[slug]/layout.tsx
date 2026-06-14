import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const studio = await db.studio.findUnique({
    where: { slug: params.slug },
    select: { name: true },
  });
  if (!studio) return {};
  return {
    title: `${studio.name} — Studio Boutique`,
    description: `Réservez vos cours chez ${studio.name}. Planning, packs et abonnements en ligne.`,
  };
}

export default async function StudioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const studio = await db.studio.findUnique({
    where: { slug: params.slug },
    select: { id: true, status: true },
  });

  if (!studio || studio.status !== "ACTIVE") notFound();

  return <>{children}</>;
}
