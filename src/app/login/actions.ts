"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createLoginToken } from "@/lib/auth/tokens";
import { sendMagicLinkEmail } from "@/lib/mailer";

const emailSchema = z.email().max(254);

const WINDOW_MS = 15 * 60 * 1000;

export type RequestLinkState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

export async function requestMagicLink(
  _prev: RequestLinkState,
  formData: FormData,
): Promise<RequestLinkState> {
  const raw = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Ingresa un correo válido." };
  }
  const email = parsed.data;

  const ip = ((await headers()).get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (
    !rateLimit(`magic-link:ip:${ip}`, 10, WINDOW_MS) ||
    !rateLimit(`magic-link:email:${email}`, 5, WINDOW_MS)
  ) {
    return { status: "error", message: "Demasiados intentos. Espera unos minutos." };
  }

  // The response never reveals whether the email is registered.
  const knownUser = await db.user.findUnique({ where: { email } });
  const knownEmployee = knownUser ? null : await db.employee.findFirst({ where: { email } });
  if (knownUser || knownEmployee) {
    const token = await createLoginToken(email);
    const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
    await sendMagicLinkEmail(email, `${baseUrl}/auth/verify?token=${token}`);
  }

  return { status: "sent" };
}
