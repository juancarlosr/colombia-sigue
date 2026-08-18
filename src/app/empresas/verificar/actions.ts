"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/auth/rate-limit";
import { consumeLoginToken } from "@/lib/auth/tokens";
import { verifyCompanyEmail } from "@/lib/company-registration";

export type VerifyCompanyState = { error?: string; done?: boolean };

export async function confirmCompanyEmailAction(
  _prev: VerifyCompanyState,
  formData: FormData,
): Promise<VerifyCompanyState> {
  const ip = ((await headers()).get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!rateLimit(`company-verify:${ip}`, 20, 15 * 60 * 1000)) {
    return { error: "Demasiados intentos. Espera unos minutos." };
  }

  const token = String(formData.get("token") ?? "");
  const email = token ? await consumeLoginToken(token) : null;
  if (!email) {
    return { error: "El enlace no es válido o ya expiró." };
  }

  const verified = await verifyCompanyEmail(email);
  if (!verified) {
    return { error: "No encontramos una solicitud pendiente para este correo." };
  }
  return { done: true };
}
