import { AuthorizationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/guards";
import { formatCop } from "@/lib/format";

export default async function EmployeeHomePage() {
  const user = await requireEmployee();
  const activeAuthorization = await db.donationAuthorization.findFirst({
    where: { employeeId: user.employee.id, status: AuthorizationStatus.ACTIVE },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Hola, {user.employee.name}</h1>
      {activeAuthorization ? (
        <p className="text-muted-foreground">
          Tu aporte activo: <strong>{formatCop(activeAuthorization.amount)} / mes</strong>
        </p>
      ) : (
        <p className="text-muted-foreground">Aún no tienes un aporte activo.</p>
      )}
      <p className="text-sm text-muted-foreground">
        El journey completo de aportes estará disponible en la siguiente fase.
      </p>
    </div>
  );
}
