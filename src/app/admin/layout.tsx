import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

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
      ],
    },
    {
      title: "Configuration",
      items: [
        { href: "/admin/emails", label: "Emails" },
        { href: "/admin/settings", label: "Paramètres" },
      ],
    },
  ];

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-8">
      <aside className="space-y-5">
        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="text-[10px] uppercase tracking-[0.22em] text-stone2-400 px-3 py-2">
              {g.title}
            </h2>
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 text-sm text-stone2-700 hover:bg-cream-100 hover:text-brand-600 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
