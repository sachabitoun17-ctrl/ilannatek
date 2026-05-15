"use client";

import { useState } from "react";
import Link from "next/link";

type Group = {
  title: string;
  items: { href: string; label: string }[];
};

export default function AdminSidebar({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-stone2-500 mb-4 px-3 py-2 border border-stone2-200 w-full"
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Menu administration
      </button>

      <aside className={`${open ? "block" : "hidden"} md:block space-y-5`}>
        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="text-[10px] uppercase tracking-[0.22em] text-stone2-400 px-3 py-2">
              {g.title}
            </h2>
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-sm text-stone2-700 hover:bg-cream-100 hover:text-brand-600 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </aside>
    </>
  );
}
