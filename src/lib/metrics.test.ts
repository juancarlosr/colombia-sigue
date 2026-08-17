import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthorizationStatus, ContributionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getPilotMetrics } from "./metrics";

let companyId: string;

beforeAll(async () => {
  const company = await db.company.create({
    data: { name: "Metrics Test SAS", nit: `metrics-${Date.now()}` },
  });
  companyId = company.id;

  const invitedAt = new Date("2026-05-20T09:00:00-05:00");
  const makeEmployee = (n: string, invited: boolean) =>
    db.employee.create({
      data: {
        companyId,
        externalId: `MT-${n}`,
        name: `Métrica ${n}`,
        documentNumber: n,
        email: `metrics-${n}-${Date.now()}@test.example.com`,
        invitedAt: invited ? invitedAt : null,
      },
    });
  const emp1 = await makeEmployee("1", true);
  const emp2 = await makeEmployee("2", true);
  await makeEmployee("3", true); // invited, never authorized

  const makeAuth = (employeeId: string, amount: number, status: AuthorizationStatus) =>
    db.donationAuthorization.create({
      data: {
        employeeId,
        amount,
        status,
        authorizationTextVersion: "v0-draft",
        metadata: {},
      },
    });
  const auth1 = await makeAuth(emp1.id, 20_000, AuthorizationStatus.ACTIVE);
  const auth2 = await makeAuth(emp2.id, 10_000, AuthorizationStatus.CANCELLED);

  const makePeriod = (month: number) =>
    db.payrollPeriod.create({ data: { companyId, month, year: 2026 } });
  const june = await makePeriod(6);
  await makePeriod(7);
  const august = await makePeriod(8);

  const contribute = (
    periodId: string,
    employeeId: string,
    authorizationId: string,
    amount: number,
    status: ContributionStatus,
  ) =>
    db.payrollContribution.create({
      data: {
        payrollPeriodId: periodId,
        employeeId,
        authorizationId,
        amountAuthorized: amount,
        amountDeducted: amount,
        status,
      },
    });

  // June (first month): both donors deduct; emp1's is already RECEIVED.
  await contribute(june.id, emp1.id, auth1.id, 20_000, ContributionStatus.RECEIVED);
  await contribute(june.id, emp2.id, auth2.id, 10_000, ContributionStatus.DEDUCTED);
  // August (third month): only emp1 still contributes.
  await contribute(august.id, emp1.id, auth1.id, 20_000, ContributionStatus.DEDUCTED);
});

afterAll(async () => {
  await db.payrollContribution.deleteMany({ where: { payrollPeriod: { companyId } } });
  await db.payrollPeriod.deleteMany({ where: { companyId } });
  await db.donationAuthorization.deleteMany({ where: { employee: { companyId } } });
  await db.employee.deleteMany({ where: { companyId } });
  await db.company.delete({ where: { id: companyId } });
  await db.$disconnect();
});

describe("pilot metrics (spec §24)", () => {
  it("computes all six metrics from raw data", async () => {
    const metrics = await getPilotMetrics(companyId);
    expect(metrics.invited).toBe(3);
    expect(metrics.activationRate).toBeCloseTo(2 / 3);
    expect(metrics.averageContribution).toBe(20_000);
    expect(metrics.firstDeductionRate).toBe(1); // both authorized employees deducted
    expect(metrics.threeMonthRetention).toBe(0.5); // 1 of June's 2 donors remains in August
    expect(metrics.totalReceived).toBe(20_000);
  });
});
