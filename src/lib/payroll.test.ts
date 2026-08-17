import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthorizationStatus, ContributionStatus, PayrollPeriodStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { activateAuthorization, cancelActiveAuthorization } from "./donations";
import {
  applyPayrollResults,
  buildPayrollCsv,
  getOrCreatePeriod,
  markPeriodReceived,
  parsePayrollResultsCsv,
  PayrollError,
  registerPeriodTransfer,
  syncPeriodSnapshot,
} from "./payroll";

const EVIDENCE = { email: "e@test.example.com", ipAddress: null, userAgent: null };

let companyId: string;
let empA: string; // stays active
let empB: string; // cancels mid-period
let empC: string; // changes amount mid-period
let periodId: string;
let createdFoundationId: string | null = null;

beforeAll(async () => {
  if (!(await db.foundation.findFirst())) {
    const created = await db.foundation.create({
      data: { displayName: "F", legalName: "F", nit: `payroll-${Date.now()}` },
    });
    createdFoundationId = created.id;
  }
  const company = await db.company.create({
    data: { name: "Payroll Test SAS", nit: `payroll-co-${Date.now()}` },
  });
  companyId = company.id;

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
  await db.payrollContribution.deleteMany({ where: { payrollPeriod: { companyId } } });
  await db.payrollPeriod.deleteMany({ where: { companyId } });
  await db.donationAuthorization.deleteMany({ where: { employee: { companyId } } });
  await db.employee.deleteMany({ where: { companyId } });
  await db.company.delete({ where: { id: companyId } });
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
    expect(csv).toContain("employee_id,document_number,employee_name,authorized_amount,authorization_id");
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

  it("parses a results CSV and rejects malformed ones", () => {
    expect(parsePayrollResultsCsv("employee_id,amount_deducted\nPR-A,20000").rows).toEqual([
      { externalId: "PR-A", amountDeducted: 20_000 },
    ]);
    expect(parsePayrollResultsCsv("wrong,header\nPR-A,1").errors).toHaveLength(1);
    expect(parsePayrollResultsCsv("employee_id,amount_deducted\nPR-A,-5").errors).toHaveLength(1);
    expect(parsePayrollResultsCsv("employee_id,amount_deducted\nPR-A,veinte").errors).toHaveLength(1);
  });

  it("rejects results referencing employees outside the snapshot", async () => {
    await expect(
      applyPayrollResults(periodId, [{ externalId: "PR-B", amountDeducted: 10_000 }]),
    ).rejects.toThrow(PayrollError);
  });

  it("applies valid results; absent employees simply stay unprocessed", async () => {
    const applied = await applyPayrollResults(periodId, [
      { externalId: "PR-A", amountDeducted: 20_000 },
    ]);
    expect(applied).toBe(1);

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

  it("registers the transfer and moves deducted contributions along", async () => {
    await registerPeriodTransfer(periodId, {
      amount: 20_000,
      date: new Date("2026-09-30T12:00:00-05:00"),
      bankReference: "TRX-001",
    });
    const forA = await db.payrollContribution.findFirst({
      where: { payrollPeriodId: periodId, employeeId: empA },
    });
    expect(forA?.status).toBe(ContributionStatus.TRANSFERRED);

    await expect(
      registerPeriodTransfer(periodId, {
        amount: 1,
        date: new Date(),
        bankReference: "TRX-002",
      }),
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
