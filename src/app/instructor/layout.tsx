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
      <header className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold">Espace instructeur</h1>
          <p className="text-xs text-gray-500">
            {user.firstName} {user.lastName} ({user.role})
          </p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/instructor" className="hover:text-brand-600">
            Mes cours
          </Link>
          <Link href="/instructor/check-in" className="hover:text-brand-600">
            Check-in
          </Link>
        </nav>
      </header>
      <div>{children}</div>
    </div>
  );
}
