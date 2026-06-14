import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { logoutAction } from "@/app/(auth)/actions";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();

  return (
    <div className="-mx-4 md:-mx-8 -my-10 min-h-screen bg-brand-700">
      <header className="border-b border-white/10 bg-brand-700">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 items-center rounded-full bg-accent-500 px-3 text-[11px] font-semibold uppercase tracking-wider text-white">
              Superadmin
            </span>
            <Link href="/superadmin" className="text-cream-50 font-medium text-sm hover:text-accent-300 transition-colors">
              Console plateforme
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/admin" className="text-xs text-stone2-300 hover:text-cream-50 transition-colors">
              Vue studio →
            </Link>
            <span className="text-xs text-stone2-400">{user.email}</span>
            <form action={logoutAction}>
              <button className="text-xs text-stone2-400 hover:text-cream-50 transition-colors">Déconnexion</button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
