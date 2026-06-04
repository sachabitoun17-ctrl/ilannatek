import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import MobileMenu from "./MobileMenu";

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
    <header className="bg-brand-600 border-b border-brand-700/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[72px] items-center justify-between">

          {/* Left: Logo + primary nav */}
          <div className="flex items-center gap-10">
            <Link
              href="/"
              className="text-cream-50 font-serif text-2xl tracking-[0.2em] uppercase shrink-0 hover:text-accent-300 transition-colors"
            >
              Ilannatek
            </Link>

            <nav className="hidden md:flex items-center gap-7">
              <Link
                href="/schedule"
                className="text-[11px] uppercase tracking-[0.2em] text-stone2-300 hover:text-cream-50 transition-colors font-medium"
              >
                Planning
              </Link>
              <Link
                href="/classes"
                className="text-[11px] uppercase tracking-[0.2em] text-stone2-400 hover:text-cream-50 transition-colors"
              >
                Cours
              </Link>
              <Link
                href="/instructors"
                className="text-[11px] uppercase tracking-[0.2em] text-stone2-400 hover:text-cream-50 transition-colors"
              >
                Instructeurs
              </Link>
              <Link
                href="/packs"
                className="text-[11px] uppercase tracking-[0.2em] text-stone2-400 hover:text-cream-50 transition-colors"
              >
                Crédits
              </Link>
              <Link
                href="/subscriptions"
                className="text-[11px] uppercase tracking-[0.2em] text-stone2-400 hover:text-cream-50 transition-colors"
              >
                Abonnements
              </Link>
              {user?.role === "INSTRUCTOR" && (
                <Link
                  href="/instructor"
                  className="text-[11px] uppercase tracking-[0.2em] text-accent-300 hover:text-accent-200 transition-colors"
                >
                  Espace pro
                </Link>
              )}
              {user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-[11px] uppercase tracking-[0.2em] text-accent-300 hover:text-accent-200 transition-colors"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          {/* Right: credits + account + CTA */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/packs"
                  className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-accent-300 hover:text-accent-200 transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
                  {user.creditsBalance} crédit{user.creditsBalance > 1 ? "s" : ""}
                </Link>
                <Link
                  href="/account"
                  className="text-[11px] uppercase tracking-[0.2em] text-stone2-300 hover:text-cream-50 transition-colors"
                >
                  {user.firstName}
                </Link>
                <Link
                  href="/schedule"
                  className="text-[11px] uppercase tracking-[0.2em] px-5 py-2.5 bg-cream-50 text-brand-600 hover:bg-accent-200 transition-colors font-semibold"
                >
                  Réserver
                </Link>
                <form action={logoutAction}>
                  <button className="text-[10px] uppercase tracking-[0.2em] text-stone2-500 hover:text-stone2-300 transition-colors">
                    Sortir
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[11px] uppercase tracking-[0.2em] text-stone2-300 hover:text-cream-50 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/schedule"
                  className="text-[11px] uppercase tracking-[0.2em] px-5 py-2.5 bg-cream-50 text-brand-600 hover:bg-accent-200 transition-colors font-semibold"
                >
                  Réserver
                </Link>
              </>
            )}
          </div>

          {/* Mobile: credit pill + hamburger */}
          <div className="flex md:hidden items-center gap-3">
            {user && (
              <Link
                href="/packs"
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-accent-300 hover:text-accent-200 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
                {user.creditsBalance} cr.
              </Link>
            )}
            <MobileMenu user={user} />
          </div>

        </div>
      </div>
    </header>
  );
}
