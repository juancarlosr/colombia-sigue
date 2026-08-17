"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireEmployee } from "@/lib/auth/guards";
import {
  activateAuthorization,
  amountSchema,
  cancelActiveAuthorization,
  getActiveAuthorization,
} from "@/lib/donations";

export type AuthorizeState = { error?: string };

export async function confirmAuthorization(
  _prev: AuthorizeState,
  formData: FormData,
): Promise<AuthorizeState> {
  const user = await requireEmployee();

  const parsedAmount = amountSchema.safeParse(formData.get("monto"));
  if (!parsedAmount.success) {
    return { error: parsedAmount.error.issues[0].message };
  }
  if (formData.get("acepto") !== "on") {
    return { error: "Debes leer y aceptar la autorización para continuar." };
  }

  const hadActiveAuthorization =
    (await getActiveAuthorization(user.employee.id)) !== null;

  const requestHeaders = await headers();
  await activateAuthorization(user.employee.id, parsedAmount.data, {
    email: user.email,
    ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
    userAgent: requestHeaders.get("user-agent"),
  });

  redirect(hadActiveAuthorization ? "/app?msg=actualizado" : "/app?msg=confirmado");
}

export async function cancelContribution(): Promise<void> {
  const user = await requireEmployee();
  await cancelActiveAuthorization(user.employee.id);
  redirect("/app?msg=cancelado");
}
