import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
// Invitations travel by email and get opened days later.
export const INVITATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createLoginToken(
  email: string,
  ttlMs: number = LOGIN_TOKEN_TTL_MS,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.loginToken.create({
    data: {
      tokenHash: hashToken(token),
      email,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return token;
}

// Read-only validity check — does NOT consume the token. Used by the
// verify page so that email scanners prefetching the GET can't burn the
// single-use token; consumption only happens on the explicit POST.
export async function peekLoginToken(token: string): Promise<boolean> {
  const record = await db.loginToken.findUnique({ where: { tokenHash: hashToken(token) } });
  return record !== null && record.usedAt === null && record.expiresAt >= new Date();
}

// Returns the email the token was issued for, or null if the token is
// unknown, expired, or already used. Single use is enforced atomically:
// the conditional updateMany means concurrent requests can't both win.
export async function consumeLoginToken(token: string): Promise<string | null> {
  const record = await db.loginToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.expiresAt < new Date()) return null;
  const claimed = await db.loginToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return claimed.count === 1 ? record.email : null;
}
