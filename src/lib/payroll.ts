import {
  AuthorizationStatus,
  ContributionStatus,
  PayrollPeriodStatus,
  type PayrollPeriod,
} from "@prisma/client";
import { db } from "@/lib/db";
import { parseCsv, toCsv } from "@/lib/csv";

export class PayrollError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join(" · "));
    this.name = "PayrollError";
  }
}

// Period boundaries follow Colombian local time.
export function currentPeriodParts(now: Date = new Date()): { month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { month: get("month"), year: get("year") };
}

export async function getOrCreatePeriod(
  companyId: string,
  month: number,
  year: number,
): Promise<PayrollPeriod> {
  return db.payrollPeriod.upsert({
    where: { companyId_year_month: { companyId, year, month } },
    update: {},
    create: { companyId, month, year },
  });
}

// Aligns the period's not-yet-processed rows with the currently ACTIVE
// authorizations: adds new donors, updates amount changes, and removes
// rows whose authorization was cancelled or superseded. Rows that
// already progressed past AUTHORIZED are never touched — those payroll
// runs already happened.
export async function syncPeriodSnapshot(periodId: string): Promise<number> {
  const period = await db.payrollPeriod.findUniqueOrThrow({ where: { id: periodId } });
  const activeAuths = await db.donationAuthorization.findMany({
    where: { status: AuthorizationStatus.ACTIVE, employee: { companyId: period.companyId } },
  });

  await db.$transaction(async (tx) => {
    await tx.payrollContribution.deleteMany({
      where: {
        payrollPeriodId: periodId,
        status: ContributionStatus.AUTHORIZED,
        authorizationId: { notIn: activeAuths.map((a) => a.id) },
      },
    });
    for (const auth of activeAuths) {
      const existing = await tx.payrollContribution.findUnique({
        where: {
          payrollPeriodId_employeeId: { payrollPeriodId: periodId, employeeId: auth.employeeId },
        },
      });
      if (!existing) {
        await tx.payrollContribution.create({
          data: {
            payrollPeriodId: periodId,
            employeeId: auth.employeeId,
            authorizationId: auth.id,
            amountAuthorized: auth.amount,
            status: ContributionStatus.AUTHORIZED,
          },
        });
      } else if (
        existing.status === ContributionStatus.AUTHORIZED &&
        (existing.authorizationId !== auth.id || existing.amountAuthorized !== auth.amount)
      ) {
        await tx.payrollContribution.update({
          where: { id: existing.id },
          data: { authorizationId: auth.id, amountAuthorized: auth.amount },
        });
      }
    }
  });

  return db.payrollContribution.count({
    where: { payrollPeriodId: periodId, status: ContributionStatus.AUTHORIZED },
  });
}

// Spec §12: only currently pending authorizations, nothing extra.
export async function buildPayrollCsv(periodId: string): Promise<string> {
  const contributions = await db.payrollContribution.findMany({
    where: { payrollPeriodId: periodId, status: ContributionStatus.AUTHORIZED },
    include: { employee: true },
    orderBy: { employee: { name: "asc" } },
  });
  return toCsv([
    ["employee_id", "document_number", "employee_name", "authorized_amount", "authorization_id"],
    ...contributions.map((c) => [
      c.employee.externalId,
      c.employee.documentNumber,
      c.employee.name,
      c.amountAuthorized,
      c.authorizationId,
    ]),
  ]);
}

export type PayrollResultRow = { externalId: string; amountDeducted: number };

const RESULTS_HEADER = ["employee_id", "amount_deducted"];

