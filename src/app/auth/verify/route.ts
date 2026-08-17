import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { EmployeeStatus, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { roleHome } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { consumeLoginToken } from "@/lib/auth/tokens";

export async function GET(request: NextRequest) {
  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!rateLimit(`verify:ip:${ip}`, 20, 15 * 60 * 1000)) {
    redirect("/login?error=invalid");
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) redirect("/login?error=invalid");

  const email = await consumeLoginToken(token);
  if (!email) redirect("/login?error=invalid");

  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    // First login of an invited employee: provision their account.
    const employee = await db.employee.findFirst({ where: { email } });
    if (!employee) redirect("/login?error=invalid");
    user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email, role: UserRole.EMPLOYEE } });
      await tx.employee.update({
        where: { id: employee.id },
        data: { userId: created.id, status: EmployeeStatus.ACTIVATED },
      });
      return created;
    });
  }

  await createSession({ userId: user.id, role: user.role });
  redirect(roleHome(user.role));
}
