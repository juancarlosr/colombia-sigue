import { AuthorizationStatus, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { formatCop } from "@/lib/format";

export default async function AdminHomePage() {
  const user = await requireRole(UserRole.COMPANY_ADMIN);
  const company = await db.company.findFirst({ where: { adminUserId: user.id } });
  if (!company) {
    return <p className="text-muted-foreground">No tienes una empresa asignada.</p>;
  }

  const stats = await db.donationAuthorization.aggregate({
    where: { status: AuthorizationStatus.ACTIVE, employee: { companyId: company.id } },
    _count: true,
    _sum: { amount: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
      <p className="text-muted-foreground">
        Donantes activos: <strong>{stats._count}</strong> · Monto autorizado:{" "}
        <strong>{formatCop(stats._sum.amount ?? 0)} / mes</strong>
      </p>
      <p className="text-sm text-muted-foreground">
        El dashboard completo estará disponible en la siguiente fase.
      </p>
    </div>
  );
}
