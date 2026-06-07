export function encodeRefCode(userId: string): string {
  return Buffer.from(userId).toString("base64url");
}

const CUID_RE = /^[a-z0-9]{20,30}$/i;

export function decodeRefCode(code: string): string | null {
  try {
    const decoded = Buffer.from(code, "base64url").toString("utf8");
    // Validate it looks like a Prisma cuid (alphanumeric, 20-30 chars) — rejects arbitrary strings
    if (!CUID_RE.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}
