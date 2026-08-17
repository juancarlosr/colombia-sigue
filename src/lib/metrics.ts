import { AuthorizationStatus, ContributionStatus } from "@prisma/client";
import { db } from "@/lib/db";

// The six pilot metrics from spec §24. Rates are 0..1; null means "not
// yet measurable" (e.g. retention before the third month has results).
export type PilotMetrics = {
  invited: number;
  activationRate: number | null;
  averageContribution: number | null;
  firstDeductionRate: number | null;
  threeMonthRetention: number | null;
  totalReceived: number;
};

export async function getPilotMetrics(companyId: string): Promise<PilotMetrics> {
  const [invited, authorizedEmployees, activeAgg, deductedDonors, receivedAgg] =
    await Promise.all([
      db.employee.count({ where: { companyId, invitedAt: { not: null } } }),
      db.donationAuthorization.findMany({
        where: { employee: { companyId } },
        distinct: ["employeeId"],
        select: { employeeId: true },
      }),
      db.donationAuthorization.aggregate({
        where: { status: AuthorizationStatus.ACTIVE, employee: { companyId } },
        _avg: { amount: true },
      }),
      db.payrollContribution.findMany({
        where: { amountDeducted: { not: null }, payrollPeriod: { companyId } },
        distinct: ["employeeId"],
        select: { employeeId: true },
      }),
      db.payrollContribution.aggregate({
        where: { status: ContributionStatus.RECEIVED, payrollPeriod: { companyId } },
        _sum: { amountDeducted: true },
      }),
    ]);

  const authorizedCount = authorizedEmployees.length;

  // Retention: donors of the first month with real deductions who are
  // also donors two months later (spec's primary metric).
  const periods = await db.payrollPeriod.findMany({
    where: { companyId },
    orderBy: [{ year: "asc" }, { month: "asc" }],
    include: {
      contributions: {
        where: { amountDeducted: { not: null } },
        select: { employeeId: true },
      },
    },
  });
  const withDeductions = periods.filter((p) => p.contributions.length > 0);
  let threeMonthRetention: number | null = null;
  if (withDeductions.length > 0) {
    const first = withDeductions[0];
    const firstIndex = first.year * 12 + first.month;
    const third = periods.find((p) => p.year * 12 + p.month === firstIndex + 2);
    if (third && third.contributions.length > 0) {
      const firstDonors = new Set(first.contributions.map((c) => c.employeeId));
      const retained = new Set(
        third.contributions.map((c) => c.employeeId).filter((id) => firstDonors.has(id)),
      );
      threeMonthRetention = retained.size / firstDonors.size;
    }
  }

  return {
    invited,
    activationRate: invited > 0 ? authorizedCount / invited : null,
    averageContribution: activeAgg._avg.amount,
    firstDeductionRate: authorizedCount > 0 ? deductedDonors.length / authorizedCount : null,
    threeMonthRetention,
    totalReceived: receivedAgg._sum.amountDeducted ?? 0,
  };
}
