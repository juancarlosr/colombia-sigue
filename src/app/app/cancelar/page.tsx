import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireEmployee } from "@/lib/auth/guards";
import { getActiveAuthorization } from "@/lib/donations";
import { cancelContribution } from "../actions";

export default async function CancelPage() {
  const user = await requireEmployee();
  const active = await getActiveAuthorization(user.employee.id);
  if (!active) redirect("/app");

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        ¿Quieres cancelar tu aporte mensual?
      </h1>
      <p className="text-muted-foreground">
        No se realizarán nuevos descuentos en períodos de nómina que todavía no hayan sido
        procesados.
      </p>
      <div className="flex flex-col gap-2">
        <Button render={<Link href="/app" />} size="lg">
          Mantener aporte
        </Button>
        <form action={cancelContribution}>
          <Button type="submit" variant="destructive" size="lg" className="w-full">
            Cancelar aporte
          </Button>
        </form>
      </div>
      <p className="text-sm text-muted-foreground">
        Tu historial de aportes anteriores seguirá disponible.
      </p>
    </div>
  );
}
