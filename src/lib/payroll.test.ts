import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AuthorizationStatus,
  ContributionStatus,
  PayrollPeriodStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { activateAuthorization, cancelActiveAuthorization } from "./donations";
import {
  applyPayrollResults,
  buildPayrollCsv,
  getOrCreatePeriod,
  markPeriodReceived,
  openOperatingPeriod,
  parsePayrollResultsCsv,
  PayrollError,
  registerPeriodTransfer,
  resolveOperatingPeriod,
  syncPeriodSnapshot,
} from "./payroll";

const EVIDENCE = { email: "e@test.example.com", ipAddress: null, userAgent: null };
const NOW = new Date("2026-08-17T12:00:00-05:00");

let companyId: string;
let empA: string; // stays active
let empB: string; // cancels mid-period
let empC: string; // changes amount mid-period
let periodId: string;
let createdFoundationId: string | null = null;

const companyIds: string[] = [];

async function makeCompany(name: string): Promise<string> {
  const company = await db.company.create({
    data: { name, nit: `${name}-${Date.now()}-${Math.random()}` },
  });
  companyIds.push(company.id);
  return company.id;
}

beforeAll(async () => {
  if (!(await db.foundation.findFirst())) {
    const created = await db.foundation.create({
      data: { displayName: "F", legalName: "F", nit: `payroll-${Date.now()}` },
    });
    createdFoundationId = created.id;
  }
  companyId = await makeCompany("Payroll Test SAS");

  const make = (n: string) =>
    db.employee.create({
      data: {
        companyId,
        externalId: `PR-${n}`,
        name: `Empleado ${n}`,
        documentNumber: `10${n}`,
        email: `payroll-${n}-${Date.now()}@test.example.com`,
      },
    });
  empA = (await make("A")).id;
  empB = (await make("B")).id;
  empC = (await make("C")).id;

  await activateAuthorization(empA, 20_000, EVIDENCE);
  await activateAuthorization(empB, 10_000, EVIDENCE);
  await activateAuthorization(empC, 30_000, EVIDENCE);
});

afterAll(async () => {
  await db.payrollContribution.deleteMany({
    where: { payrollPeriod: { companyId: { in: companyIds } } },
  });
  await db.payrollPeriod.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.donationAuthorization.deleteMany({
    where: { employee: { companyId: { in: companyIds } } },
  });
  await db.employee.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.company.deleteMany({ where: { id: { in: companyIds } } });
  if (createdFoundationId) await db.foundation.delete({ where: { id: createdFoundationId } });
  await db.$disconnect();
});

