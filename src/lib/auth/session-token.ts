import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "@prisma/client";

export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

export type SessionPayload = {
  userId: string;
  role: UserRole;
};

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const role = payload.role;
    if (typeof payload.sub !== "string" || typeof role !== "string") return null;
    if (!Object.values(UserRole).includes(role as UserRole)) return null;
    return { userId: payload.sub, role: role as UserRole };
  } catch {
    return null;
  }
}
