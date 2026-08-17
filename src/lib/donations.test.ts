import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthorizationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AUTHORIZATION_TEXT_VERSION } from "./authorization-text";
import {
  activateAuthorization,
  cancelActiveAuthorization,
  getActiveAuthorization,
} from "./donations";

const EVIDENCE = {
  email: "vitest-donations@test.example.com",
  ipAddress: "127.0.0.1",
  userAgent: "vitest",
};

let companyId: string;
let employeeId: string;
let createdFoundationId: string | null = null;

beforeAll(async () => {
  const foundation = await db.foundation.findFirst();
  if (!foundation) {
    const created = await db.foundation.create({
      data: {
        displayName: "Fundación Vitest",
        legalName: "Fundación Vitest",
        nit: `vitest-${Date.now()}`,
      },
    });
    createdFoundationId = created.id;
  }
  const company = await db.company.create({
    data: { name: "Vitest Co SAS", nit: `vitest-co-${Date.now()}` },
  });
  companyId = company.id;
  const employee = await db.employee.create({
    data: {
      companyId,
      externalId: "VT-001",
      name: "Empleado Vitest",
      documentNumber: "999999999",
      email: EVIDENCE.email,
    },
  });
  employeeId = employee.id;
});

afterAll(async () => {
  await db.donationAuthorization.deleteMany({ where: { employeeId } });
  await db.employee.deleteMany({ where: { companyId } });
  await db.company.delete({ where: { id: companyId } });
  if (createdFoundationId) {
    await db.foundation.delete({ where: { id: createdFoundationId } });
  }
  await db.$disconnect();
});

describe("donation authorization lifecycle", () => {
  it("activates an authorization with full consent evidence", async () => {
    const created = await activateAuthorization(employeeId, 20_000, EVIDENCE);
    expect(created.status).toBe(AuthorizationStatus.ACTIVE);
    expect(created.amount).toBe(20_000);
    expect(created.authorizationTextVersion).toBe(AUTHORIZATION_TEXT_VERSION);

    const metadata = created.metadata as Record<string, unknown>;
    expect(metadata.authorizationText).toContain("Autorizo voluntariamente");
    expect(metadata.authorizationText).toContain("$20.000");
    expect(metadata.email).toBe(EVIDENCE.email);
    expect(metadata.ipAddress).toBe(EVIDENCE.ipAddress);
    expect(metadata.userAgent).toBe(EVIDENCE.userAgent);
    expect(metadata.documentNumber).toBe("999999999");

    expect((await getActiveAuthorization(employeeId))?.id).toBe(created.id);
  });

  it("supersedes the previous authorization on amount change", async () => {
    const previous = await getActiveAuthorization(employeeId);
    const replacement = await activateAuthorization(employeeId, 50_000, EVIDENCE);

    const superseded = await db.donationAuthorization.findUniqueOrThrow({
      where: { id: previous!.id },
    });
    expect(superseded.status).toBe(AuthorizationStatus.SUPERSEDED);
    expect(superseded.supersededById).toBe(replacement.id);
    expect(superseded.amount).toBe(20_000); // original consent untouched

    const activeCount = await db.donationAuthorization.count({
      where: { employeeId, status: AuthorizationStatus.ACTIVE },
    });
    expect(activeCount).toBe(1);
  });

  it("keeps exactly one ACTIVE authorization under concurrent confirmations", async () => {
    await Promise.all([
      activateAuthorization(employeeId, 10_000, EVIDENCE),
      activateAuthorization(employeeId, 30_000, EVIDENCE),
    ]);
    const activeCount = await db.donationAuthorization.count({
      where: { employeeId, status: AuthorizationStatus.ACTIVE },
    });
    expect(activeCount).toBe(1);
  });

  it("cancels immediately and preserves all history", async () => {
    const totalBefore = await db.donationAuthorization.count({ where: { employeeId } });

    expect(await cancelActiveAuthorization(employeeId)).toBe(true);
    expect(await getActiveAuthorization(employeeId)).toBeNull();

    const cancelled = await db.donationAuthorization.findFirst({
      where: { employeeId, status: AuthorizationStatus.CANCELLED },
    });
    expect(cancelled?.cancelledAt).toBeInstanceOf(Date);

    // cancelling again is a harmless no-op
    expect(await cancelActiveAuthorization(employeeId)).toBe(false);

    const totalAfter = await db.donationAuthorization.count({ where: { employeeId } });
    expect(totalAfter).toBe(totalBefore);
  });

  it("allows re-activating after cancellation", async () => {
    const reactivated = await activateAuthorization(employeeId, 20_000, EVIDENCE);
    expect(reactivated.status).toBe(AuthorizationStatus.ACTIVE);
    await cancelActiveAuthorization(employeeId);
  });
});
