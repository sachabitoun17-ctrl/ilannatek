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

  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-6">
      <aside className="space-y-1">
        <h2 className="font-semibold text-xs uppercase text-gray-500 px-3 py-2">
          Administration
        </h2>
        {[
          { href: "/admin", label: "Tableau de bord" },
          { href: "/admin/sessions", label: "Cours" },
          { href: "/admin/class-types", label: "Types de cours" },
          { href: "/admin/instructors", label: "Instructeurs" },
          { href: "/admin/locations", label: "Studios" },
          { href: "/admin/plans", label: "Plans & packs" },
          { href: "/admin/users", label: "Membres" },
          { href: "/admin/bookings", label: "Réservations" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700"
          >
            {item.label}
          </Link>
        ))}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
