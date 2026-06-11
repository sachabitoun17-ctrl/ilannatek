export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const groups: { title: string; items: { href: string; label: string }[] }[] = [
    {
      title: "Pilotage",
      items: [
        { href: "/admin", label: "Tableau de bord" },
        { href: "/admin/reports", label: "Reporting" },
        { href: "/admin/audit", label: "Journal d'audit" },
      ],
    },
    {
      title: "Programmation",
      items: [
        { href: "/admin/sessions", label: "Cours" },
        { href: "/admin/recurring", label: "Cours récurrents" },
        { href: "/admin/sub-requests", label: "Remplacements" },
        { href: "/admin/class-types", label: "Types de cours" },
        { href: "/admin/instructors", label: "Instructeurs" },
        { href: "/admin/locations", label: "Studios" },
      ],
    },
    {
      title: "Commerce",
      items: [
        { href: "/admin/plans", label: "Plans & packs" },
        { href: "/admin/promos", label: "Codes promo" },
      ],
    },
    {
      title: "Membres",
      items: [
        { href: "/admin/users", label: "Membres" },
        { href: "/admin/bookings", label: "Réservations" },
        { href: "/admin/churn", label: "Risque churn" },
      ],
    },
    {
      title: "Configuration",
      items: [
        { href: "/admin/emails", label: "Emails transactionnels" },
        { href: "/admin/emails/broadcast", label: "Broadcast membres" },
        { href: "/admin/settings", label: "Paramètres" },
      ],
    },
    {
      title: "Outils",
      items: [
        { href: "/admin/export", label: "Export données" },
      ],
    },
  ];

  return (
    <div className="md:grid md:grid-cols-[220px_1fr] md:gap-8">
      <AdminSidebar groups={groups} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