export function parsePayrollResultsCsv(
  text: string,
): { rows: PayrollResultRow[]; errors: string[] } {
  const parsed = parseCsv(text);
  if (parsed.length === 0) return { rows: [], errors: ["El archivo está vacío."] };

  const header = parsed[0].map((h) => h.trim().toLowerCase());
  if (header.join(",") !== RESULTS_HEADER.join(",")) {
    return { rows: [], errors: [`El encabezado debe ser exactamente: ${RESULTS_HEADER.join(",")}`] };
  }

  const errors: string[] = [];
  const rows: PayrollResultRow[] = [];
  parsed.slice(1).forEach((fields, index) => {
    const line = index + 2;
    if (fields.length !== 2) {
      errors.push(`Línea ${line}: se esperaban 2 columnas.`);
      return;
    }
    const externalId = fields[0].trim();
    const amount = Number(fields[1].trim());
    if (!externalId) {
      errors.push(`Línea ${line}: employee_id vacío.`);
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      errors.push(`Línea ${line}: amount_deducted debe ser un entero positivo.`);
      return;
    }
    rows.push({ externalId, amountDeducted: amount });
  });
  if (rows.length === 0 && errors.length === 0) {
    errors.push("El archivo no contiene registros.");
  }
  return { rows, errors };
}

// All-or-nothing: any invalid row rejects the whole file. Absent rows
// simply mean no contribution that month (spec §13) — no questions.
export async function applyPayrollResults(
  periodId: string,
  rows: PayrollResultRow[],
): Promise<number> {
  const contributions = await db.payrollContribution.findMany({
    where: { payrollPeriodId: periodId },
    include: { employee: true },
  });
  const byExternalId = new Map(contributions.map((c) => [c.employee.externalId, c]));

  const errors: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.externalId)) {
      errors.push(`employee_id duplicado en el archivo: ${row.externalId}`);
      continue;
    }
    seen.add(row.externalId);
    const contribution = byExternalId.get(row.externalId);
    if (!contribution) {
      errors.push(`employee_id sin autorización en este período: ${row.externalId}`);
    } else if (
      contribution.status === ContributionStatus.TRANSFERRED ||
      contribution.status === ContributionStatus.RECEIVED
    ) {
      errors.push(`el aporte de ${row.externalId} ya fue transferido; no puede modificarse`);
    }
  }
  if (errors.length > 0) throw new PayrollError(errors);

  await db.$transaction(
    rows.map((row) =>
      db.payrollContribution.update({
        where: { id: byExternalId.get(row.externalId)!.id },
        data: { amountDeducted: row.amountDeducted, status: ContributionStatus.DEDUCTED },
      }),
    ),
  );
  return rows.length;
}

export async function registerPeriodTransfer(
  periodId: string,
  transfer: { amount: number; date: Date; bankReference: string },
): Promise<void> {
  const period = await db.payrollPeriod.findUniqueOrThrow({ where: { id: periodId } });
  if (period.transferDate) {
    throw new PayrollError(["La transferencia de este período ya fue registrada."]);
  }
  const deducted = await db.payrollContribution.count({
    where: { payrollPeriodId: periodId, status: ContributionStatus.DEDUCTED },
  });
  if (deducted === 0) {
    throw new PayrollError(["No hay descuentos registrados para transferir en este período."]);
  }

  await db.$transaction([
    db.payrollPeriod.update({
      where: { id: periodId },
      data: {
        transferAmount: transfer.amount,
        transferDate: transfer.date,
        transferBankReference: transfer.bankReference,
      },
    }),
    db.payrollContribution.updateMany({
      where: { payrollPeriodId: periodId, status: ContributionStatus.DEDUCTED },
      data: { status: ContributionStatus.TRANSFERRED },
    }),
  ]);
}

export async function markPeriodReceived(periodId: string): Promise<void> {
  const period = await db.payrollPeriod.findUniqueOrThrow({ where: { id: periodId } });
  if (!period.transferDate) {
    throw new PayrollError(["Registra primero la transferencia de este período."]);
  }
  if (period.foundationReceivedAt) {
    throw new PayrollError(["Este período ya fue confirmado como recibido."]);
  }

  const receivedAt = new Date();
  await db.$transaction([
    db.payrollPeriod.update({
      where: { id: periodId },
      data: { foundationReceivedAt: receivedAt, status: PayrollPeriodStatus.CLOSED },
    }),
    db.payrollContribution.updateMany({
      where: { payrollPeriodId: periodId, status: ContributionStatus.TRANSFERRED },
      data: { status: ContributionStatus.RECEIVED, receivedByFoundationAt: receivedAt },
    }),
  ]);
}
