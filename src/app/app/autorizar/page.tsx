import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/guards";
import { buildAuthorizationText } from "@/lib/authorization-text";
import { amountSchema, getActiveAuthorization } from "@/lib/donations";
import { formatCop } from "@/lib/format";
import { AuthorizeForm } from "./authorize-form";

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ monto?: string }>;
}) {
  const user = await requireEmployee();
  const { monto } = await searchParams;

  const parsed = amountSchema.safeParse(monto);
  if (!parsed.success) redirect("/app/monto");
  const amount = parsed.data;

  const [company, foundation, currentAuthorization] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: user.employee.companyId } }),
    db.foundation.findFirstOrThrow(),
    getActiveAuthorization(user.employee.id),
  ]);

  const authorizationText = buildAuthorizationText(company.name, foundation.displayName, amount);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Autorización voluntaria</h1>
      <blockquote className="rounded-xl border bg-card p-5 text-sm leading-relaxed">
        {authorizationText}
      </blockquote>
      {currentAuthorization && (
        <p className="text-sm text-muted-foreground">
          Tu autorización actual de {formatCop(currentAuthorization.amount)} / mes será
          reemplazada por esta nueva autorización. El nuevo monto aplica al próximo período de
          nómina que no haya sido procesado.
        </p>
      )}
      <AuthorizeForm amount={amount} />
    </div>
  );
}
