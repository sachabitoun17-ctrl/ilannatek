import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Ilannatek — Studio Boutique",
  description:
    "Réservez vos cours dans notre studio boutique. Planning, packs de crédits et abonnements disponibles en ligne.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <html lang="fr">
      <body className="min-h-screen bg-cream-50 text-brand-600">
        <Navbar user={user} />
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="mt-20 border-t border-stone2-200 bg-cream-100">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone2-500">
              Ilannatek — Studio Boutique
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone2-400">
              © {new Date().getFullYear()} · Tous droits réservés
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
