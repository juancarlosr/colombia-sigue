import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AuthorizationStatus,
  ContributionStatus,
  EmployeeStatus,
  PrismaClient,
  UserRole,
} from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Placeholder pending review by a Colombian labor lawyer (launch gate,
// spec §28). Swapping in the approved text is a data change: bump the
// version and update AUTHORIZATION_TEXT.
const AUTHORIZATION_TEXT_VERSION = "v0-draft";

const COMPANY_NAME = "Acme Colombia SAS";
const FOUNDATION_NAME = "Fundación Reconstruir Colombia";

function formatCop(amount: number): string {
  return `$${amount.toLocaleString("es-CO")}`;
}

function authorizationText(amount: number): string {
  return (
    `Autorizo voluntariamente a ${COMPANY_NAME} a descontar ${formatCop(amount)} ` +
    `mensuales de mi nómina y transferir estos recursos a ${FOUNDATION_NAME}. ` +
    `Entiendo que puedo modificar o revocar esta autorización en cualquier momento ` +
    `y que los cambios aplicarán a los períodos de nómina que todavía no hayan sido procesados.`
  );
}

function consentEvidence(email: string, amount: number) {
  return {
    authorizationText: authorizationText(amount),
    authorizationTextVersion: AUTHORIZATION_TEXT_VERSION,
    email,
    ipAddress: null,
    userAgent: null,
    seededDemoData: true,
  };
}

async function main() {
  // Demo data is fully rebuilt on every seed run.
  await prisma.payrollContribution.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.donationAuthorization.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.company.deleteMany();
  await prisma.foundation.deleteMany();
  await prisma.user.deleteMany();

  await prisma.foundation.create({
    data: {
      displayName: FOUNDATION_NAME,
      legalName: "Fundación Reconstruir Colombia",
      nit: "901.234.567-8",
      website: "https://reconstruir.example.org",
      description:
        "Apoyamos la reconstrucción de viviendas y escuelas en comunidades afectadas por desastres naturales en Colombia.",
      bankName: "Bancolombia",
      bankAccount: "Cuenta de ahorros 123-456789-01",
      contactName: "Patricia Mejía",
      contactEmail: "patricia@reconstruir.example.org",
    },
  });

  const platformAdmin = await prisma.user.create({
    data: { email: "platform@colombiasigue.example.com", role: UserRole.PLATFORM_ADMIN },
  });

  const companyAdmin = await prisma.user.create({
    data: { email: "rrhh@acme.example.com", role: UserRole.COMPANY_ADMIN },
  });

  const company = await prisma.company.create({
    data: {
      name: COMPANY_NAME,
      nit: "900.123.456-7",
      adminUserId: companyAdmin.id,
    },
  });

  type EmployeeSeed = {
    externalId: string;
    name: string;
    documentNumber: string;
    email: string;
    status: EmployeeStatus;
  };

  // 10 employees: 5 activated donors (one via supersession), 1 activated
  // donor who cancelled, 2 invited without donating, 2 only imported.
  const employeeSeeds: EmployeeSeed[] = [
    { externalId: "EMP-001", name: "Ana Gómez", documentNumber: "1020304050", email: "ana.gomez@acme.example.com", status: EmployeeStatus.ACTIVATED },
    { externalId: "EMP-002", name: "Carlos Ruiz", documentNumber: "1020304051", email: "carlos.ruiz@acme.example.com", status: EmployeeStatus.ACTIVATED },
    { externalId: "EMP-003", name: "Laura Díaz", documentNumber: "1020304052", email: "laura.diaz@acme.example.com", status: EmployeeStatus.ACTIVATED },
    { externalId: "EMP-004", name: "Andrés Torres", documentNumber: "1020304053", email: "andres.torres@acme.example.com", status: EmployeeStatus.ACTIVATED },
    { externalId: "EMP-005", name: "María Fernanda López", documentNumber: "1020304054", email: "maria.lopez@acme.example.com", status: EmployeeStatus.ACTIVATED },
    { externalId: "EMP-006", name: "Diego Martínez", documentNumber: "1020304055", email: "diego.martinez@acme.example.com", status: EmployeeStatus.ACTIVATED },
    { externalId: "EMP-007", name: "Sofía Herrera", documentNumber: "1020304056", email: "sofia.herrera@acme.example.com", status: EmployeeStatus.INVITED },
    { externalId: "EMP-008", name: "Julián Castro", documentNumber: "1020304057", email: "julian.castro@acme.example.com", status: EmployeeStatus.INVITED },
    { externalId: "EMP-009", name: "Camila Vargas", documentNumber: "1020304058", email: "camila.vargas@acme.example.com", status: EmployeeStatus.IMPORTED },
    { externalId: "EMP-010", name: "Felipe Rojas", documentNumber: "1020304059", email: "felipe.rojas@acme.example.com", status: EmployeeStatus.IMPORTED },
  ];

  const invitedAt = new Date("2026-07-28T09:00:00-05:00");

  const employees = [] as Awaited<ReturnType<typeof prisma.employee.create>>[];
  for (const seed of employeeSeeds) {
    const user =
      seed.status === EmployeeStatus.ACTIVATED
        ? await prisma.user.create({ data: { email: seed.email, role: UserRole.EMPLOYEE } })
        : null;
    employees.push(
      await prisma.employee.create({
        data: {
          companyId: company.id,
          externalId: seed.externalId,
          name: seed.name,
          documentNumber: seed.documentNumber,
          email: seed.email,
          status: seed.status,
          invitedAt: seed.status === EmployeeStatus.IMPORTED ? null : invitedAt,
          userId: user?.id ?? null,
        },
      }),
    );
  }

  const [ana, carlos, laura, andres, maria, diego] = employees;

  const activeAuth = (employeeId: string, email: string, amount: number, authorizedAt: string) =>
    prisma.donationAuthorization.create({
      data: {
        employeeId,
        amount,
        status: AuthorizationStatus.ACTIVE,
        authorizationTextVersion: AUTHORIZATION_TEXT_VERSION,
        authorizedAt: new Date(authorizedAt),
        metadata: consentEvidence(email, amount),
      },
    });

  // 4 employees with a single ACTIVE authorization.
  const anaAuth = await activeAuth(ana.id, ana.email, 20_000, "2026-08-01T10:15:00-05:00");
  const carlosAuth = await activeAuth(carlos.id, carlos.email, 50_000, "2026-08-01T11:40:00-05:00");
  const lauraAuth = await activeAuth(laura.id, laura.email, 10_000, "2026-08-02T08:05:00-05:00");
  const andresAuth = await activeAuth(andres.id, andres.email, 20_000, "2026-08-02T16:30:00-05:00");

  // María changed her amount: original authorization is SUPERSEDED and
  // points to the ACTIVE replacement.
  const mariaAuth2 = await activeAuth(maria.id, maria.email, 50_000, "2026-08-05T09:20:00-05:00");
  await prisma.donationAuthorization.create({
    data: {
      employeeId: maria.id,
      amount: 20_000,
      status: AuthorizationStatus.SUPERSEDED,
      authorizationTextVersion: AUTHORIZATION_TEXT_VERSION,
      authorizedAt: new Date("2026-08-01T14:00:00-05:00"),
      supersededById: mariaAuth2.id,
      metadata: consentEvidence(maria.email, 20_000),
    },
  });

  // Diego cancelled after the August payroll snapshot was taken.
  const diegoAuth = await prisma.donationAuthorization.create({
    data: {
      employeeId: diego.id,
      amount: 20_000,
      status: AuthorizationStatus.CANCELLED,
      authorizationTextVersion: AUTHORIZATION_TEXT_VERSION,
      authorizedAt: new Date("2026-08-02T12:00:00-05:00"),
      cancelledAt: new Date("2026-08-20T18:45:00-05:00"),
      metadata: consentEvidence(diego.email, 20_000),
    },
  });

  // August 2026 period, snapshotted on Aug 10 while all six
  // authorizations above were still active.
  const august = await prisma.payrollPeriod.create({
    data: {
      companyId: company.id,
      month: 8,
      year: 2026,
      createdAt: new Date("2026-08-10T09:00:00-05:00"),
    },
  });

  const receivedAt = new Date("2026-08-28T15:00:00-05:00");

  const contributionSeeds = [
    // 2 RECEIVED
    { employee: ana, auth: anaAuth, deducted: 20_000, status: ContributionStatus.RECEIVED },
    { employee: carlos, auth: carlosAuth, deducted: 50_000, status: ContributionStatus.RECEIVED },
    // 3 DEDUCTED
    { employee: laura, auth: lauraAuth, deducted: 10_000, status: ContributionStatus.DEDUCTED },
    { employee: andres, auth: andresAuth, deducted: 20_000, status: ContributionStatus.DEDUCTED },
    { employee: maria, auth: mariaAuth2, deducted: 50_000, status: ContributionStatus.DEDUCTED },
    // 1 pending: snapshotted but no deduction registered yet
    { employee: diego, auth: diegoAuth, deducted: null, status: ContributionStatus.AUTHORIZED },
  ];

  for (const seed of contributionSeeds) {
    await prisma.payrollContribution.create({
      data: {
        payrollPeriodId: august.id,
        employeeId: seed.employee.id,
        authorizationId: seed.auth.id,
        amountAuthorized: seed.auth.amount,
        amountDeducted: seed.deducted,
        status: seed.status,
        receivedByFoundationAt: seed.status === ContributionStatus.RECEIVED ? receivedAt : null,
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  Platform admin: ${platformAdmin.email}`);
  console.log(`  Company admin:  ${companyAdmin.email}`);
  console.log(`  Company:        ${company.name}`);
  console.log(`  Employees:      ${employees.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
