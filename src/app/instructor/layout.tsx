import Link from "next/link";
import { requireStaff } from "@/lib/auth";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between border-b border-stone2-200 pb-4">
        <div>
          <p className="section-title">Espace instructeur</p>
          <h1 className="font-serif text-3xl font-medium text-brand-600 mt-1">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-xs text-stone2-500 uppercase tracking-wider mt-0.5">{user.role}</p>
        </div>
        <nav className="flex gap-4 text-[11px] uppercase tracking-[0.2em]">
          <Link href="/instructor" className="text-stone2-600 hover:text-brand-600 transition-colors">
            Mes cours
          </Link>
          <Link href="/instructor/check-in" className="text-stone2-600 hover:text-brand-600 transition-colors">
            Check-in
          </Link>
        </nav>
      </header>
      <div>{children}</div>
    </div>
  );
}
