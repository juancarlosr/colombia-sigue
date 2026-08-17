"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { roleHome } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/auth/rate-limit";
import { resolveUserForEmail } from "@/lib/auth/login";
import { createSession } from "@/lib/auth/session";
import { consumeLoginToken } from "@/lib/auth/tokens";

export type VerifyState = { error?: string };

export async function completeLoginAction(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const ip = ((await headers()).get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!rateLimit(`verify:ip:${ip}`, 20, 15 * 60 * 1000)) {
    return { error: "Demasiados intentos. Espera unos minutos." };
  }

  const token = String(formData.get("token") ?? "");
  const email = token ? await consumeLoginToken(token) : null;
  if (!email) {
    return { error: "El enlace no es válido o ya expiró. Solicita uno nuevo." };
  }

  const user = await resolveUserForEmail(email);
  if (!user) {
    return { error: "El enlace no es válido o ya expiró. Solicita uno nuevo." };
  }

  await createSession({ userId: user.id, role: user.role });
  redirect(roleHome(user.role));
}
