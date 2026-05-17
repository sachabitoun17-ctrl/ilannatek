"use client";

import { useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  creditsBalance: number;
} | null;

const NAV_LINKS = [
  { href: "/schedule", label: "Planning" },
  { href: "/classes", label: "Cours" },
  { href: "/instructors", label: "Instructeurs" },
  { href: "/packs", label: "Crédits" },
  { href: "/subscriptions", label: "Abonnements" },
];

export default function MobileMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        className="md:hidden flex flex-col gap-1.5 p-2 ml-2"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <span className="block w-6 h-px bg-cream-50" />
        <span className="block w-6 h-px bg-cream-50" />
        <span className="block w-4 h-px bg-cream-50" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-brand-600/70 backdrop-blur-sm"
            onClick={close}
          />
          <div className="absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-brand-600 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone2-700">
              <Link
                href="/"
                onClick={close}
                className="font-serif text-2xl tracking-[0.18em] uppercase text-cream-50"
              >
                Ilannatek
              </Link>
              <button
                onClick={close}
                className="text-stone2-400 hover:text-cream-50 text-2xl leading-none"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            {/* User info */}
            {user && (
              <div className="px-6 py-4 border-b border-stone2-700">
                <p className="text-cream-50 font-medium text-sm">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-accent-300 mt-0.5">
                  {user.creditsBalance} crédits
                </p>
              </div>
            )}

            {/* Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={close}
                  className="block px-3 py-3 text-[11px] uppercase tracking-[0.22em] text-stone2-300 hover:text-cream-50 hover:bg-brand-700 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              {user?.role === "INSTRUCTOR" && (
                <Link
                  href="/instructor"
                  onClick={close}
                  className="block px-3 py-3 text-[11px] uppercase tracking-[0.22em] text-stone2-300 hover:text-cream-50 hover:bg-brand-700 transition-colors"
                >
                  Espace pro
                </Link>
              )}
              {user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  onClick={close}
                  className="block px-3 py-3 text-[11px] uppercase tracking-[0.22em] text-stone2-300 hover:text-cream-50 hover:bg-brand-700 transition-colors"
                >
                  Admin
                </Link>
              )}
              {user && (
                <Link
                  href="/account"
                  onClick={close}
                  className="block px-3 py-3 text-[11px] uppercase tracking-[0.22em] text-stone2-300 hover:text-cream-50 hover:bg-brand-700 transition-colors"
                >
                  Mon compte
                </Link>
              )}
            </nav>

            {/* Footer actions */}
            <div className="px-6 py-5 border-t border-stone2-700 space-y-3">
              <Link
                href="/schedule"
                onClick={close}
                className="block text-center px-6 py-3 text-[11px] uppercase tracking-[0.18em] bg-cream-50 text-brand-600 hover:bg-accent-200 transition-colors font-semibold"
              >
                Réserver →
              </Link>
              {user ? (
                <form action={logoutAction} className="text-center">
                  <button className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 hover:text-cream-50 transition-colors py-1">
                    Déconnexion
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  onClick={close}
                  className="block text-center text-[10px] uppercase tracking-[0.2em] text-stone2-400 hover:text-cream-50 transition-colors py-1"
                >
                  Se connecter
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
