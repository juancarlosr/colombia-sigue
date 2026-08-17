import Link from "next/link";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { getCompaniesOverview } from "@/lib/company-overview";
import { formatCop, formatPeriod } from "@/lib/format";
import { SortableTable } from "@/components/sortable-table";
import { MarkReceivedButton } from "./mark-received-button";

export default async function PlatformHomePage() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const [foundation, companies, periods] = await Promise.all([
    db.foundation.findFirst(),
    getCompaniesOverview(),
    db.payrollPeriod.findMany({
      include: { company: true, contributions: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Administración de plataforma</h1>
        <Button render={<Link href="/platform/fundacion" />} variant="outline">
          Configurar fundación
        </Button>
      </div>

      <section className="rounded-xl border bg-card p-4 text-sm">
        <p className="text-muted-foreground">Fundación</p>
        <p className="text-lg font-semibold">{foundation?.displayName ?? "Sin configurar"}</p>
        {foundation && (
          <p className="text-muted-foreground">
            {foundation.legalName} · NIT {foundation.nit}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Empresas inscritas ({companies.length})</h2>
        <SortableTable
          columns={[
            { key: "company", label: "Empresa" },
            { key: "employees", label: "Empleados", align: "right" },
            { key: "activated", label: "Activados", align: "right" },
            { key: "donors", label: "Donantes activos", align: "right" },
            { key: "authorized", label: "Autorizado / mes", align: "right" },
            { key: "donated", label: "Donado total", align: "right" },
            { key: "detail", label: "", sortable: false },
          ]}
          rows={companies.map((company) => ({
            id: company.id,
            cells: {
              company: {
                node: (
                  <>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-xs text-muted-foreground">NIT {company.nit}</p>
                  </>
                ),
                value: company.name,
              },
              employees: { node: company.employeesTotal, value: company.employeesTotal },
              activated: { node: company.employeesActivated, value: company.employeesActivated },
              donors: { node: company.activeDonors, value: company.activeDonors },
              authorized: {
                node: formatCop(company.monthlyAuthorized),
                value: company.monthlyAuthorized,
              },
              donated: {
                node: (
                  <span className="font-medium">{formatCop(company.totalDeducted)}</span>
                ),
                value: company.totalDeducted,
              },
              detail: {
                node: (
                  <Link
                    href={`/platform/empresas/${company.id}`}
                    className="text-sm underline underline-offset-2"
                  >
                    Ver detalle
                  </Link>
                ),
                value: null,
              },
            },
          }))}
        />
        <p className="text-xs text-muted-foreground">
          Donado total suma los descuentos de nómina realmente aplicados. El detalle por mes y
          las métricas del piloto están en cada empresa.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Períodos de nómina</h2>
        {periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay períodos.</p>
        ) : (
          <SortableTable
            columns={[
              { key: "period", label: "Período" },
              { key: "company", label: "Empresa" },
              { key: "deducted", label: "Descontado", align: "right" },
              { key: "transfer", label: "Transferencia" },
              { key: "reception", label: "Recepción" },
            ]}
            rows={periods.map((period) => {
              const totalDeducted = period.contributions.reduce(
                (sum, c) => sum + (c.amountDeducted ?? 0),
                0,
              );
              return {
                id: period.id,
                cells: {
                  period: {
                    node: formatPeriod(period.month, period.year),
                    value: period.year * 100 + period.month,
                  },
                  company: {
                    node: (
                      <Link
                        href={`/platform/empresas/${period.companyId}`}
                        className="underline underline-offset-2"
                      >
                        {period.company.name}
                      </Link>
                    ),
                    value: period.company.name,
                  },
                  deducted: { node: formatCop(totalDeducted), value: totalDeducted },
                  transfer: {
                    node: period.transferDate
                      ? `${formatCop(period.transferAmount ?? 0)} · ${period.transferDate.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })} · Ref: ${period.transferBankReference}`
                      : "Sin registrar",
                    value: period.transferDate?.getTime() ?? null,
                  },
                  reception: {
                    node: period.foundationReceivedAt ? (
                      <span className="font-medium text-green-700 dark:text-green-400">
                        Recibido
                      </span>
                    ) : period.transferDate ? (
                      <MarkReceivedButton periodId={period.id} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    ),
                    // orden: recibido > transferido pendiente > sin transferencia
                    value: period.foundationReceivedAt ? 2 : period.transferDate ? 1 : 0,
                  },
                },
              };
            })}
          />
        )}
      </section>
    </div>
  );
}
