import { redirect } from "next/navigation";
import { peekLoginToken } from "@/lib/auth/tokens";
import { MarketingFooter, MarketingHeader } from "@/components/marketing";
import { VerifyCompanyForm } from "./verify-company-form";

// Igual que el verify de login: el GET solo valida (los escáneres de
// correo hacen prefetch); consumir el token requiere el clic.
export default async function VerifyCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token || !(await peekLoginToken(token))) {
    redirect("/empresas?error=verificacion");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center space-y-6 px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Verifica la solicitud de tu empresa
        </h1>
        <p className="text-sm text-muted-foreground">
          Haz clic para confirmar que este correo corporativo es tuyo.
        </p>
        <VerifyCompanyForm token={token} />
      </main>
      <MarketingFooter />
    </div>
  );
}
