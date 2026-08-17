import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AuthorizationStatus,
  ContributionStatus,
  EmployeeStatus,
  PayrollPeriodStatus,
  PrismaClient,
  UserRole,
  type DonationAuthorization,
  type Employee,
} from "@prisma/client";
import {
  AUTHORIZATION_TEXT_VERSION,
  buildAuthorizationText,
} from "../src/lib/authorization-text";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FOUNDATION_NAME = "Fundación Reconstruir Colombia";

// Deterministic name pools — the seed produces the same data every run.
const FIRST_NAMES = [
  "Valentina", "Santiago", "Isabella", "Mateo", "Daniela", "Sebastián",
  "Gabriela", "Nicolás", "Paula", "Alejandro", "Manuela", "David",
  "Juliana", "Tomás", "Mariana", "Samuel", "Luciana", "Emilio",
  "Antonia", "Martín", "Salomé", "Jerónimo", "Renata", "Simón",
];
const LAST_NAMES = [
  "Moreno", "Jiménez", "Álvarez", "Romero", "Suárez", "Ortiz",
  "Cárdenas", "Pineda", "Mejía", "Quintero", "Salazar", "Navarro",
  "Peña", "Osorio", "Cano", "Zapata", "Arango", "Betancur",
  "Montoya", "Restrepo", "Franco", "Giraldo", "Villa", "Londoño",
];
const AMOUNTS = [10_000, 20_000, 50_000, 20_000, 30_000, 100_000, 25_000, 50_000, 20_000, 10_000];

type PeriodKind = "completed" | "deducted" | "snapshot";
type PeriodPlan = { month: number; kind: PeriodKind };
type CompanyPlan = {
  name: string;
  nit: string;
  domain: string;
  employeeCount: number;
  donorCount: number;
  periods: PeriodPlan[];
};

// Five companies at different stages of the pilot: Celerik and ACME
// with three months of history (retention is measurable), Gutierrez
// mid-cycle with a fresh snapshot, San Remo with results uploaded but
// not yet transferred, and Cubia freshly onboarded.
const COMPANY_PLANS: CompanyPlan[] = [
  { name: "Celerik", nit: "901.111.111-1", domain: "celerik.example.com", employeeCount: 38, donorCount: 16, periods: [{ month: 6, kind: "completed" }, { month: 7, kind: "completed" }, { month: 8, kind: "deducted" }] },
  { name: "Gutierrez Group", nit: "901.222.222-2", domain: "gutierrezgroup.example.com", employeeCount: 65, donorCount: 20, periods: [{ month: 7, kind: "completed" }, { month: 8, kind: "snapshot" }] },
  { name: "Grupo San Remo", nit: "901.333.333-3", domain: "sanremo.example.com", employeeCount: 46, donorCount: 17, periods: [{ month: 8, kind: "deducted" }] },
  { name: "Cubia", nit: "901.444.444-4", domain: "cubia.example.com", employeeCount: 4, donorCount: 2, periods: [] },
  { name: "ACME", nit: "900.123.456-7", domain: "acme.example.com", employeeCount: 93, donorCount: 37, periods: [{ month: 6, kind: "completed" }, { month: 7, kind: "completed" }, { month: 8, kind: "deducted" }] },
];

const YEAR = 2026;

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function bogota(month: number, day: number): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(`${YEAR}-${pad(month)}-${pad(day)}T12:00:00-05:00`);
}

function consentEvidence(companyName: string, email: string, amount: number) {
  return {
    authorizationText: buildAuthorizationText(companyName, FOUNDATION_NAME, amount),
    authorizationTextVersion: AUTHORIZATION_TEXT_VERSION,
    email,
    ipAddress: null,
    userAgent: null,
    seededDemoData: true,
  };
}

async function createActiveAuth(
  companyName: string,
  employee: Employee,
  amount: number,
): Promise<DonationAuthorization> {
  return prisma.donationAuthorization.create({
    data: {
      employeeId: employee.id,
      amount,
      status: AuthorizationStatus.ACTIVE,
      authorizationTextVersion: AUTHORIZATION_TEXT_VERSION,
      authorizedAt: bogota(6, 1),
      metadata: consentEvidence(companyName, employee.email, amount),
    },
  });
}

type Donor = { employee: Employee; auth: DonationAuthorization };

// Contributors drift across months so retention is < 100%: early months
// exclude late joiners, the current month skips every 9th donor.
function completedContributors(donors: Donor[], periodIndex: number): Donor[] {
  const end = Math.max(1, Math.floor(donors.length * (0.75 + 0.08 * periodIndex)));
  return donors.slice(periodIndex, Math.max(periodIndex + 1, end));
}

