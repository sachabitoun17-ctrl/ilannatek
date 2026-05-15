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
    <header className="bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold text-xl text-brand-600">
              ilannatek
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
              <Link href="/schedule" className="hover:text-brand-600">
                Planning
              </Link>
              <Link href="/packs" className="hover:text-brand-600">
                Crédits
              </Link>
              <Link href="/subscriptions" className="hover:text-brand-600">
                Abonnements
              </Link>
              {user?.role === "ADMIN" && (
                <Link href="/admin" className="hover:text-brand-600 text-brand-700">
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <span className="hidden sm:inline-block badge bg-brand-100 text-brand-700">
                  {user.creditsBalance} crédits
                </span>
                <Link href="/account" className="text-gray-700 hover:text-brand-600 font-medium">
                  {user.firstName}
                </Link>
                <form action={logoutAction}>
                  <button className="btn-ghost text-gray-500">Déconnexion</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">
                  Connexion
                </Link>
                <Link href="/register" className="btn-primary">
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
