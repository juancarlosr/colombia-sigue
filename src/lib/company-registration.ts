import { CompanyStatus, UserRole, type Company } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { validateNit } from "@/lib/nit";
import {
  AGREEMENT_TEXT_VERSION,
  PARTICIPATION_AGREEMENT,
} from "@/lib/participation-agreement";

export class RegistrationError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join(" · "));
    this.name = "RegistrationError";
  }
}

// El contacto debe usar correo corporativo: verifica control del
// dominio de la empresa, no de una cuenta personal.
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
]);

export const registrationSchema = z.object({
  legalName: z.string().trim().min(3, "Ingresa la razón social."),
  name: z.string().trim().min(2, "Ingresa el nombre comercial."),
  nit: z.string().trim().min(1, "Ingresa el NIT."),
  contactName: z.string().trim().min(3, "Ingresa el nombre del responsable."),
  contactRole: z.string().trim().min(2, "Ingresa el cargo del responsable."),
  contactEmail: z.email("Ingresa un correo válido.").max(254),
  employeeEstimate: z.coerce
    .number()
    .int()
    .min(1, "Ingresa cuántas personas tiene tu equipo.")
    .max(100_000, "Ingresa un número realista de empleados."),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export type RegistrationEvidence = {
  ipAddress: string | null;
  userAgent: string | null;
};

export async function submitCompanyRegistration(
  input: RegistrationInput,
  evidence: RegistrationEvidence,
): Promise<Company> {
  const email = input.contactEmail.toLowerCase();
  const domain = email.split("@")[1] ?? "";
  if (FREE_EMAIL_DOMAINS.has(domain)) {
    throw new RegistrationError([
      "Usa el correo corporativo de tu empresa (no un correo personal).",
    ]);
  }

  const nit = validateNit(input.nit);
  if (!nit.valid) throw new RegistrationError([nit.error]);

  const existing = await db.company.findUnique({ where: { nit: nit.normalized } });
  if (existing) {
    throw new RegistrationError([
      "Ya existe una solicitud o empresa registrada con este NIT. Si crees que es un error, escríbenos.",
    ]);
  }

  return db.company.create({
    data: {
      name: input.name,
      legalName: input.legalName,
      nit: nit.normalized,
      status: CompanyStatus.PENDING,
      contactName: input.contactName,
      contactRole: input.contactRole,
      contactEmail: email,
      employeeEstimate: input.employeeEstimate,
      agreementTextVersion: AGREEMENT_TEXT_VERSION,
      agreementAcceptedAt: new Date(),
      agreementEvidence: {
        agreementText: PARTICIPATION_AGREEMENT,
        agreementTextVersion: AGREEMENT_TEXT_VERSION,
        contactEmail: email,
        contactName: input.contactName,
        contactRole: input.contactRole,
        ipAddress: evidence.ipAddress,
        userAgent: evidence.userAgent,
      },
    },
  });
}

// Marca la solicitud como verificada cuando el contacto abre el enlace
// enviado a su correo corporativo.
export async function verifyCompanyEmail(email: string): Promise<boolean> {
  const result = await db.company.updateMany({
    where: {
      contactEmail: email.toLowerCase(),
      status: CompanyStatus.PENDING,
      emailVerifiedAt: null,
    },
    data: { emailVerifiedAt: new Date() },
  });
  return result.count > 0;
}

// Aprueba la solicitud: crea el usuario COMPANY_ADMIN y activa la
// empresa. El rol se asigna aquí — nunca al solicitar.
export async function approveCompany(companyId: string): Promise<Company> {
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId } });
  if (company.status !== CompanyStatus.PENDING) {
    throw new RegistrationError(["Esta solicitud ya fue procesada."]);
  }
  if (!company.contactEmail) {
    throw new RegistrationError(["La solicitud no tiene correo de contacto."]);
  }
  const existingUser = await db.user.findUnique({ where: { email: company.contactEmail } });
  if (existingUser) {
    throw new RegistrationError([
      `El correo ${company.contactEmail} ya tiene una cuenta con otro rol. Resuélvelo manualmente antes de aprobar.`,
    ]);
  }

  return db.$transaction(async (tx) => {
    const admin = await tx.user.create({
      data: { email: company.contactEmail!, role: UserRole.COMPANY_ADMIN },
    });
    return tx.company.update({
      where: { id: companyId },
      data: { status: CompanyStatus.ACTIVE, adminUserId: admin.id },
    });
  });
}

export async function rejectCompany(companyId: string): Promise<void> {
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId } });
  if (company.status !== CompanyStatus.PENDING) {
    throw new RegistrationError(["Esta solicitud ya fue procesada."]);
  }
  await db.company.update({
    where: { id: companyId },
    data: { status: CompanyStatus.REJECTED },
  });
}
