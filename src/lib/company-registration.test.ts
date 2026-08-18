import { afterAll, describe, expect, it } from "vitest";
import { CompanyStatus, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import {
  approveCompany,
  rejectCompany,
  RegistrationError,
  submitCompanyRegistration,
  verifyCompanyEmail,
} from "./company-registration";

const STAMP = Date.now();
const EVIDENCE = { ipAddress: "127.0.0.1", userAgent: "vitest" };

function input(overrides: Partial<Parameters<typeof submitCompanyRegistration>[0]> = {}) {
  return {
    legalName: "Registro Test S.A.S.",
    name: "Registro Test",
    nit: "900.123.456-8",
    contactName: "Persona Prueba",
    contactRole: "Gerente",
    contactEmail: `rrhh-${STAMP}@registrotest.example.com`,
    employeeEstimate: 25,
    ...overrides,
  };
}

const createdCompanyIds: string[] = [];
const createdUserEmails: string[] = [];

afterAll(async () => {
  await db.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
  await db.user.deleteMany({ where: { email: { in: createdUserEmails } } });
  await db.$disconnect();
});

describe("company self-registration", () => {
  it("creates a PENDING company with full acceptance evidence", async () => {
    const company = await submitCompanyRegistration(input(), EVIDENCE);
    createdCompanyIds.push(company.id);

    expect(company.status).toBe(CompanyStatus.PENDING);
    expect(company.adminUserId).toBeNull();
    expect(company.nit).toBe("900123456-8"); // normalizado
    expect(company.agreementTextVersion).toBe("v0-draft");
    expect(company.agreementAcceptedAt).toBeInstanceOf(Date);
    const evidence = company.agreementEvidence as Record<string, unknown>;
    expect(evidence.agreementText).toContain("Voluntariedad");
    expect(evidence.ipAddress).toBe("127.0.0.1");
  });

  it("rejects duplicate NITs and free email providers", async () => {
    await expect(
      submitCompanyRegistration(input({ contactEmail: `otra-${STAMP}@x.example.com` }), EVIDENCE),
    ).rejects.toThrow(RegistrationError); // NIT duplicado (creado arriba)

    // gmail bloqueado antes de validar NIT
    await expect(
      submitCompanyRegistration(
        input({ nit: "811026552-9", contactEmail: "alguien@gmail.com" }),
        EVIDENCE,
      ),
    ).rejects.toThrow(/corporativo/);
  });

  it("verifies the contact email once", async () => {
    const email = input().contactEmail;
    expect(await verifyCompanyEmail(email)).toBe(true);
    expect(await verifyCompanyEmail(email)).toBe(false); // ya verificado

    const company = await db.company.findUniqueOrThrow({
      where: { id: createdCompanyIds[0] },
    });
    expect(company.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it("approval activates the company and creates the admin exactly once", async () => {
    const approved = await approveCompany(createdCompanyIds[0]);
    createdUserEmails.push(approved.contactEmail!);

    expect(approved.status).toBe(CompanyStatus.ACTIVE);
    const admin = await db.user.findUniqueOrThrow({
      where: { email: approved.contactEmail! },
    });
    expect(admin.role).toBe(UserRole.COMPANY_ADMIN);
    expect(approved.adminUserId).toBe(admin.id);

    // re-aprobar una solicitud ya procesada falla
    await expect(approveCompany(createdCompanyIds[0])).rejects.toThrow(RegistrationError);
  });

  it("rejection marks the request REJECTED and keeps it out of the overview", async () => {
    const second = await submitCompanyRegistration(
      input({
        nit: "890.900.608-9",
        contactEmail: `rrhh2-${STAMP}@registrotest.example.com`,
      }),
      EVIDENCE,
    );
    createdCompanyIds.push(second.id);

    await rejectCompany(second.id);
    const rejected = await db.company.findUniqueOrThrow({ where: { id: second.id } });
    expect(rejected.status).toBe(CompanyStatus.REJECTED);
    expect(rejected.adminUserId).toBeNull();

    await expect(rejectCompany(second.id)).rejects.toThrow(RegistrationError);
  });
});
