import Link from "next/link";
import { ContributionStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/company-admin";
import { currentPeriodParts } from "@/lib/payroll";
import { formatCop, formatPeriod } from "@/lib/format";
import { ResultsForm } from "./results-form";
import { TransferForm } from "./transfer-form";

export default async function PayrollPage() {
  const { company } = await requireCompanyAdmin();
  const { month, year } = currentPeriodParts();

  const [period, foundation] = await Promise.all([
    db.payrollPeriod.findUnique({
      where: { companyId_year_month: { companyId: company.id, year, month } },
      include: { contributions: true },
    }),
    db.foundation.findFirstOrThrow(),
  ]);

  const pending =
    period?.contributions.filter((c) => c.status === ContributionStatus.AUTHORIZED) ?? [];
  const deducted = period?.contributions.filter((c) => c.amountDeducted !== null) ?? [];
  const totalDeducted = deducted.reduce((sum, c) => sum + (c.amountDeducted ?? 0), 0);
  const stillDeductedOnly =
    period?.contributions.some((c) => c.status === ContributionStatus.DEDUCTED) ?? false;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
          ← Volver al dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nómina — {formatPeriod(month, year)}
        </h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1 · Descargar autorizaciones para nómina</h2>
        <p className="text-sm text-muted-foreground">
          El archivo contiene las autorizaciones actualmente activas. Descargarlo crea o
          actualiza el snapshot del período.
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
          {pending.length > 0 ? ` Aportes pendientes de resultado: ${pending.length}.` : ""}
          {deducted.length > 0
            ? ` Descuentos registrados: ${deducted.length} por ${formatCop(totalDeducted)}.`
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
              <p className="text-2xl font-semibold">{formatCop(totalDeducted)}</p>
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
                hacerla.
              </p>
            </div>
            {period?.transferDate ? (
              <p className="rounded-lg border bg-card p-3 text-sm">
                Transferencia registrada el{" "}
                {period.transferDate.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}{" "}
                por {formatCop(period.transferAmount ?? 0)} · Ref: {period.transferBankReference}
                {period.foundationReceivedAt
                  ? " · Recepción confirmada por la fundación."
                  : " · Pendiente de confirmación de la fundación."}
              </p>
            ) : stillDeductedOnly ? (
              <TransferForm suggestedAmount={totalDeducted} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay descuentos pendientes de transferir.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
