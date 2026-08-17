import Link from "next/link";
import { ContributionStatus, PayrollPeriodStatus, type PayrollPeriod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/company-admin";
import { resolveOperatingPeriod } from "@/lib/payroll";
import { formatCop, formatPeriod } from "@/lib/format";
import { ResultsForm } from "./results-form";
import { TransferForm } from "./transfer-form";

function periodStateLabel(period: PayrollPeriod): string {
  if (period.foundationReceivedAt) return "Recibido por la fundación";
  if (period.transferDate) return "Transferido — esperando confirmación";
  if (period.status === PayrollPeriodStatus.CLOSED) return "Cerrado sin descuentos";
  return "En proceso";
}

function StepBadge({ done }: { done: boolean }) {
  return (
    <span
      className={
        done
          ? "rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground"
          : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground"
      }
    >
      {done ? "Completado" : "Pendiente"}
    </span>
  );
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

  const hasSnapshot = period !== null && period.contributions.length > 0;
  const hasResults = deducted.length > 0;

  // "Qué hago ahora" en una línea, sin leer toda la página.
  const statusLine = !hasSnapshot
    ? "Sin iniciar"
    : !hasResults
      ? `Snapshot listo · ${period!.contributions.length} aportes`
      : `Resultados registrados · ${deducted.length} descuentos`;
  const nextAction = !hasSnapshot
    ? "Siguiente paso: descarga el CSV de nómina para crear el snapshot del período."
    : !hasResults
      ? "Siguiente paso: ejecuta la nómina y sube el archivo con los descuentos aplicados."
      : `Siguiente paso: transferir ${formatCop(totalToTransfer)} a la fundación y registrarlo aquí.`;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
          ← Volver al dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nómina del mes</h1>
      </div>

      <div className="rounded-lg border border-l-4 border-l-primary bg-card p-4">
        <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          {formatPeriod(resolution.month, resolution.year)}
        </p>
        <p className="mt-1 text-xl font-bold">{statusLine}</p>
        <p className="text-muted-foreground">{nextAction}</p>
        {resolution.staleToClose && (
          <p className="mt-2 text-sm text-muted-foreground">
            El período{" "}
            {formatPeriod(resolution.staleToClose.month, resolution.staleToClose.year)} no tuvo
            descuentos y se cerrará automáticamente al descargar el nuevo CSV.
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          1 · Descargar autorizaciones para nómina <StepBadge done={hasSnapshot} />
        </h2>
        <p className="text-sm text-muted-foreground">
          El archivo contiene las autorizaciones actualmente activas. Descárgalo de nuevo el día
          de nómina para reflejar cancelaciones y cambios de monto de última hora.
        </p>
        <Button render={<a href="/admin/nomina/csv" />} variant="outline">
          Descargar CSV de nómina
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          2 · Registrar resultados de nómina <StepBadge done={hasResults} />
        </h2>
        <p className="text-sm text-muted-foreground">
          Sube el archivo con los descuentos realmente aplicados. Puedes corregirlo subiéndolo de
          nuevo mientras no registres la transferencia.
          {pending.length > 0 ? ` Pendientes de resultado: ${pending.length}.` : ""}
        </p>
        <ResultsForm />
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          3 · Transferir a la fundación <StepBadge done={false} />
        </h2>
        {!hasResults ? (
          <p className="text-sm text-muted-foreground">
            Registra primero los resultados de nómina para conocer el total a transferir.
          </p>
        ) : (
          <>
            <div className="rounded-lg border bg-card p-4 text-sm">
              <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Total descontado
              </p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">
                {formatCop(totalToTransfer)}
              </p>
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
                hacerla; al registrarla, el período queda cerrado para cambios.
              </p>
            </div>
            <TransferForm suggestedAmount={totalToTransfer} />
          </>
        )}
      </section>

      {recentPeriods.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Períodos recientes</h2>
          <ul className="divide-y rounded-lg border bg-card text-sm">
            {recentPeriods.map((p) => {
              const totalDeducted = p.contributions.reduce(
                (sum, c) => sum + (c.amountDeducted ?? 0),
                0,
              );
              const deductedCount = p.contributions.filter(
                (c) => c.amountDeducted !== null,
              ).length;
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="font-medium">{formatPeriod(p.month, p.year)}</span>
                  <span className="text-muted-foreground">
                    {deductedCount} descuentos · {formatCop(totalDeducted)}
                  </span>
                  <span>{periodStateLabel(p)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
