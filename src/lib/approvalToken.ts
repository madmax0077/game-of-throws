import crypto from "crypto";

/**
 * Compact, HMAC-signed approval token used in the "Approve from email"
 * link sent to the admin when a new tournament is submitted.
 *
 * Format:  base64url(payload) "." base64url(sig)
 * Payload: "<tournamentId>|<expiryUnixSeconds>"
 * Sig:     HMAC-SHA256(payload, NEXTAUTH_SECRET)
 *
 * The link is single-purpose: it can only flip a PENDING tournament to
 * APPROVED. Re-using it after the tournament has already been approved
 * or after the TTL elapses is a no-op (the approve page renders a
 * "nothing to do" message).
 */

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required to sign approval tokens.");
  }
  return secret;
}

function sign(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

export function createApprovalToken(
  tournamentId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${tournamentId}|${exp}`;
  const sig = sign(payload, getSecret());
  const b64Payload = Buffer.from(payload, "utf8").toString("base64url");
  return `${b64Payload}.${sig}`;
}

export function verifyApprovalToken(
  token: string | null | undefined
): { tournamentId: string } | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [b64Payload, sig] = parts;
    const payload = Buffer.from(b64Payload, "base64url").toString("utf8");
    const expectedSig = sign(payload, getSecret());
    // Constant-time compare. crypto.timingSafeEqual requires equal-length
    // buffers — if anyone hands us a wrong-length sig, bail out instead.
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    const [tournamentId, expStr] = payload.split("|");
    if (!tournamentId || !expStr) return null;
    const exp = Number(expStr);
    if (!Number.isFinite(exp)) return null;
    if (exp < Math.floor(Date.now() / 1000)) return null;
    return { tournamentId };
  } catch {
    return null;
  }
}
