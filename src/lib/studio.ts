import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export type StudioContext = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
};

/**
 * Resolves a studio from its URL slug. Throws notFound() if inactive or absent.
 * Wrapped in React cache() so multiple RSC calls within the same request are deduplicated.
 */
export const getStudioContext = cache(async (slug: string): Promise<StudioContext> => {
  const studio = await db.studio.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, timezone: true, status: true },
  });
  if (!studio || studio.status !== "ACTIVE") notFound();
  return { id: studio.id, name: studio.name, slug: studio.slug, timezone: studio.timezone };
});

/**
 * Helper to build a where-clause fragment that scopes queries to a studio.
 * Pass `studioId` (string) to scope, or null/undefined to skip scoping (SUPERADMIN).
 *
 * Usage: db.session.findMany({ where: { ...scopeWhere(studioId), startTime: { gt: now } } })
 */
export function scopeWhere(studioId: string | null | undefined): { studioId?: string } {
  return studioId ? { studioId } : {};
}
