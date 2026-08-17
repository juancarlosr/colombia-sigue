import { cache } from "react";
import { redirect } from "next/navigation";
import { UserRole, type Employee, type User } from "@prisma/client";
import { db } from "@/lib/db";
import { readSession } from "./session";

export type CurrentUser = User & { employee: Employee | null };

export function roleHome(role: UserRole): string {
  switch (role) {
    case UserRole.EMPLOYEE:
      return "/app";
    case UserRole.COMPANY_ADMIN:
      return "/admin";
    case UserRole.PLATFORM_ADMIN:
      return "/platform";
  }
}

// The session cookie only identifies the user; role and existence are
// re-checked against the database on every request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.userId },
    include: { employee: true },
  });
});

export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(roleHome(user.role));
  return user;
}

export async function requireEmployee(): Promise<CurrentUser & { employee: Employee }> {
  const user = await requireRole(UserRole.EMPLOYEE);
  if (!user.employee) redirect("/login");
  return user as CurrentUser & { employee: Employee };
}
