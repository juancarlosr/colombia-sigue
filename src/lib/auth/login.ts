import { EmployeeStatus, UserRole, type User } from "@prisma/client";
import { db } from "@/lib/db";

// Finds the user for a verified email, provisioning the account on an
// invited employee's first login.
export async function resolveUserForEmail(email: string): Promise<User | null> {
  const user = await db.user.findUnique({ where: { email } });
  if (user) return user;

  const employee = await db.employee.findFirst({ where: { email } });
  if (!employee) return null;

  return db.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email, role: UserRole.EMPLOYEE } });
    await tx.employee.update({
      where: { id: employee.id },
      data: { userId: created.id, status: EmployeeStatus.ACTIVATED },
    });
    return created;
  });
}
