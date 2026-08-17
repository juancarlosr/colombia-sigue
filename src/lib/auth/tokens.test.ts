import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { consumeLoginToken, createLoginToken, hashToken } from "./tokens";

const TEST_EMAIL = "vitest-tokens@test.example.com";

afterAll(async () => {
  await db.loginToken.deleteMany({ where: { email: TEST_EMAIL } });
  await db.$disconnect();
});

describe("login tokens (database)", () => {
  it("consumes a valid token exactly once", async () => {
    const token = await createLoginToken(TEST_EMAIL);
    expect(await consumeLoginToken(token)).toBe(TEST_EMAIL);
    expect(await consumeLoginToken(token)).toBeNull();
  });

  it("rejects an unknown token", async () => {
    expect(await consumeLoginToken("does-not-exist")).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await createLoginToken(TEST_EMAIL);
    await db.loginToken.update({
      where: { tokenHash: hashToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await consumeLoginToken(token)).toBeNull();
  });

  it("only wins one of two concurrent consumptions", async () => {
    const token = await createLoginToken(TEST_EMAIL);
    const results = await Promise.all([consumeLoginToken(token), consumeLoginToken(token)]);
    expect(results.filter((r) => r === TEST_EMAIL)).toHaveLength(1);
    expect(results.filter((r) => r === null)).toHaveLength(1);
  });
});
