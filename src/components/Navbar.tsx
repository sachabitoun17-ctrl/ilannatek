import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";

type Props = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    creditsBalance: number;
  } | null;
};

export default function Navbar({ user }: Props) {
  return (
    <header className="bg-brand-600 border-b border-brand-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-12">
            <Link
              href="/"
              className="text-cream-50 font-serif text-2xl tracking-[0.18em] uppercase"
            >
              Ilannatek
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/schedule"
                className="text-[11px] uppercase tracking-[0.22em] text-stone2-300 hover:text-cream-50 transition-colors"
              >
                Planning
              </Link>
              <Link
                href="/packs"
                className="text-[11px] uppercase tracking-[0.22em] text-stone2-300 hover:text-cream-50 transition-colors"
              >
                Crédits
              </Link>
              <Link
                href="/subscriptions"
                className="text-[11px] uppercase tracking-[0.22em] text-stone2-300 hover:text-cream-50 transition-colors"
              >
                Abonnements
              </Link>
              {user?.role === "INSTRUCTOR" && (
                <Link
                  href="/instructor"
                  className="text-[11px] uppercase tracking-[0.22em] text-stone2-300 hover:text-cream-50 transition-colors"
                >
                  Espace pro
                </Link>
              )}
              {user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-[11px] uppercase tracking-[0.22em] text-stone2-300 hover:text-cream-50 transition-colors"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-5">
            {user ? (
              <>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-accent-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
                  {user.creditsBalance} crédits
                </span>
                <Link
                  href="/account"
                  className="text-[11px] uppercase tracking-[0.22em] text-cream-50 hover:text-accent-300 transition-colors"
                >
                  {user.firstName}
                </Link>
                <Link
                  href="/schedule"
                  className="text-[11px] uppercase tracking-[0.22em] px-5 py-2.5 bg-cream-50 text-brand-600 hover:bg-accent-300 transition-colors"
                >
                  Réserver
                </Link>
                <form action={logoutAction}>
                  <button className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 hover:text-cream-50 transition-colors">
                    Sortir
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[11px] uppercase tracking-[0.22em] text-cream-50 hover:text-accent-300 transition-colors"
                >
                  Mon compte
                </Link>
                <Link
                  href="/schedule"
                  className="text-[11px] uppercase tracking-[0.22em] px-5 py-2.5 bg-cream-50 text-brand-600 hover:bg-accent-300 transition-colors"
                >
                  Réserver
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
