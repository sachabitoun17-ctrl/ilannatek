"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { formatTime } from "@/lib/utils";
import Link from "next/link";

type Session = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  classType: { name: string; color: string; durationMin: number };
  location: { name: string };
  confirmedCount: number;
  waitlistCount: number;
  capacity: number;
};

type DayData = {
  date: string; // ISO date string YYYY-MM-DD
  sessions: Session[];
};

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_LABELS = [
  "jan", "fév", "mar", "avr", "mai", "juin",
  "juil", "août", "sep", "oct", "nov", "déc",
];

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfMonday(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = (day + 6) % 7;
  const r = new Date(d);
  r.setDate(r.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function InstructorCalendar({
  days,
  weekStart,
}: {
  days: DayData[];
  weekStart: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const ws = new Date(weekStart + "T00:00:00");

  function navigate(n: number) {
    const next = addDays(ws, n * 7);
    startTransition(() => {
      router.push(`/instructor/calendar?week=${toISO(next)}`);
    });
  }

  function goToday() {
    const monday = startOfMonday(new Date());
    startTransition(() => {
      router.push(`/instructor/calendar?week=${toISO(monday)}`);
    });
  }

  const todayISO = toISO(new Date());
  const weekEnd = addDays(ws, 6);

  const totalSessions = days.reduce((s, d) => s + d.sessions.length, 0);

  return (
    <div className="space-y-4">
      {/* Week nav */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded border border-stone2-200 hover:bg-stone2-50 text-stone2-600 transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 flex items-center justify-center rounded border border-stone2-200 hover:bg-stone2-50 text-stone2-600 transition-colors"
          >
            ›
          </button>
          <span className="text-sm font-medium text-brand-600 ml-2">
            {ws.getDate()} {MONTH_LABELS[ws.getMonth()]} – {weekEnd.getDate()}{" "}
            {MONTH_LABELS[weekEnd.getMonth()]} {weekEnd.getFullYear()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone2-500">
            {totalSessions} cours cette semaine
          </span>
          <button
            onClick={goToday}
            className="text-xs btn-secondary py-1 px-3"
          >
            Aujourd&apos;hui
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 overflow-x-auto">
        {days.map((day, i) => {
          const d = new Date(day.date + "T00:00:00");
          const isToday = day.date === todayISO;
          return (
            <div key={day.date} className="min-w-[100px]">
              {/* Day header */}
              <div
                className={`text-center py-2 mb-1 rounded text-xs font-medium uppercase tracking-widest ${
                  isToday
                    ? "bg-brand-600 text-cream-50"
                    : "text-stone2-500"
                }`}
              >
                <div>{DAY_LABELS[i]}</div>
                <div className={`text-lg font-serif mt-0.5 ${isToday ? "text-cream-50" : "text-brand-600"}`}>
                  {d.getDate()}
                </div>
              </div>

              {/* Sessions */}
              <div className="space-y-1">
                {day.sessions.length === 0 ? (
                  <div className="h-10 rounded border border-dashed border-stone2-100" />
                ) : (
                  day.sessions.map((s) => {
                    const fillPct = Math.round((s.confirmedCount / s.capacity) * 100);
                    const isFull = s.confirmedCount >= s.capacity;
                    return (
                      <Link
                        key={s.id}
                        href={`/instructor/sessions/${s.id}`}
                        className="block rounded px-2 py-1.5 hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: s.classType.color + "22", borderLeft: `3px solid ${s.classType.color}` }}
                      >
                        <p className="text-[11px] font-semibold text-brand-600 leading-tight truncate">
                          {s.classType.name}
                        </p>
                        <p className="text-[10px] text-stone2-500 mt-0.5">
                          {formatTime(new Date(s.startTime))}
                        </p>
                        <p className="text-[10px] text-stone2-500">
                          {s.confirmedCount}/{s.capacity}
                          {isFull && (
                            <span className="ml-1 text-red-500">complet</span>
                          )}
                        </p>
                        {/* Fill bar */}
                        <div className="mt-1 h-0.5 bg-stone2-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${fillPct}%`,
                              backgroundColor: s.classType.color,
                            }}
                          />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalSessions === 0 && (
        <p className="text-center text-sm text-stone2-400 py-8 italic">
          Aucun cours programmé cette semaine
        </p>
      )}
    </div>
  );
}