describe("payroll period lifecycle", () => {
  it("creates the period idempotently", async () => {
    const first = await getOrCreatePeriod(companyId, 9, 2026);
    const second = await getOrCreatePeriod(companyId, 9, 2026);
    expect(second.id).toBe(first.id);
    periodId = first.id;
  });

  it("snapshots active authorizations on sync", async () => {
    const count = await syncPeriodSnapshot(periodId);
    expect(count).toBe(3);
    const csv = await buildPayrollCsv(periodId);
    expect(csv).toContain(
      "employee_id,document_number,employee_name,authorized_amount,authorization_id",
    );
    expect(csv).toContain("PR-A");
    expect(csv).toContain("20000");
  });

  it("re-sync reflects cancellations and amount changes before processing", async () => {
    await cancelActiveAuthorization(empB);
    await activateAuthorization(empC, 50_000, EVIDENCE); // supersedes 30k

    const count = await syncPeriodSnapshot(periodId);
    expect(count).toBe(2);

    const contributions = await db.payrollContribution.findMany({
      where: { payrollPeriodId: periodId },
    });
    expect(contributions).toHaveLength(2);
    const forC = contributions.find((c) => c.employeeId === empC);
    expect(forC?.amountAuthorized).toBe(50_000);
  });

  it("parses a results CSV, rejecting malformed and locale-formatted amounts", () => {
    expect(parsePayrollResultsCsv("employee_id,amount_deducted\nPR-A,20000").rows).toEqual([
      { externalId: "PR-A", amountDeducted: 20_000 },
    ]);
    expect(parsePayrollResultsCsv("wrong,header\nPR-A,1").errors).toHaveLength(1);
    expect(parsePayrollResultsCsv("employee_id,amount_deducted\nPR-A,-5").errors).toHaveLength(1);
    expect(
      parsePayrollResultsCsv("employee_id,amount_deducted\nPR-A,veinte").errors,
    ).toHaveLength(1);
    // "20.000" en formato es-CO sería 20 pesos si se aceptara — debe rechazarse
    expect(
      parsePayrollResultsCsv("employee_id,amount_deducted\nPR-A,20.000").errors,
    ).toHaveLength(1);
  });

  it("rejects results referencing employees outside the snapshot", async () => {
    await expect(
      applyPayrollResults(periodId, [{ externalId: "PR-B", amountDeducted: 10_000 }]),
    ).rejects.toThrow(PayrollError);
  });

  it("warns on authorized/deducted mismatch and allows correcting re-uploads", async () => {
    const first = await applyPayrollResults(periodId, [
      { externalId: "PR-A", amountDeducted: 19_000 },
    ]);
    expect(first.applied).toBe(1);
    expect(first.warnings).toHaveLength(1);

    const corrected = await applyPayrollResults(periodId, [
      { externalId: "PR-A", amountDeducted: 20_000 },
    ]);
    expect(corrected.applied).toBe(1);
    expect(corrected.warnings).toHaveLength(0);

    const contributions = await db.payrollContribution.findMany({
      where: { payrollPeriodId: periodId },
    });
    const forA = contributions.find((c) => c.employeeId === empA);
    const forC = contributions.find((c) => c.employeeId === empC);
    expect(forA?.status).toBe(ContributionStatus.DEDUCTED);
    expect(forA?.amountDeducted).toBe(20_000);
    expect(forC?.status).toBe(ContributionStatus.AUTHORIZED);
    expect(forC?.amountDeducted).toBeNull();
  });

  it("cannot mark received before registering the transfer", async () => {
    await expect(markPeriodReceived(periodId)).rejects.toThrow(PayrollError);
  });

  it("registers the transfer, locks the period, and resolves absent rows", async () => {
    await registerPeriodTransfer(periodId, {
      amount: 20_000,
      date: new Date("2026-09-30T12:00:00-05:00"),
      bankReference: "TRX-001",
    });

    const contributions = await db.payrollContribution.findMany({
      where: { payrollPeriodId: periodId },
    });
    // empC's AUTHORIZED row is gone: absent from results = no aporte ese mes
    expect(contributions).toHaveLength(1);
    expect(contributions[0].employeeId).toBe(empA);
    expect(contributions[0].status).toBe(ContributionStatus.TRANSFERRED);

    // period is now immutable for results and snapshots
    await expect(
      applyPayrollResults(periodId, [{ externalId: "PR-A", amountDeducted: 20_000 }]),
    ).rejects.toThrow(PayrollError);
    await expect(syncPeriodSnapshot(periodId)).rejects.toThrow(PayrollError);
    await expect(
      registerPeriodTransfer(periodId, { amount: 1, date: new Date(), bankReference: "TRX-002" }),
    ).rejects.toThrow(PayrollError);
  });

  it("marks the period received and closes it", async () => {
    await markPeriodReceived(periodId);

    const period = await db.payrollPeriod.findUniqueOrThrow({ where: { id: periodId } });
    expect(period.status).toBe(PayrollPeriodStatus.CLOSED);
    expect(period.foundationReceivedAt).toBeInstanceOf(Date);

    const forA = await db.payrollContribution.findFirst({
      where: { payrollPeriodId: periodId, employeeId: empA },
    });
    expect(forA?.status).toBe(ContributionStatus.RECEIVED);
    expect(forA?.receivedByFoundationAt).toBeInstanceOf(Date);

    await expect(markPeriodReceived(periodId)).rejects.toThrow(PayrollError);
  });

  it("keeps authorization history intact through the whole cycle", async () => {
    const authsB = await db.donationAuthorization.findMany({ where: { employeeId: empB } });
    const authsC = await db.donationAuthorization.findMany({ where: { employeeId: empC } });
    expect(authsB.map((a) => a.status)).toEqual([AuthorizationStatus.CANCELLED]);
    expect(authsC.map((a) => a.status).sort()).toEqual([
      AuthorizationStatus.ACTIVE,
      AuthorizationStatus.SUPERSEDED,
    ]);
  });
});

