import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing";
import { PARTICIPATION_AGREEMENT } from "@/lib/participation-agreement";
import { RegistrationForm } from "./registration-form";

export const metadata: Metadata = {
  title: "Inscribe tu empresa — Colombia Sigue",
};

export default function CompanyRegistrationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
        <div className="py-8">
          <Link href="/empresas" className="text-sm text-muted-foreground hover:underline">
            ← Volver
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Inscribe tu empresa</h1>
          <p className="mt-2 text-muted-foreground">
            Diligencia los datos, acepta el acuerdo y te contactamos para activar tu empresa —
            normalmente en un día hábil. Sin costo.
          </p>
        </div>
        <RegistrationForm agreementText={PARTICIPATION_AGREEMENT} />
      </main>
      <MarketingFooter />
    </div>
  );
}
