import { AuthorizationStatus, type DonationAuthorization } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AUTHORIZATION_TEXT_VERSION, buildAuthorizationText } from "@/lib/authorization-text";

export const AMOUNT_PRESETS = [10_000, 20_000, 50_000];

export const amountSchema = z.coerce
  .number()
  .int("El monto debe ser un valor entero en pesos.")
  .min(1_000, "El monto mínimo es $1.000.")
  .max(10_000_000, "El monto máximo es $10.000.000.");

export type ConsentEvidence = {
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
};

// Creates a new ACTIVE authorization. If one already exists it is marked
// SUPERSEDED and linked to its replacement — never edited or deleted.
// The per-employee advisory lock serializes concurrent confirmations so
// at most one authorization is ACTIVE at any time.
export async function activateAuthorization(
  employeeId: string,
  amount: number,
  evidence: ConsentEvidence,
): Promise<DonationAuthorization> {
  const employee = await db.employee.findUniqueOrThrow({
    where: { id: employeeId },
    include: { company: true },
  });
  const foundation = await db.foundation.findFirstOrThrow();
  const authorizationText = buildAuthorizationText(
    employee.company.name,
    foundation.displayName,
    amount,
  );

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${employeeId}))::text`;
    const current = await tx.donationAuthorization.findFirst({
      where: { employeeId, status: AuthorizationStatus.ACTIVE },
    });
    const created = await tx.donationAuthorization.create({
      data: {
        employeeId,
        amount,
        status: AuthorizationStatus.ACTIVE,
        authorizationTextVersion: AUTHORIZATION_TEXT_VERSION,
        metadata: {
          authorizationText,
          authorizationTextVersion: AUTHORIZATION_TEXT_VERSION,
          employeeExternalId: employee.externalId,
          employeeName: employee.name,
          documentNumber: employee.documentNumber,
          companyId: employee.companyId,
          companyName: employee.company.name,
          foundationName: foundation.displayName,
          email: evidence.email,
          ipAddress: evidence.ipAddress,
          userAgent: evidence.userAgent,
        },
      },
    });
    if (current) {
      await tx.donationAuthorization.update({
        where: { id: current.id },
        data: { status: AuthorizationStatus.SUPERSEDED, supersededById: created.id },
      });
    }
    return created;
  });
}

// Idempotent: cancelling with no active authorization is a no-op.
export async function cancelActiveAuthorization(employeeId: string): Promise<boolean> {
  const result = await db.donationAuthorization.updateMany({
    where: { employeeId, status: AuthorizationStatus.ACTIVE },
    data: { status: AuthorizationStatus.CANCELLED, cancelledAt: new Date() },
  });
  return result.count > 0;
}

export async function getActiveAuthorization(
  employeeId: string,
): Promise<DonationAuthorization | null> {
  return db.donationAuthorization.findFirst({
    where: { employeeId, status: AuthorizationStatus.ACTIVE },
  });
}
