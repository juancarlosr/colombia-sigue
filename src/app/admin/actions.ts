"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCompanyAdmin } from "@/lib/auth/company-admin";
import { importEmployees, parseEmployeeCsv } from "@/lib/employee-import";
import { sendPendingInvitations } from "@/lib/invitations";
import {
  applyPayrollResults,
  currentPeriodParts,
  parsePayrollResultsCsv,
  PayrollError,
  registerPeriodTransfer,
} from "@/lib/payroll";
import { db } from "@/lib/db";

const MAX_FILE_BYTES = 1_000_000;

async function readCsvFile(formData: FormData): Promise<{ text?: string; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo CSV." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "El archivo supera el tamaño máximo de 1 MB." };
  }
  return { text: await file.text() };
}

export type ImportState = { errors?: string[]; created?: number };

export async function importEmployeesAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const { company } = await requireCompanyAdmin();

  const { text, error } = await readCsvFile(formData);
  if (error) return { errors: [error] };

  const { rows, errors } = parseEmployeeCsv(text!);
  if (errors.length > 0) return { errors };

  const result = await importEmployees(company.id, rows);
  if (result.errors.length > 0) return { errors: result.errors };

  revalidatePath("/admin");
  return { created: result.created };
}

export type InviteState = { sent?: number };

export async function sendInvitationsAction(): Promise<InviteState> {
  const { company } = await requireCompanyAdmin();
  const sent = await sendPendingInvitations(company.id);
  revalidatePath("/admin");
  return { sent };
}

export type ResultsState = { errors?: string[]; applied?: number };

export async function uploadPayrollResultsAction(
  _prev: ResultsState,
  formData: FormData,
): Promise<ResultsState> {
  const { company } = await requireCompanyAdmin();

  const { text, error } = await readCsvFile(formData);
  if (error) return { errors: [error] };

  const { rows, errors } = parsePayrollResultsCsv(text!);
  if (errors.length > 0) return { errors };

  const { month, year } = currentPeriodParts();
  const period = await db.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId: company.id, year, month } },
  });
  if (!period) {
    return { errors: ["Primero descarga el CSV de nómina para crear el período."] };
  }

  try {
    const applied = await applyPayrollResults(period.id, rows);
    revalidatePath("/admin");
    return { applied };
  } catch (e) {
    if (e instanceof PayrollError) return { errors: e.errors };
    throw e;
  }
}

export type TransferState = { errors?: string[]; ok?: boolean };

const transferSchema = z.object({
  amount: z.coerce.number().int().positive("El monto debe ser un entero positivo."),
  date: z.iso.date("Ingresa una fecha válida."),
  bankReference: z.string().trim().min(1, "Ingresa la referencia bancaria."),
});

export async function registerTransferAction(
  _prev: TransferState,
  formData: FormData,
): Promise<TransferState> {
  const { company } = await requireCompanyAdmin();

  const parsed = transferSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    bankReference: formData.get("bankReference"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((i) => i.message) };
  }

  const { month, year } = currentPeriodParts();
  const period = await db.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId: company.id, year, month } },
  });
  if (!period) {
    return { errors: ["Primero descarga el CSV de nómina para crear el período."] };
  }

  try {
    await registerPeriodTransfer(period.id, {
      amount: parsed.data.amount,
      date: new Date(`${parsed.data.date}T12:00:00-05:00`),
      bankReference: parsed.data.bankReference,
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    if (e instanceof PayrollError) return { errors: e.errors };
    throw e;
  }
}
