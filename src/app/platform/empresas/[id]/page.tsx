import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/guards";
import { getCompanyDetail, type CompanyMonthly } from "@/lib/company-overview";
import { EMPLOYEE_STATUS_LABELS } from "@/lib/labels";
import { formatCop, formatPeriod } from "@/lib/format";
import { SortableTable } from "@/components/sortable-table";

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
            <div key={label} className="rounded-lg border bg-card p-4">
              <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</dd>
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
          <SortableTable
            columns={[
              { key: "month", label: "Mes" },
              { key: "count", label: "Aportes", align: "right" },
              { key: "total", label: "Total donado", align: "right" },
              { key: "state", label: "Estado" },
            ]}
            rows={monthly.map((row) => ({
              id: row.periodId,
              cells: {
                month: {
                  node: formatPeriod(row.month, row.year),
                  value: row.year * 100 + row.month,
                },
                count: { node: row.deductedCount, value: row.deductedCount },
                total: {
                  node: <span className="font-medium">{formatCop(row.totalDeducted)}</span>,
                  value: row.totalDeducted,
                },
                state: {
                  node: monthlyStateLabel(row),
                  value: row.received ? 2 : row.transferred ? 1 : 0,
                },
              },
            }))}
          />
        )}
      </section>

      {/* Colapsado por defecto: el operador de plataforma escanea métricas y
          períodos; el listado nominal solo cuando lo necesita (spec §21). */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-lg font-semibold">
          <span className="text-sm transition-transform group-open:rotate-90" aria-hidden="true">
            ▸
          </span>
          Empleados inscritos ({employees.length})
        </summary>
        <div className="mt-3">
          <SortableTable
          columns={[
            { key: "name", label: "Nombre" },
            { key: "email", label: "Email" },
            { key: "status", label: "Estado" },
            { key: "amount", label: "Aporte activo", align: "right" },
          ]}
          rows={employees.map((employee) => ({
            id: employee.id,
            cells: {
              name: { node: employee.name, value: employee.name },
              email: { node: employee.email, value: employee.email },
              status: {
                node: EMPLOYEE_STATUS_LABELS[employee.status],
                value: EMPLOYEE_STATUS_LABELS[employee.status],
              },
              amount: {
                node:
                  employee.activeAmount !== null
                    ? `${formatCop(employee.activeAmount)} / mes`
                    : "—",
                value: employee.activeAmount,
              },
            },
          }))}
          />
        </div>
      </details>
    </div>
  );
}