describe("operating period resolution", () => {
  it("starts at the current month and sticks to the open period across month math", async () => {
    const freshCompany = await makeCompany("Resolver Test SAS");

    const initial = await resolveOperatingPeriod(freshCompany, NOW);
    expect(initial).toMatchObject({ month: 8, year: 2026, period: null, staleToClose: null });

    const opened = await openOperatingPeriod(freshCompany, NOW);
    expect(opened).toMatchObject({ month: 8, year: 2026 });

    // Still the operating period even when the calendar month advances:
    // September 2nd, August not yet transferred.
    const earlySeptember = new Date("2026-09-02T12:00:00-05:00");
    const crossMonth = await resolveOperatingPeriod(freshCompany, earlySeptember);
    expect(crossMonth.period?.id).toBe(opened.id);
    expect(crossMonth).toMatchObject({ month: 8, year: 2026 });
  });

  it("advances to the next month once the period is transferred", async () => {
    const freshCompany = await makeCompany("Resolver Advance SAS");
    const opened = await openOperatingPeriod(freshCompany, NOW);
    await db.payrollPeriod.update({
      where: { id: opened.id },
      data: { transferAmount: 1, transferDate: NOW, transferBankReference: "x" },
    });

    const next = await resolveOperatingPeriod(freshCompany, NOW);
    expect(next).toMatchObject({ month: 9, year: 2026, period: null });

    const openedNext = await openOperatingPeriod(freshCompany, NOW);
    expect(openedNext).toMatchObject({ month: 9, year: 2026 });
  });

  it("auto-closes an abandoned period only after a full grace month", async () => {
    const freshCompany = await makeCompany("Resolver Stale SAS");
    const employee = await db.employee.create({
      data: {
        companyId: freshCompany,
        externalId: "ST-1",
        name: "Stale Uno",
        documentNumber: "1",
        email: `stale-${Date.now()}@test.example.com`,
      },
    });
    const auth = await activateAuthorization(employee.id, 10_000, EVIDENCE);
    const june = await getOrCreatePeriod(freshCompany, 6, 2026);
    await db.payrollContribution.create({
      data: {
        payrollPeriodId: june.id,
        employeeId: employee.id,
        authorizationId: auth.id,
        amountAuthorized: 10_000,
        status: ContributionStatus.AUTHORIZED,
      },
    });

    // One month behind (checked in July): still operable, NOT stale.
    const inJuly = await resolveOperatingPeriod(freshCompany, new Date("2026-07-15T12:00:00-05:00"));
    expect(inJuly.period?.id).toBe(june.id);
    expect(inJuly.staleToClose).toBeNull();

    // Two months behind (checked in August): abandoned.
    const resolution = await resolveOperatingPeriod(freshCompany, NOW);
    expect(resolution.staleToClose?.id).toBe(june.id);

    const opened = await openOperatingPeriod(freshCompany, NOW);
    expect(opened).toMatchObject({ month: 8, year: 2026 });

    const closedJune = await db.payrollPeriod.findUniqueOrThrow({ where: { id: june.id } });
    expect(closedJune.status).toBe(PayrollPeriodStatus.CLOSED);
    expect(
      await db.payrollContribution.count({ where: { payrollPeriodId: june.id } }),
    ).toBe(0);
  });
});
