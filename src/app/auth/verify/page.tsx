import { redirect } from "next/navigation";
import { peekLoginToken } from "@/lib/auth/tokens";
import { VerifyForm } from "./verify-form";

// This page only *checks* the token (read-only): corporate mail
// scanners that prefetch links can't consume it. The actual login is
// the explicit POST in VerifyForm.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token || !(await peekLoginToken(token))) {
    redirect("/login?error=invalid");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Confirma tu ingreso</h1>
        <p className="text-sm text-muted-foreground">
          Haz clic en continuar para ingresar a tu cuenta de Colombia Sigue.
        </p>
        <VerifyForm token={token} />
      </div>
    </main>
  );
}
