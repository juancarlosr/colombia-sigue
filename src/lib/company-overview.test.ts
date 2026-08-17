import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthorizationStatus, ContributionStatus, EmployeeStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCompaniesOverview, getCompanyDetail } from "./company-overview";

let companyId: string;

beforeAll(async () => {
  const company = await db.company.create({
    data: { name: "Overview Test SAS", nit: `overview-${Date.now()}` },
  });
  companyId = company.id;

  const makeEmployee = (n: string, status: EmployeeStatus) =>
    db.employee.create({
      data: {
        companyId,
        externalId: `OV-${n}`,
        name: `Overview ${n}`,
        documentNumber: n,
        email: `overview-${n}-${Date.now()}@test.example.com`,
        status,
        invitedAt: status === EmployeeStatus.IMPORTED ? null : new Date(),
      },
    });
  const donor = await makeEmployee("1", EmployeeStatus.ACTIVATED);
  await makeEmployee("2", EmployeeStatus.INVITED);
  await makeEmployee("3", EmployeeStatus.IMPORTED);

  const auth = await db.donationAuthorization.create({
    data: {
      employeeId: donor.id,
      amount: 20_000,
      status: AuthorizationStatus.ACTIVE,
      authorizationTextVersion: "v0-draft",
      metadata: {},
    },
  });

  const june = await db.payrollPeriod.create({
    data: {
      companyId,
      month: 6,
      year: 2026,
      transferAmount: 20_000,
      transferDate: new Date("2026-06-30T12:00:00-05:00"),
      transferBankReference: "TRX-OV",
      foundationReceivedAt: new Date("2026-07-02T12:00:00-05:00"),
    },
  });
  const july = await db.payrollPeriod.create({ data: { companyId, month: 7, year: 2026 } });
  await db.payrollContribution.create({
    data: {
      payrollPeriodId: june.id,
      employeeId: donor.id,
      authorizationId: auth.id,
      amountAuthorized: 20_000,
      amountDeducted: 20_000,
      status: ContributionStatus.RECEIVED,
    },
  });
  await db.payrollContribution.create({
    data: {
      payrollPeriodId: july.id,
      employeeId: donor.id,
      authorizationId: auth.id,
      amountAuthorized: 20_000,
      amountDeducted: 20_000,
      status: ContributionStatus.DEDUCTED,
    },
  });
});

afterAll(async () => {
  await db.payrollContribution.deleteMany({ where: { payrollPeriod: { companyId } } });
  await db.payrollPeriod.deleteMany({ where: { companyId } });
  await db.donationAuthorization.deleteMany({ where: { employee: { companyId } } });
  await db.employee.deleteMany({ where: { companyId } });
  await db.company.delete({ where: { id: companyId } });
  await db.$disconnect();
});

describe("companies overview", () => {
  it("aggregates per-company employee, donor, and donation totals", async () => {
    const overview = await getCompaniesOverview();
    const row = overview.find((c) => c.id === companyId);
    expect(row).toMatchObject({
      employeesTotal: 3,
      employeesActivated: 1,
      activeDonors: 1,
      monthlyAuthorized: 20_000,
      totalDeducted: 40_000,
      totalReceived: 20_000,
    });
  });

  it("builds the per-company monthly breakdown and employee rows", async () => {
    const detail = await getCompanyDetail(companyId);
    expect(detail).not.toBeNull();

    expect(detail!.monthly).toHaveLength(2);
    const [july, june] = detail!.monthly; // desc order
    expect(july).toMatchObject({
      month: 7,
      deductedCount: 1,
      totalDeducted: 20_000,
      received: false,
    });
    expect(june).toMatchObject({ month: 6, totalDeducted: 20_000, received: true });

    const donorRow = detail!.employees.find((e) => e.name === "Overview 1");
    expect(donorRow?.activeAmount).toBe(20_000);
    const nonDonor = detail!.employees.find((e) => e.name === "Overview 2");
    expect(nonDonor?.activeAmount).toBeNull();
  });

  it("returns null for an unknown company", async () => {
    expect(await getCompanyDetail("does-not-exist")).toBeNull();
  });
});
