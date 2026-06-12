export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { startOfDay, endOfDay, addDays } from "@/lib/utils";

type SearchParams = {
  days?: string;
  location?: string;
  color?: string;
  siteUrl?: string;
  studio?: string;
  theme?: string;
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });
}

export default async function WidgetSchedulePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const days = Math.min(Math.max(parseInt(searchParams.days ?? "7"), 1), 30);
  const locationId = searchParams.location ?? undefined;
  const accent = searchParams.color ?? "#3d2b1f";
  const siteUrl = (searchParams.siteUrl ?? "").replace(/\/$/, "");
  const studio = searchParams.studio ?? "Studio";
  const dark = searchParams.theme === "dark";

  const bg = dark ? "#18120e" : "#ffffff";
  const surface = dark ? "#241a13" : "#faf9f7";
  const border = dark ? "#3a2a1e" : "#e8e3de";
  const textPrimary = dark ? "#f5ede6" : "#1c1008";
  const textMuted = dark ? "#8a7060" : "#8a7060";
  const fullTag = dark ? "#4a1a1a" : "#fdecea";
  const fullText = dark ? "#f87171" : "#b91c1c";
  const freeTag = dark ? "#0f2e1a" : "#ecfdf5";
  const freeText = dark ? "#4ade80" : "#15803d";

  const now = new Date();
  const rangeStart = startOfDay(now);
  const rangeEnd = endOfDay(addDays(now, days - 1));

  const sessions = await db.session.findMany({
    where: {
      startTime: { gte: rangeStart, lte: rangeEnd },
      status: "SCHEDULED",
      ...(locationId ? { locationId } : {}),
    },
    include: {
      classType: {
        select: { id: true, name: true, color: true, durationMin: true },
      },
      instructor: { select: { firstName: true, lastName: true } },
      location: { select: { name: true } },
      bookings: {
        where: { status: { not: "CANCELLED" } },
        select: { status: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  // Group by day (Paris date string as key for correct TZ grouping)
  const dayMap = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = s.startTime.toLocaleDateString("fr-FR", {
      timeZone: "Europe/Paris",
    });
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(s);
  }
  const grouped = [...dayMap.entries()].map(([, daySessions]) => ({
    date: daySessions[0].startTime,
    sessions: daySessions,
  }));

  const bookingUrl = siteUrl ? `${siteUrl}/schedule` : null;

  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        backgroundColor: bg,
        color: textPrimary,
        minHeight: "100%",
        fontSize: "14px",
        lineHeight: "1.5",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          borderBottom: `2px solid ${accent}`,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: bg,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {studio}
        </span>
        <span
          style={{
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: textMuted,
          }}
        >
          Planning
        </span>
      </div>

      {/* Body */}
      <div style={{ backgroundColor: surface, minHeight: "calc(100% - 45px)" }}>
        {grouped.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: textMuted,
              fontSize: "13px",
            }}
          >
            Aucun cours programmé sur les {days} prochains jours.
          </div>
        ) : (
          grouped.map(({ date, sessions: daySessions }) => (
            <div key={date.toISOString()}>
              {/* Day heading */}
              <div
                style={{
                  padding: "10px 16px 6px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: textMuted,
                  borderTop: `1px solid ${border}`,
                  backgroundColor: bg,
                  marginTop: "2px",
                }}
              >
                {formatDayLabel(date)}
              </div>

              {/* Session cards */}
              <div
                style={{
                  padding: "0 12px 8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {daySessions.map((s) => {
                  const confirmed = s.bookings.filter(
                    (b) => b.status === "CONFIRMED"
                  ).length;
                  const spotsLeft = Math.max(0, s.capacity - confirmed);
                  const isFull = spotsLeft === 0;
                  const cardColor = s.classType.color || accent;

                  return (
                    <div
                      key={s.id}
                      style={{
                        backgroundColor: bg,
                        border: `1px solid ${border}`,
                        display: "flex",
                        overflow: "hidden",
                        borderRadius: "2px",
                      }}
                    >
                      {/* Color strip */}
                      <div
                        style={{
                          width: "4px",
                          flexShrink: 0,
                          backgroundColor: cardColor,
                        }}
                      />

                      {/* Main content */}
                      <div
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          minWidth: 0,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: "13px",
                              color: textPrimary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {s.classType.name}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: textMuted,
                              marginTop: "2px",
                            }}
                          >
                            {formatTime(s.startTime)} – {formatTime(s.endTime)}
                            {" · "}
                            {s.instructor.firstName} {s.instructor.lastName}
                          </div>
                          {/* Spots badge */}
                          <div
                            style={{
                              display: "inline-block",
                              marginTop: "5px",
                              padding: "2px 6px",
                              fontSize: "10px",
                              fontWeight: 600,
                              letterSpacing: "0.06em",
                              backgroundColor: isFull ? fullTag : freeTag,
                              color: isFull ? fullText : freeText,
                              borderRadius: "2px",
                            }}
                          >
                            {isFull
                              ? "Complet"
                              : `${spotsLeft} place${spotsLeft > 1 ? "s" : ""}`}
                          </div>
                        </div>

                        {/* CTA */}
                        {!isFull && bookingUrl && (
                          <a
                            href={bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "7px 12px",
                              backgroundColor: accent,
                              color: "#ffffff",
                              fontSize: "10px",
                              fontWeight: 700,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              textDecoration: "none",
                              flexShrink: 0,
                              whiteSpace: "nowrap",
                              borderRadius: "1px",
                            }}
                          >
                            Réserver →
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Powered-by footer */}
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            borderTop: `1px solid ${border}`,
            marginTop: "8px",
          }}
        >
          <a
            href={siteUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "9px",
              color: textMuted,
              textDecoration: "none",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.6,
            }}
          >
            Réservation en ligne · {studio}
          </a>
        </div>
      </div>
    </div>
  );
}
