import Link from "next/link";
import { AuthorizationStatus, ContributionStatus, EmployeeStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/company-admin";
import { resolveOperatingPeriod } from "@/lib/payroll";
import { formatCop, formatPeriod } from "@/lib/format";
import { InviteButton } from "./invite-button";

export default async function AdminDashboardPage() {
  const { company } = await requireCompanyAdmin();
  const resolution = await resolveOperatingPeriod(company.id);
  const { month, year } = resolution;
  const period = resolution.period;

  const [invitedCount, pendingInviteCount, activeAuthorizations] = await Promise.all([
    db.employee.count({ where: { companyId: company.id, invitedAt: { not: null } } }),
    db.employee.count({
      where: { companyId: company.id, status: { not: EmployeeStatus.ACTIVATED } },
    }),
    db.donationAuthorization.findMany({
      where: { status: AuthorizationStatus.ACTIVE, employee: { companyId: company.id } },
      include: { employee: true },
      orderBy: { employee: { name: "asc" } },
    }),
  ]);

  const totalAuthorized = activeAuthorizations.reduce((sum, a) => sum + a.amount, 0);
  const deducted = period?.contributions.filter((c) => c.amountDeducted !== null) ?? [];
  const totalDeducted = deducted.reduce((sum, c) => sum + (c.amountDeducted ?? 0), 0);
  const receivedCount =
    period?.contributions.filter((c) => c.status === ContributionStatus.RECEIVED).length ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          <p className="text-muted-foreground">{formatPeriod(month, year)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/admin/importar" />} variant="outline">
            Importar empleados
          </Button>
          <InviteButton pendingCount={pendingInviteCount} />
          <Button render={<Link href="/admin/nomina" />}>Nómina del mes</Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Empleados invitados", String(invitedCount)],
          ["Donantes activos", String(activeAuthorizations.length)],
          ["Monto autorizado", `${formatCop(totalAuthorized)} / mes`],
          [
            "Descontado este período",
            deducted.length > 0 ? formatCop(totalDeducted) : "—",
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {period && (
        <p className="text-sm text-muted-foreground">
          Período {formatPeriod(month, year)}: {period.contributions.length} aportes en el
          snapshot · {deducted.length} descontados
          {period.transferDate ? " · transferencia registrada" : ""}
          {period.foundationReceivedAt ? ` · ${receivedCount} confirmados por la fundación` : ""}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Donantes activos</h2>
        {activeAuthorizations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay donantes activos.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Empleado</th>
                  <th className="p-3 font-medium">Documento</th>
                  <th className="p-3 text-right font-medium">Monto mensual</th>
                </tr>
              </thead>
              <tbody>
                {activeAuthorizations.map((auth) => (
                  <tr key={auth.id} className="border-b last:border-0">
                    <td className="p-3">{auth.employee.name}</td>
                    <td className="p-3">{auth.employee.documentNumber}</td>
                    <td className="p-3 text-right font-medium">{formatCop(auth.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
