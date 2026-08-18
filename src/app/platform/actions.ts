"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { createLoginToken, INVITATION_TOKEN_TTL_MS } from "@/lib/auth/tokens";
import {
  approveCompany,
  RegistrationError,
  rejectCompany,
} from "@/lib/company-registration";
import { sendCompanyWelcomeEmail } from "@/lib/mailer";
import { markPeriodReceived, PayrollError } from "@/lib/payroll";

export type CompanyRequestState = { error?: string; ok?: boolean };

export async function approveCompanyAction(
  _prev: CompanyRequestState,
  formData: FormData,
): Promise<CompanyRequestState> {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return { error: "Solicitud inválida." };

  try {
    const company = await approveCompany(companyId);
    const token = await createLoginToken(company.contactEmail!, INVITATION_TOKEN_TTL_MS);
    const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
    await sendCompanyWelcomeEmail(
      company.contactEmail!,
      `${baseUrl}/auth/verify?token=${token}`,
      company.name,
    );
  } catch (e) {
    if (e instanceof RegistrationError) return { error: e.message };
    throw e;
  }
  revalidatePath("/platform");
  return { ok: true };
}

export async function rejectCompanyAction(
  _prev: CompanyRequestState,
  formData: FormData,
): Promise<CompanyRequestState> {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return { error: "Solicitud inválida." };

  try {
    await rejectCompany(companyId);
  } catch (e) {
    if (e instanceof RegistrationError) return { error: e.message };
    throw e;
  }
  revalidatePath("/platform");
  return { ok: true };
}

export type MarkReceivedState = { error?: string; ok?: boolean };

export async function markReceivedAction(
  _prev: MarkReceivedState,
  formData: FormData,
): Promise<MarkReceivedState> {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const periodId = String(formData.get("periodId") ?? "");
  if (!periodId) return { error: "Período inválido." };

  try {
    await markPeriodReceived(periodId);
  } catch (e) {
    if (e instanceof PayrollError) return { error: e.message };
    throw e;
  }
  revalidatePath("/platform");
  return { ok: true };
}

export type FoundationState = { errors?: string[]; ok?: boolean };

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const foundationSchema = z.object({
  displayName: z.string().trim().min(1, "El nombre para mostrar es obligatorio."),
  legalName: z.string().trim().min(1, "La razón social es obligatoria."),
  nit: z.string().trim().min(5, "Ingresa un NIT válido."),
  description: optionalText,
  website: optionalText,
  logoUrl: optionalText,
  bankName: optionalText,
  bankAccount: optionalText,
  contactName: optionalText,
  contactEmail: optionalText,
});

export async function updateFoundationAction(
  _prev: FoundationState,
  formData: FormData,
): Promise<FoundationState> {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const parsed = foundationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((i) => i.message) };
  }
  if (parsed.data.contactEmail && !z.email().safeParse(parsed.data.contactEmail).success) {
    return { errors: ["El email de contacto no es válido."] };
  }

  const foundation = await db.foundation.findFirst();
  if (!foundation) return { errors: ["No hay una fundación configurada."] };

  await db.foundation.update({ where: { id: foundation.id }, data: parsed.data });
  revalidatePath("/platform");
  revalidatePath("/app");
  return { ok: true };
}
