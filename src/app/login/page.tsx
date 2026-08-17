import { redirect } from "next/navigation";
import { getCurrentUser, roleHome } from "@/lib/auth/guards";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(roleHome(user.role));

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Ingresa a tu cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Te enviaremos un enlace de acceso a tu correo corporativo. Sin contraseñas.
          </p>
        </div>
        {error === "invalid" && (
          <p className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
            El enlace no es válido o ya expiró. Solicita uno nuevo.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
