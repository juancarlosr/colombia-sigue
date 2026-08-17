import { requireCompanyAdmin } from "@/lib/auth/company-admin";
import {
  buildPayrollCsv,
  currentPeriodParts,
  getOrCreatePeriod,
  syncPeriodSnapshot,
} from "@/lib/payroll";

// Downloading the payroll file is what snapshots the period: the CSV
// and the stored contributions always match what HR takes to payroll.
export async function GET() {
  const { company } = await requireCompanyAdmin();

  const { month, year } = currentPeriodParts();
  const period = await getOrCreatePeriod(company.id, month, year);
  await syncPeriodSnapshot(period.id);
  const csv = await buildPayrollCsv(period.id);

  const paddedMonth = String(month).padStart(2, "0");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nomina-${year}-${paddedMonth}.csv"`,
    },
  });
}