async function seedCompany(plan: CompanyPlan, planIndex: number): Promise<void> {
  const adminUser = await prisma.user.create({
    data: { email: `rrhh@${plan.domain}`, role: UserRole.COMPANY_ADMIN },
  });
  const company = await prisma.company.create({
    data: { name: plan.name, nit: plan.nit, adminUserId: adminUser.id },
  });

  const isAcme = plan.name === "ACME";
  const employees: Employee[] = [];
  const donors: Donor[] = [];

  // ACME embeds the spec §29 demo cast (exact journey states) plus
  // Juan Carlos' real demo account, so those logins keep working.
  if (isAcme) {
    const named: Array<{ ext: string; name: string; doc: string; email: string; status: EmployeeStatus }> = [
      { ext: "EMP-001", name: "Ana Gómez", doc: "1020304050", email: "ana.gomez@acme.example.com", status: EmployeeStatus.ACTIVATED },
      { ext: "EMP-002", name: "Carlos Ruiz", doc: "1020304051", email: "carlos.ruiz@acme.example.com", status: EmployeeStatus.ACTIVATED },
      { ext: "EMP-003", name: "Laura Díaz", doc: "1020304052", email: "laura.diaz@acme.example.com", status: EmployeeStatus.ACTIVATED },
      { ext: "EMP-004", name: "Andrés Torres", doc: "1020304053", email: "andres.torres@acme.example.com", status: EmployeeStatus.ACTIVATED },
      { ext: "EMP-005", name: "María Fernanda López", doc: "1020304054", email: "maria.lopez@acme.example.com", status: EmployeeStatus.ACTIVATED },
      { ext: "EMP-006", name: "Diego Martínez", doc: "1020304055", email: "diego.martinez@acme.example.com", status: EmployeeStatus.ACTIVATED },
      { ext: "EMP-007", name: "Sofía Herrera", doc: "1020304056", email: "sofia.herrera@acme.example.com", status: EmployeeStatus.INVITED },
      { ext: "EMP-008", name: "Julián Castro", doc: "1020304057", email: "julian.castro@acme.example.com", status: EmployeeStatus.INVITED },
      { ext: "EMP-009", name: "Camila Vargas", doc: "1020304058", email: "camila.vargas@acme.example.com", status: EmployeeStatus.IMPORTED },
      { ext: "EMP-010", name: "Felipe Rojas", doc: "1020304059", email: "felipe.rojas@acme.example.com", status: EmployeeStatus.IMPORTED },
      { ext: "EMP-011", name: "Juan Carlos Ramírez", doc: "1000000000", email: "juancarlosr@gmail.com", status: EmployeeStatus.ACTIVATED },
    ];
    for (const n of named) {
      const user =
        n.status === EmployeeStatus.ACTIVATED
          ? await prisma.user.create({ data: { email: n.email, role: UserRole.EMPLOYEE } })
          : null;
      employees.push(
        await prisma.employee.create({
          data: {
            companyId: company.id,
            externalId: n.ext,
            name: n.name,
            documentNumber: n.doc,
            email: n.email,
            status: n.status,
            invitedAt: n.status === EmployeeStatus.IMPORTED ? null : bogota(5, 28),
            userId: user?.id ?? null,
          },
        }),
      );
    }

    const [ana, carlos, laura, andres, maria, diego, , , , , juanCarlos] = employees;
    donors.push({ employee: ana, auth: await createActiveAuth(plan.name, ana, 20_000) });
    donors.push({ employee: carlos, auth: await createActiveAuth(plan.name, carlos, 50_000) });
    donors.push({ employee: laura, auth: await createActiveAuth(plan.name, laura, 10_000) });
    donors.push({ employee: andres, auth: await createActiveAuth(plan.name, andres, 20_000) });

    // María changed her amount: SUPERSEDED chain.
    const mariaAuth = await createActiveAuth(plan.name, maria, 50_000);
    await prisma.donationAuthorization.create({
      data: {
        employeeId: maria.id,
        amount: 20_000,
        status: AuthorizationStatus.SUPERSEDED,
        authorizationTextVersion: AUTHORIZATION_TEXT_VERSION,
        authorizedAt: bogota(5, 30),
        supersededById: mariaAuth.id,
        metadata: consentEvidence(plan.name, maria.email, 20_000),
      },
    });
    donors.push({ employee: maria, auth: mariaAuth });

    // Diego authorized and later cancelled.
    await prisma.donationAuthorization.create({
      data: {
        employeeId: diego.id,
        amount: 20_000,
        status: AuthorizationStatus.CANCELLED,
        authorizationTextVersion: AUTHORIZATION_TEXT_VERSION,
        authorizedAt: bogota(6, 2),
        cancelledAt: bogota(8, 5),
        metadata: consentEvidence(plan.name, diego.email, 20_000),
      },
    });

    donors.push({ employee: juanCarlos, auth: await createActiveAuth(plan.name, juanCarlos, 100_000) });
  }

  // Generated employees fill the remaining headcount. They have no User
  // row — an account is provisioned automatically on first login.
  const generatedCount = plan.employeeCount - employees.length;
  const generatedDonorCount = plan.donorCount - donors.length;
  const rows = Array.from({ length: generatedCount }, (_, i) => {
    const firstName = FIRST_NAMES[(i * 5 + planIndex * 3) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 7 + planIndex * 11) % LAST_NAMES.length];
    const isDonor = i < generatedDonorCount;
    const status = isDonor
      ? EmployeeStatus.ACTIVATED
      : i % 10 === 9
        ? EmployeeStatus.ACTIVATED
        : i % 10 >= 6
          ? EmployeeStatus.INVITED
          : EmployeeStatus.IMPORTED;
    return {
      companyId: company.id,
      externalId: `EMP-${String(100 + i)}`,
      name: `${firstName} ${lastName}`,
      documentNumber: String(10_000_000 + planIndex * 1_000_000 + i),
      email: `${slugify(firstName)}.${slugify(lastName)}.${i}@${plan.domain}`,
      status,
      invitedAt: status === EmployeeStatus.IMPORTED ? null : bogota(5, 28),
    };
  });
  await prisma.employee.createMany({ data: rows });
  const generated = await prisma.employee.findMany({
    where: { companyId: company.id, externalId: { startsWith: "EMP-1" } },
    orderBy: { externalId: "asc" },
  });

  for (let i = 0; i < generated.length; i++) {
    if (i < generatedDonorCount) {
      const amount = AMOUNTS[(i + planIndex) % AMOUNTS.length];
      donors.push({ employee: generated[i], auth: await createActiveAuth(plan.name, generated[i], amount) });
    }
  }

  // One activated non-donor per sizeable company holds a CANCELLED
  // authorization, so activation rate > first-deduction data is honest.
  const cancelledCandidate = generated.find(
    (e, i) => i >= generatedDonorCount && e.status === EmployeeStatus.ACTIVATED,
  );
  if (cancelledCandidate) {
    await prisma.donationAuthorization.create({
      data: {
        employeeId: cancelledCandidate.id,
        amount: 20_000,
        status: AuthorizationStatus.CANCELLED,
        authorizationTextVersion: AUTHORIZATION_TEXT_VERSION,
        authorizedAt: bogota(6, 3),
        cancelledAt: bogota(7, 15),
        metadata: consentEvidence(plan.name, cancelledCandidate.email, 20_000),
      },
    });
  }

  // Payroll history.
  for (let p = 0; p < plan.periods.length; p++) {
    const spec = plan.periods[p];
    const isCompleted = spec.kind === "completed";
    const contributors = isCompleted ? completedContributors(donors, p) : donors;

    const contributionRows = contributors.map((donor, i) => {
      const deducted =
        spec.kind === "snapshot" ? null : spec.kind === "deducted" && i % 9 === 4 ? null : donor.auth.amount;
      return {
        employeeId: donor.employee.id,
        authorizationId: donor.auth.id,
        amountAuthorized: donor.auth.amount,
        amountDeducted: deducted,
        status:
          deducted === null
            ? ContributionStatus.AUTHORIZED
            : isCompleted
              ? ContributionStatus.RECEIVED
              : ContributionStatus.DEDUCTED,
        receivedByFoundationAt: isCompleted && deducted !== null ? bogota(spec.month + 1, 2) : null,
      };
    });
    const totalDeducted = contributionRows.reduce((sum, c) => sum + (c.amountDeducted ?? 0), 0);

    const period = await prisma.payrollPeriod.create({
      data: {
        companyId: company.id,
        month: spec.month,
        year: YEAR,
        status: isCompleted ? PayrollPeriodStatus.CLOSED : PayrollPeriodStatus.OPEN,
        createdAt: bogota(spec.month, 10),
        transferAmount: isCompleted ? totalDeducted : null,
        transferDate: isCompleted ? bogota(spec.month, 28) : null,
        transferBankReference: isCompleted ? `TRX-${slugify(plan.name).replace(/\s/g, "")}-${YEAR}${String(spec.month).padStart(2, "0")}` : null,
        foundationReceivedAt: isCompleted ? bogota(spec.month + 1, 2) : null,
      },
    });
    await prisma.payrollContribution.createMany({
      data: contributionRows.map((row) => ({ ...row, payrollPeriodId: period.id })),
    });
  }

  console.log(
    `  ${plan.name}: ${plan.employeeCount} empleados, ${donors.length} donantes, ${plan.periods.length} períodos (admin: rrhh@${plan.domain})`,
  );
}

async function main() {
  // Demo data is fully rebuilt on every seed run.
  await prisma.payrollContribution.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.donationAuthorization.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.company.deleteMany();
  await prisma.foundation.deleteMany();
  await prisma.loginToken.deleteMany();
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

  console.log("Seed:");
  for (let i = 0; i < COMPANY_PLANS.length; i++) {
    await seedCompany(COMPANY_PLANS[i], i);
  }
  console.log(`  Platform admin: ${platformAdmin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
