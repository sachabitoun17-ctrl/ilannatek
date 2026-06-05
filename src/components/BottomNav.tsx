"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

export default function BottomNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex bg-brand-600 border-t border-stone2-700 safe-area-inset-bottom">
      {/* Planning */}
      <Link
        href="/schedule"
        className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
          isActive("/schedule") ? "text-cream-50" : "text-stone2-500 hover:text-stone2-300"
        }`}
      >
        <CalendarIcon />
        <span className="text-[9px] uppercase tracking-widest">Planning</span>
      </Link>

      {/* Classes */}
      <Link
        href="/classes"
        className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
          isActive("/classes") ? "text-cream-50" : "text-stone2-500 hover:text-stone2-300"
        }`}
      >
        <GridIcon />
        <span className="text-[9px] uppercase tracking-widest">Cours</span>
      </Link>

      {/* Réserver — center CTA */}
      <Link
        href="/schedule"
        className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 bg-cream-50 text-brand-600 hover:bg-accent-200 transition-colors"
      >
        <PlusIcon />
        <span className="text-[9px] uppercase tracking-widest font-semibold">Réserver</span>
      </Link>

      {/* Crédits */}
      <Link
        href="/packs"
        className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
          isActive("/packs") || isActive("/subscriptions") ? "text-cream-50" : "text-stone2-500 hover:text-stone2-300"
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v1m0 6v1M9.5 9.5C9.5 8.67 10.67 8 12 8s2.5.67 2.5 1.5S13.33 11 12 11s-2.5.67-2.5 1.5S10.67 14.5 12 14.5s2.5-.67 2.5-1.5" />
        </svg>
        <span className="text-[9px] uppercase tracking-widest">Crédits</span>
      </Link>

      {/* Compte */}
      <Link
        href={isLoggedIn ? "/account" : "/login"}
        className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
          isActive("/account") ? "text-cream-50" : "text-stone2-500 hover:text-stone2-300"
        }`}
      >
        <PersonIcon />
        <span className="text-[9px] uppercase tracking-widest">
          {isLoggedIn ? "Compte" : "Connexion"}
        </span>
      </Link>
    </nav>
  );
}
