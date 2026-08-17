import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";

export default async function PlatformHomePage() {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const foundation = await db.foundation.findFirst();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Administración de plataforma</h1>
      <p className="text-muted-foreground">
        Fundación configurada: <strong>{foundation?.displayName ?? "ninguna"}</strong>
      </p>
      <p className="text-sm text-muted-foreground">
        La confirmación de recepción de fondos estará disponible en la siguiente fase.
      </p>
    </div>
  );
}
