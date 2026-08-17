import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/guards";
import { getCompanyDetail, type CompanyMonthly } from "@/lib/company-overview";
import { EMPLOYEE_STATUS_LABELS } from "@/lib/labels";
import { formatCop, formatPeriod } from "@/lib/format";

function monthlyStateLabel(row: CompanyMonthly): string {
  if (row.received) return "Recibido";
  if (row.transferred) return "Transferido";
  return "En proceso";
}

function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const { id } = await params;

  const detail = await getCompanyDetail(id);
  if (!detail) notFound();
  const { company, employees, monthly, metrics } = detail;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/platform" className="text-sm text-muted-foreground hover:underline">
          ← Volver a plataforma
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{company.name}</h1>
        <p className="text-sm text-muted-foreground">NIT {company.nit}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Métricas del piloto</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            ["Empleados invitados", String(metrics.invited)],
            ["Tasa de activación", formatRate(metrics.activationRate)],
            [
              "Aporte promedio",
              metrics.averageContribution === null
                ? "—"
                : `${formatCop(Math.round(metrics.averageContribution))} / mes`,
            ],
            ["Tasa de primer descuento", formatRate(metrics.firstDeductionRate)],
            ["Retención a 3 meses", formatRate(metrics.threeMonthRetention)],
            ["Total recibido por la fundación", formatCop(metrics.totalReceived)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-card p-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          La métrica principal del piloto es la retención a 3 meses: % de donantes del primer mes
          con descuentos que siguen aportando en el tercer mes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Donaciones por mes</h2>
        {monthly.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay períodos de nómina.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Mes</th>
                  <th className="p-3 text-right font-medium">Aportes</th>
                  <th className="p-3 text-right font-medium">Total donado</th>
                  <th className="p-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((row) => (
                  <tr key={row.periodId} className="border-b last:border-0">
                    <td className="p-3">{formatPeriod(row.month, row.year)}</td>
                    <td className="p-3 text-right">{row.deductedCount}</td>
                    <td className="p-3 text-right font-medium">
                      {formatCop(row.totalDeducted)}
                    </td>
                    <td className="p-3">{monthlyStateLabel(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Empleados inscritos ({employees.length})</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">Nombre</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Estado</th>
                <th className="p-3 text-right font-medium">Aporte activo</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b last:border-0">
                  <td className="p-3">{employee.name}</td>
                  <td className="p-3">{employee.email}</td>
                  <td className="p-3">{EMPLOYEE_STATUS_LABELS[employee.status]}</td>
                  <td className="p-3 text-right">
                    {employee.activeAmount !== null
                      ? `${formatCop(employee.activeAmount)} / mes`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
