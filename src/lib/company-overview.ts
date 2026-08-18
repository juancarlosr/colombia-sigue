import {
  AuthorizationStatus,
  CompanyStatus,
  EmployeeStatus,
  type Company,
  type Employee,
} from "@prisma/client";
import { db } from "@/lib/db";
import { getPilotMetrics, type PilotMetrics } from "@/lib/metrics";

// Aggregations run in JS over full fetches: fine at pilot scale (one
// company, tens of employees). Revisit with SQL grouping if the
// platform ever hosts many companies.

export type CompanyOverview = {
  id: string;
  name: string;
  nit: string;
  employeesTotal: number;
  employeesActivated: number;
  activeDonors: number;
  monthlyAuthorized: number;
  totalDeducted: number;
  totalReceived: number;
};

export async function getCompaniesOverview(): Promise<CompanyOverview[]> {
  const [companies, employees, activeAuths, contributions] = await Promise.all([
    db.company.findMany({
      where: { status: CompanyStatus.ACTIVE },
      orderBy: { name: "asc" },
    }),
    db.employee.findMany({ select: { companyId: true, status: true } }),
    db.donationAuthorization.findMany({
      where: { status: AuthorizationStatus.ACTIVE },
      select: { amount: true, employee: { select: { companyId: true } } },
    }),
    db.payrollContribution.findMany({
      where: { amountDeducted: { not: null } },
      select: {
        amountDeducted: true,
        status: true,
        payrollPeriod: { select: { companyId: true } },
      },
    }),
  ]);

  return companies.map((company) => {
    const companyEmployees = employees.filter((e) => e.companyId === company.id);
    const companyAuths = activeAuths.filter((a) => a.employee.companyId === company.id);
    const companyContributions = contributions.filter(
      (c) => c.payrollPeriod.companyId === company.id,
    );
    return {
      id: company.id,
      name: company.name,
      nit: company.nit,
      employeesTotal: companyEmployees.length,
      employeesActivated: companyEmployees.filter(
        (e) => e.status === EmployeeStatus.ACTIVATED,
      ).length,
      activeDonors: companyAuths.length,
      monthlyAuthorized: companyAuths.reduce((sum, a) => sum + a.amount, 0),
      totalDeducted: companyContributions.reduce((sum, c) => sum + (c.amountDeducted ?? 0), 0),
      totalReceived: companyContributions
        .filter((c) => c.status === "RECEIVED")
        .reduce((sum, c) => sum + (c.amountDeducted ?? 0), 0),
    };
  });
}

export type CompanyMonthly = {
  periodId: string;
  month: number;
  year: number;
  deductedCount: number;
  totalDeducted: number;
  transferred: boolean;
  received: boolean;
};

export type CompanyEmployeeRow = Pick<Employee, "id" | "name" | "email" | "status"> & {
  activeAmount: number | null;
};

export type CompanyDetail = {
  company: Company;
  employees: CompanyEmployeeRow[];
  monthly: CompanyMonthly[];
  metrics: PilotMetrics;
};

export async function getCompanyDetail(companyId: string): Promise<CompanyDetail | null> {
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) return null;

  const [employees, activeAuths, periods, metrics] = await Promise.all([
    db.employee.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, status: true },
      orderBy: { name: "asc" },
    }),
    db.donationAuthorization.findMany({
      where: { status: AuthorizationStatus.ACTIVE, employee: { companyId } },
      select: { employeeId: true, amount: true },
    }),
    db.payrollPeriod.findMany({
      where: { companyId },
      include: { contributions: { select: { amountDeducted: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    getPilotMetrics(companyId),
  ]);

  const activeByEmployee = new Map(activeAuths.map((a) => [a.employeeId, a.amount]));

  return {
    company,
    employees: employees.map((e) => ({
      ...e,
      activeAmount: activeByEmployee.get(e.id) ?? null,
    })),
    monthly: periods.map((p) => {
      const deducted = p.contributions.filter((c) => c.amountDeducted !== null);
      return {
        periodId: p.id,
        month: p.month,
        year: p.year,
        deductedCount: deducted.length,
        totalDeducted: deducted.reduce((sum, c) => sum + (c.amountDeducted ?? 0), 0),
        transferred: p.transferDate !== null,
        received: p.foundationReceivedAt !== null,
      };
    }),
    metrics,
  };
}
