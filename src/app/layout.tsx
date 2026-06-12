import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { getCurrentUser } from "@/lib/auth";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Ilannatek — Studio Boutique",
  description:
    "Réservez vos cours dans notre studio boutique. Planning, packs de crédits et abonnements disponibles en ligne.",
  icons: {
    icon: "/icon-192",
    apple: "/icon-192",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ilannatek",
  },
  openGraph: {
    title: "Ilannatek — Studio Boutique",
    description: "Réservez vos cours en quelques secondes.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get("x-invoke-path") ?? "";
  const isWidget = pathname.startsWith("/widget");

  // Widget pages get a bare shell — no nav, no footer, no chrome
  if (isWidget) {
    return (
      <html lang="fr">
        <body className="min-h-screen bg-white text-brand-600">{children}</body>
      </html>
    );
  }

  const user = await getCurrentUser();
  const isLoggedIn = !!user;
  return (
    <html lang="fr">
      <body className="min-h-screen bg-cream-50 text-brand-600">
        <Navbar user={user} />
        {/* pb-20 on mobile so bottom nav doesn't overlap content */}
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 pb-24 md:pb-10">
          {children}
        </main>
        <footer className="mt-20 border-t border-stone2-200 bg-cream-100 md:block pb-20 md:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone2-500">
              Ilannatek — Studio Boutique
            </p>
            <div className="flex flex-wrap gap-6">
              <a href="/classes" className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 hover:text-brand-600 transition-colors">Cours</a>
              <a href="/instructors" className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 hover:text-brand-600 transition-colors">Instructeurs</a>
              <a href="/schedule" className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 hover:text-brand-600 transition-colors">Planning</a>
              <a href="/packs" className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 hover:text-brand-600 transition-colors">Crédits</a>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone2-400">
              © {new Date().getFullYear()} · Tous droits réservés
            </p>
          </div>
        </footer>
        <BottomNav isLoggedIn={isLoggedIn} />
      </body>
    </html>
  );
}
