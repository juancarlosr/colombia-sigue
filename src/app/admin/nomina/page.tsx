import Link from "next/link";
import { ContributionStatus, PayrollPeriodStatus, type PayrollPeriod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/company-admin";
import { resolveOperatingPeriod } from "@/lib/payroll";
import { formatCop, formatPeriod } from "@/lib/format";
import { ResultsForm } from "./results-form";
import { TransferForm } from "./transfer-form";

function periodStateLabel(
  period: PayrollPeriod & { deductedCount: number },
): string {
  if (period.foundationReceivedAt) return "Recibido por la fundación";
  if (period.transferDate) return "Transferido — esperando confirmación";
  if (period.status === PayrollPeriodStatus.CLOSED) return "Cerrado sin descuentos";
  return "En proceso";
}

export default async function PayrollPage() {
  const { company } = await requireCompanyAdmin();
  const resolution = await resolveOperatingPeriod(company.id);
  const period = resolution.period;

  const [foundation, recentPeriods] = await Promise.all([
    db.foundation.findFirstOrThrow(),
    db.payrollPeriod.findMany({
      where: { companyId: company.id },
      include: { contributions: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 4,
    }),
  ]);

  const pending =
    period?.contributions.filter((c) => c.status === ContributionStatus.AUTHORIZED) ?? [];
  const deducted =
    period?.contributions.filter((c) => c.status === ContributionStatus.DEDUCTED) ?? [];
  const totalToTransfer = deducted.reduce((sum, c) => sum + (c.amountDeducted ?? 0), 0);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
          ← Volver al dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nómina — {formatPeriod(resolution.month, resolution.year)}
        </h1>
        {resolution.staleToClose && (
          <p className="mt-1 text-sm text-muted-foreground">
            El período {formatPeriod(resolution.staleToClose.month, resolution.staleToClose.year)}{" "}
            no tuvo descuentos y se cerrará automáticamente al descargar el nuevo CSV.
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1 · Descargar autorizaciones para nómina</h2>
        <p className="text-sm text-muted-foreground">
          El archivo contiene las autorizaciones actualmente activas. Descargarlo crea o
          actualiza el snapshot del período — descárgalo de nuevo el día de nómina para reflejar
          cancelaciones y cambios de monto de última hora.
          {period ? ` Snapshot actual: ${period.contributions.length} aportes.` : ""}
        </p>
        <Button render={<a href="/admin/nomina/csv" />} variant="outline">
          Descargar CSV de nómina
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2 · Registrar resultados de nómina</h2>
        <p className="text-sm text-muted-foreground">
          Después de ejecutar la nómina, sube el archivo con los descuentos realmente aplicados.
          Puedes corregirlo subiéndolo de nuevo mientras no registres la transferencia.
          {pending.length > 0 ? ` Aportes pendientes de resultado: ${pending.length}.` : ""}
          {deducted.length > 0
            ? ` Descuentos registrados: ${deducted.length} por ${formatCop(totalToTransfer)}.`
            : ""}
        </p>
        <ResultsForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3 · Transferir a la fundación</h2>
        {deducted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Registra primero los resultados de nómina para conocer el total a transferir.
          </p>
        ) : (
          <>
            <div className="rounded-xl border bg-card p-4 text-sm">
              <p className="text-muted-foreground">Total descontado</p>
              <p className="text-2xl font-semibold">{formatCop(totalToTransfer)}</p>
              <dl className="mt-3 grid gap-1">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Transferir a:</dt>
                  <dd className="font-medium">{foundation.legalName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">NIT:</dt>
                  <dd>{foundation.nit}</dd>
                </div>
                {foundation.bankName && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Banco:</dt>
                    <dd>{foundation.bankName}</dd>
                  </div>
                )}
                {foundation.bankAccount && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Cuenta:</dt>
                    <dd>{foundation.bankAccount}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                La transferencia se realiza fuera de la plataforma. Regístrala aquí después de
                hacerla. Al registrarla, el período queda cerrado para cambios.
              </p>
            </div>
            <TransferForm suggestedAmount={totalToTransfer} />
          </>
        )}
      </section>

      {recentPeriods.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Períodos recientes</h2>
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {recentPeriods.map((p) => {
              const totalDeducted = p.contributions.reduce(
                (sum, c) => sum + (c.amountDeducted ?? 0),
                0,
              );
              const deductedCount = p.contributions.filter(
                (c) => c.amountDeducted !== null,
              ).length;
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span className="font-medium">{formatPeriod(p.month, p.year)}</span>
                  <span className="text-muted-foreground">
                    {deductedCount} descuentos · {formatCop(totalDeducted)}
                  </span>
                  <span>{periodStateLabel({ ...p, deductedCount })}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
