import { EmployeeStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { createLoginToken, INVITATION_TOKEN_TTL_MS } from "@/lib/auth/tokens";
import { sendInvitationEmail } from "@/lib/mailer";

// Sends (or re-sends) invitations to every employee who has not yet
// activated an account. Marks INVITED only those whose email was sent;
// a delivery failure for one employee never aborts the rest.
export async function sendPendingInvitations(
  companyId: string,
): Promise<{ sent: number; failed: number }> {
  const [company, foundation, pending] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: companyId } }),
    db.foundation.findFirstOrThrow(),
    db.employee.findMany({
      where: { companyId, status: { not: EmployeeStatus.ACTIVATED } },
    }),
  ]);

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  let sent = 0;
  let failed = 0;
  for (const employee of pending) {
    try {
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
      sent++;
    } catch (error) {
      console.error(`[invitaciones] fallo enviando a ${employee.email}:`, error);
      failed++;
    }
  }
  return { sent, failed };
}
