import { EmployeeStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { createLoginToken, INVITATION_TOKEN_TTL_MS } from "@/lib/auth/tokens";
import { sendInvitationEmail } from "@/lib/mailer";

// Sends (or re-sends) invitations to every employee who has not yet
// activated an account. Marks them INVITED.
export async function sendPendingInvitations(companyId: string): Promise<number> {
  const [company, foundation, pending] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: companyId } }),
    db.foundation.findFirstOrThrow(),
    db.employee.findMany({
      where: { companyId, status: { not: EmployeeStatus.ACTIVATED } },
    }),
  ]);

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  for (const employee of pending) {
    const token = await createLoginToken(employee.email, INVITATION_TOKEN_TTL_MS);
    await sendInvitationEmail(
      employee.email,
      `${baseUrl}/auth/verify?token=${token}`,
      company.name,
      foundation.displayName,
    );
    await db.employee.update({
      where: { id: employee.id },
      data: { status: EmployeeStatus.INVITED, invitedAt: new Date() },
    });
  }
  return pending.length;
}
