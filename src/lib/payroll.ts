import {
  AuthorizationStatus,
  ContributionStatus,
  PayrollPeriodStatus,
  type PayrollContribution,
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

type PeriodParts = { month: number; year: number };

function monthAfter(p: PeriodParts): PeriodParts {
  return p.month === 12 ? { month: 1, year: p.year + 1 } : { month: p.month + 1, year: p.year };
}

function compareParts(a: PeriodParts, b: PeriodParts): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
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

export type OperatingPeriodResolution = {
  month: number;
  year: number;
  // The persisted period the monthly flow operates on, if it exists yet.
  period: (PayrollPeriod & { contributions: PayrollContribution[] }) | null;
  // A past-month period that never produced deductions; closed
  // automatically when the flow advances.
  staleToClose: PayrollPeriod | null;
};

// The monthly flow (CSV download, results upload, transfer) operates on
// ONE period at a time: the most recent period that is still open and
// not yet transferred. Real payroll cycles cross calendar-month
// boundaries — results for August are typically uploaded in early
// September — so this must NOT be pinned to the current month. A new
// month only opens once the previous one was transferred, closed, or
// abandoned without deductions.
export async function resolveOperatingPeriod(
  companyId: string,
  now: Date = new Date(),
): Promise<OperatingPeriodResolution> {
  const current = currentPeriodParts(now);

  const open = await db.payrollPeriod.findFirst({
    where: { companyId, status: PayrollPeriodStatus.OPEN, transferDate: null },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { contributions: true },
  });
  if (open) {
    // A period stays operable into the following month — results and
    // transfers for August legitimately happen in early September. Only
    // a period ≥2 months behind with no deductions is considered
    // abandoned and auto-closed. Periods WITH deductions never expire:
    // money was taken from employees and must reach the foundation.
    const monthsBehind = -compareParts({ month: open.month, year: open.year }, current);
    const hasDeductions = open.contributions.some((c) => c.amountDeducted !== null);
    if (monthsBehind >= 2 && !hasDeductions) {
      return { ...current, period: null, staleToClose: open };
    }
    return { month: open.month, year: open.year, period: open, staleToClose: null };
  }

  const latest = await db.payrollPeriod.findFirst({
    where: { companyId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  if (!latest) return { ...current, period: null, staleToClose: null };

  const after = monthAfter({ month: latest.month, year: latest.year });
  const target = compareParts(after, current) >= 0 ? after : current;
  return { ...target, period: null, staleToClose: null };
}

// Commit variant: closes stale periods and creates the target period.
export async function openOperatingPeriod(
  companyId: string,
  now: Date = new Date(),
): Promise<PayrollPeriod> {
  for (let i = 0; i < 24; i++) {
    const resolution = await resolveOperatingPeriod(companyId, now);
    if (resolution.staleToClose) {
      await closePeriodWithoutDeductions(resolution.staleToClose.id);
      continue;
    }
    if (resolution.period) return resolution.period;
    return getOrCreatePeriod(companyId, resolution.month, resolution.year);
  }
  throw new PayrollError(["No se pudo resolver el período de nómina."]);
}

// A pending row in a finished period means "no hubo aporte ese mes"
// (spec §13) — it is removed, never shown as pending forever.
async function closePeriodWithoutDeductions(periodId: string): Promise<void> {
  await db.$transaction([
    db.payrollContribution.deleteMany({
      where: { payrollPeriodId: periodId, status: ContributionStatus.AUTHORIZED },
    }),
    db.payrollPeriod.update({
      where: { id: periodId },
      data: { status: PayrollPeriodStatus.CLOSED },
    }),
  ]);
}

function assertPeriodProcessable(period: PayrollPeriod): void {
  if (period.status === PayrollPeriodStatus.CLOSED || period.transferDate) {
    throw new PayrollError([
      "Este período ya fue transferido o cerrado y no puede modificarse.",
    ]);
  }
}

// Aligns the period's not-yet-processed rows with the currently ACTIVE
// authorizations: adds new donors, updates amount changes, and removes
// rows whose authorization was cancelled or superseded. Rows that
// already progressed past AUTHORIZED are never touched — those payroll
// runs already happened.
export async function syncPeriodSnapshot(periodId: string): Promise<number> {
  const period = await db.payrollPeriod.findUniqueOrThrow({ where: { id: periodId } });
  assertPeriodProcessable(period);
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
    const rawAmount = fields[1].trim();
    if (!externalId) {
      errors.push(`Línea ${line}: employee_id vacío.`);
      return;
    }
    // Digits only: "20.000" (formato es-CO de Excel) sería interpretado
    // como 20 pesos — se rechaza en lugar de corromper los montos.
    if (!/^\d+$/.test(rawAmount) || Number(rawAmount) <= 0) {
      errors.push(
        `Línea ${line}: amount_deducted debe ser un entero positivo sin puntos ni comas (ej: 20000).`,
      );
      return;
    }
    rows.push({ externalId, amountDeducted: Number(rawAmount) });
  });
  if (rows.length === 0 && errors.length === 0) {
    errors.push("El archivo no contiene registros.");
  }
  return { rows, errors };
}

export type PayrollResultsOutcome = { applied: number; warnings: string[] };

// All-or-nothing: any invalid row rejects the whole file. Absent rows
// simply mean no contribution that month (spec §13) — no questions.
// Re-uploading before the transfer is allowed (corrections); after the
// transfer the period is immutable.
export async function applyPayrollResults(
  periodId: string,
  rows: PayrollResultRow[],
): Promise<PayrollResultsOutcome> {
  const period = await db.payrollPeriod.findUniqueOrThrow({ where: { id: periodId } });
  assertPeriodProcessable(period);

  const contributions = await db.payrollContribution.findMany({
    where: { payrollPeriodId: periodId },
    include: { employee: true },
  });
  const byExternalId = new Map(contributions.map((c) => [c.employee.externalId, c]));

  const errors: string[] = [];
  const warnings: string[] = [];
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
    } else if (contribution.amountAuthorized !== row.amountDeducted) {
      warnings.push(
        `${row.externalId} (${contribution.employee.name}): descontado ${row.amountDeducted} difiere del autorizado ${contribution.amountAuthorized}.`,
      );
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
  return { applied: rows.length, warnings };
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
    // Once the money left, a still-pending row means "no hubo aporte
    // ese mes" (spec §13): remove it instead of showing it as pending
    // forever.
    db.payrollContribution.deleteMany({
      where: { payrollPeriodId: periodId, status: ContributionStatus.AUTHORIZED },
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
