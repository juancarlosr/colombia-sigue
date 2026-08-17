import Link from "next/link";
import { ContributionStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/guards";
import { getActiveAuthorization } from "@/lib/donations";
import { formatCop, formatPeriod } from "@/lib/format";

const CONTRIBUTION_LABELS: Record<ContributionStatus, string> = {
  AUTHORIZED: "Pendiente",
  DEDUCTED: "Descontado",
  TRANSFERRED: "Transferido",
  RECEIVED: "Recibido",
};

export default async function EmployeeHomePage() {
  const user = await requireEmployee();
  const employee = user.employee;

  const [company, foundation, activeAuthorization, contributions] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: employee.companyId } }),
    db.foundation.findFirst(),
    getActiveAuthorization(employee.id),
    db.payrollContribution.findMany({
      where: { employeeId: employee.id },
      include: { payrollPeriod: true },
      orderBy: [{ payrollPeriod: { year: "desc" } }, { payrollPeriod: { month: "desc" } }],
    }),
  ]);

  const totalContributed = contributions.reduce((sum, c) => sum + (c.amountDeducted ?? 0), 0);

  return (
    <div className="mx-auto max-w-md space-y-8">
      {activeAuthorization ? (
        <section className="space-y-4 rounded-xl border bg-card p-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">❤️ Tu aporte está activo</h1>
          <div>
            <p className="text-muted-foreground">{foundation?.displayName}</p>
            <p className="text-3xl font-semibold">
              {formatCop(activeAuthorization.amount)}{" "}
              <span className="text-base font-normal text-muted-foreground">/ mes</span>
            </p>
          </div>
          <p className="text-sm">
            Estado: <span className="font-medium text-green-700 dark:text-green-400">Activo</span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button render={<Link href="/app/monto" />} variant="outline">
              Cambiar monto
            </Button>
            <Button render={<Link href="/app/cancelar" />} variant="ghost">
              Cancelar aporte
            </Button>
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-xl border bg-card p-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Ayuda todos los meses directamente desde tu nómina
          </h1>
          <p className="text-muted-foreground">
            {company.name} se unió a {foundation?.displayName} para facilitar aportes mensuales
            {foundation?.description ? ` a: ${foundation.description}` : "."}
          </p>
          <p className="text-sm text-muted-foreground">
            No necesitas tarjeta y puedes detener tu aporte cuando quieras.
          </p>
          <Button render={<Link href="/app/monto" />} size="lg" className="w-full sm:w-auto">
            Quiero participar
          </Button>
        </section>
      )}

      {contributions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Mis aportes</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {contributions.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 p-4 text-sm">
                <span>{formatPeriod(c.payrollPeriod.month, c.payrollPeriod.year)}</span>
                <span className="font-medium">{formatCop(c.amountDeducted ?? c.amountAuthorized)}</span>
                <span className="text-muted-foreground">{CONTRIBUTION_LABELS[c.status]}</span>
              </li>
            ))}
          </ul>
          <p className="text-right text-sm">
            Total aportado: <strong>{formatCop(totalContributed)}</strong>
          </p>
        </section>
      )}
    </div>
  );
}
