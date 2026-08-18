"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createLoginToken, INVITATION_TOKEN_TTL_MS } from "@/lib/auth/tokens";
import {
  RegistrationError,
  registrationSchema,
  submitCompanyRegistration,
} from "@/lib/company-registration";
import { sendCompanyVerificationEmail } from "@/lib/mailer";

export type RegisterCompanyState = { errors?: string[]; ok?: boolean; emailSent?: boolean };

export async function registerCompanyAction(
  _prev: RegisterCompanyState,
  formData: FormData,
): Promise<RegisterCompanyState> {
  const requestHeaders = await headers();
  const ip = (requestHeaders.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!rateLimit(`company-reg:${ip}`, 5, 60 * 60 * 1000)) {
    return { errors: ["Demasiados intentos desde esta conexión. Intenta más tarde."] };
  }

  if (formData.get("acepto") !== "on") {
    return { errors: ["Debes leer y aceptar el acuerdo de participación."] };
  }

  const parsed = registrationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((i) => i.message) };
  }

  try {
    const company = await submitCompanyRegistration(parsed.data, {
      ipAddress: ip === "local" ? null : ip,
      userAgent: requestHeaders.get("user-agent"),
    });

    // El registro ya quedó guardado: un fallo del proveedor de correo no
    // debe convertirse en un error para el solicitante.
    let emailSent = true;
    try {
      const token = await createLoginToken(company.contactEmail!, INVITATION_TOKEN_TTL_MS);
      const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
      await sendCompanyVerificationEmail(
        company.contactEmail!,
        `${baseUrl}/empresas/verificar?token=${token}`,
      );
    } catch (emailError) {
      console.error("[registro] fallo enviando verificación:", emailError);
      emailSent = false;
    }
    return { ok: true, emailSent };
  } catch (e) {
    if (e instanceof RegistrationError) return { errors: e.errors };
    throw e;
  }
}
