import { headers } from "next/headers";
import { db } from "./db";

export async function audit(opts: {
  actorId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  let ip: string | undefined;
  try {
    const h = headers();
    ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      undefined;
  } catch {
    // outside request scope; ignore
  }
  await db.auditLog.create({
    data: {
      actorId: opts.actorId ?? null,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      ip,
    },
  });
}
