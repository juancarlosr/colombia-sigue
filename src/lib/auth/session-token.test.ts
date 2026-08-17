import { beforeAll, describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { signSessionToken, verifySessionToken } from "./session-token";

beforeAll(() => {
  process.env.SESSION_SECRET ??= "test-secret-with-at-least-32-characters!";
});

describe("session tokens", () => {
  it("round-trips a valid payload", async () => {
    const token = await signSessionToken({ userId: "user-1", role: UserRole.EMPLOYEE });
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ userId: "user-1", role: UserRole.EMPLOYEE });
  });

  it("rejects a tampered token", async () => {
    const token = await signSessionToken({ userId: "user-1", role: UserRole.EMPLOYEE });
    const [header, body] = token.split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({ sub: "user-1", role: UserRole.PLATFORM_ADMIN }),
    ).toString("base64url");
    expect(await verifySessionToken(`${header}.${forgedBody}.${token.split(".")[2]}`)).toBeNull();
    expect(await verifySessionToken(`${token}x`)).toBeNull();
    expect(await verifySessionToken(`${header}.${body}.`)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const original = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "another-secret-with-at-least-32-chars!!";
    const token = await signSessionToken({ userId: "user-1", role: UserRole.EMPLOYEE });
    process.env.SESSION_SECRET = original;
    expect(await verifySessionToken(token)).toBeNull();
  });
});
