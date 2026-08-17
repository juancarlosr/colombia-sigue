import Link from "next/link";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { formatCop, formatPeriod } from "@/lib/format";
import { MarkReceivedButton } from "./mark-received-button";

export default async function PlatformHomePage() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const [foundation, periods] = await Promise.all([
    db.foundation.findFirst(),
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
        <h2 className="text-lg font-semibold">Períodos de nómina</h2>
        {periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay períodos.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Período</th>
                  <th className="p-3 font-medium">Empresa</th>
                  <th className="p-3 text-right font-medium">Descontado</th>
                  <th className="p-3 font-medium">Transferencia</th>
                  <th className="p-3 font-medium">Recepción</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => {
                  const totalDeducted = period.contributions.reduce(
                    (sum, c) => sum + (c.amountDeducted ?? 0),
                    0,
                  );
                  return (
                    <tr key={period.id} className="border-b align-top last:border-0">
                      <td className="p-3">{formatPeriod(period.month, period.year)}</td>
                      <td className="p-3">{period.company.name}</td>
                      <td className="p-3 text-right">{formatCop(totalDeducted)}</td>
                      <td className="p-3">
                        {period.transferDate
                          ? `${formatCop(period.transferAmount ?? 0)} · ${period.transferDate.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })} · Ref: ${period.transferBankReference}`
                          : "Sin registrar"}
                      </td>
                      <td className="p-3">
                        {period.foundationReceivedAt ? (
                          <span className="font-medium text-green-700 dark:text-green-400">
                            Recibido
                          </span>
                        ) : period.transferDate ? (
                          <MarkReceivedButton periodId={period.id} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
