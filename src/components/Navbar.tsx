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
    <header className="bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-10">
            <Link
              href="/"
              className="text-white font-semibold text-sm tracking-[0.2em] uppercase"
            >
              ILANNATEK
            </Link>

            {/* Main nav */}
            <nav className="hidden md:flex items-center gap-7">
              <Link
                href="/schedule"
                className="text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
              >
                Planning
              </Link>
              <Link
                href="/packs"
                className="text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
              >
                Crédits
              </Link>
              <Link
                href="/subscriptions"
                className="text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
              >
                Abonnements
              </Link>
              {user?.role === "INSTRUCTOR" && (
                <Link
                  href="/instructor"
                  className="text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                >
                  Espace pro
                </Link>
              )}
              {user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="hidden sm:inline-block text-gray-500 text-xs">
                  {user.creditsBalance} crédits
                </span>
                <Link
                  href="/account"
                  className="text-xs uppercase tracking-widest text-gray-300 hover:text-white transition-colors"
                >
                  {user.firstName}
                </Link>
                <Link
                  href="/schedule"
                  className="text-xs uppercase tracking-wider px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors"
                >
                  Réserver
                </Link>
                <form action={logoutAction}>
                  <button className="text-xs uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors">
                    Déconnexion
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs uppercase tracking-widest text-gray-300 hover:text-white transition-colors"
                >
                  Mon compte
                </Link>
                <Link
                  href="/schedule"
                  className="text-xs uppercase tracking-wider px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors"
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
