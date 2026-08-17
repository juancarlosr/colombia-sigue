import { requireCompanyAdmin } from "@/lib/auth/company-admin";
import { buildPayrollCsv, openOperatingPeriod, syncPeriodSnapshot } from "@/lib/payroll";

// Downloading the payroll file is what snapshots the period: the CSV
// and the stored contributions always match what HR takes to payroll.
// The target is the operating period (most recent open, un-transferred
// one), NOT the calendar month — payroll cycles cross month boundaries.
export async function GET() {
  const { company } = await requireCompanyAdmin();

  const period = await openOperatingPeriod(company.id);
  await syncPeriodSnapshot(period.id);
  const csv = await buildPayrollCsv(period.id);

  const paddedMonth = String(period.month).padStart(2, "0");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nomina-${period.year}-${paddedMonth}.csv"`,
    },
  });
}
