export function encodeRefCode(userId: string): string {
  return Buffer.from(userId).toString("base64url");
}

export function decodeRefCode(code: string): string | null {
  try {
    const decoded = Buffer.from(code, "base64url").toString("utf8");
    if (decoded.length < 10 || decoded.length > 50) return null;
    return decoded;
  } catch {
    return null;
  }
}
