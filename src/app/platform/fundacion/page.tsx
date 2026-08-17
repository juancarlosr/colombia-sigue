import Link from "next/link";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { FoundationForm } from "./foundation-form";

export default async function FoundationConfigPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const foundation = await db.foundation.findFirstOrThrow();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/platform" className="text-sm text-muted-foreground hover:underline">
          ← Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Configurar fundación</h1>
        <p className="text-sm text-muted-foreground">
          La información bancaria solo es visible para administradores, nunca para empleados.
        </p>
      </div>
      <FoundationForm foundation={foundation} />
    </div>
  );
}
