import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingHeader } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Colombia Sigue para empresas",
  description:
    "Lleva el payroll giving a tu empresa: tu equipo aporta desde la nómina y tú giras directo a la fundación. Sin tocar la plata, sin carga operativa.",
};

const COMPANY_STEPS = [
  {
    title: "Inscribe tu empresa",
    description:
      "Te configuramos en el piloto y defines quién administra: una persona de RRHH o administrativa es suficiente.",
  },
  {
    title: "Importa e invita a tu equipo",
    description:
      "Subes un CSV con nombre, documento y correo, y enviamos las invitaciones. Cada quien decide si participa, cuánto aporta y puede cancelar cuando quiera.",
  },
  {
    title: "Opera la nómina en minutos",
    description:
      "Cada mes: descargas el archivo de autorizaciones activas, ejecutas el descuento en tu nómina y subes los resultados. La pantalla siempre te dice qué sigue.",
  },
  {
    title: "Gira directo a la fundación",
    description:
      "Transfieres el total desde tu cuenta a la de la fundación y lo registras. La fundación confirma la recepción y cada empleado ve que su aporte llegó.",
  },
];

const REASONS = [
  {
    title: "Sin intermediarios financieros",
    description:
      "El giro va de tu cuenta a la de la fundación. La plataforma nunca custodia dinero — solo registra y hace todo trazable.",
  },
  {
    title: "Voluntario de verdad",
    description:
      "Cada empleado autoriza, cambia o cancela su aporte en un clic, sin pasar por RRHH. Sin presión y sin tickets.",
  },
  {
    title: "Minutos al mes, no horas",
    description:
      "Tres pasos guiados con estado claro. Sin integraciones con tu software de nómina ni procesos nuevos.",
  },
];

const REQUIREMENTS = [
  "Una lista de tu equipo en CSV: nombre, documento y correo corporativo.",
  "Una persona responsable de operar la nómina mensual (10 minutos al mes).",
  "El visto bueno de tu área legal al texto de autorización voluntaria.",
];

export default function CompaniesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-20">
        <section className="relative overflow-hidden rounded-[2.5rem] rounded-br-[6rem] bg-gradient-to-br from-sky-200 to-sky-100 px-8 py-16 sm:px-14 sm:py-20 dark:from-sky-900 dark:to-sky-950">
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/30 blur-2xl"
          />
          <div className="relative max-w-2xl space-y-6">
            <p className="inline-block rounded-full bg-white/70 px-4 py-1 text-xs font-bold tracking-wide uppercase dark:bg-white/10">
              Para empresas
            </p>
            <h1 className="text-4xl leading-tight font-medium tracking-tight text-balance sm:text-5xl">
              Tu equipo quiere ayudar.{" "}
              <strong className="font-extrabold">Dale el canal.</strong>
            </h1>
            <p className="max-w-xl text-lg">
              Tus empleados aportan desde su nómina a una fundación. Tú solo ejecutas el
              descuento y giras directo — la plataforma nunca toca la plata.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button render={<a href="mailto:juan@celerik.com?subject=Quiero%20llevar%20Colombia%20Sigue%20a%20mi%20empresa" />} size="lg">
                Escríbenos
              </Button>
              <span className="text-sm font-medium">Piloto abierto · Sin costo</span>
            </div>
          </div>
        </section>

        <section className="mt-16 space-y-6">
          <h2 className="text-center text-sm font-bold tracking-widest text-muted-foreground uppercase">
            Cómo funciona para tu empresa
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {COMPANY_STEPS.map((step, index) => (
              <div
                key={step.title}
                className="space-y-3 rounded-3xl bg-accent p-7 text-accent-foreground"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 space-y-6">
          <h2 className="text-center text-sm font-bold tracking-widest text-muted-foreground uppercase">
            Por qué así
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {REASONS.map((item) => (
              <div key={item.title} className="space-y-3 rounded-3xl border bg-card p-7">
                <span className="block size-3 rounded-full bg-primary" aria-hidden="true" />
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-2xl space-y-6">
          <h2 className="text-center text-2xl font-bold tracking-tight">
            Qué necesitas para arrancar
          </h2>
          <ul className="space-y-3">
            {REQUIREMENTS.map((req) => (
              <li key={req} className="flex items-start gap-3 rounded-2xl border bg-card p-4">
                <span
                  className="mt-1.5 block size-2.5 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <span className="text-sm leading-relaxed">{req}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 text-center">
            <Button render={<a href="mailto:juan@celerik.com?subject=Quiero%20llevar%20Colombia%20Sigue%20a%20mi%20empresa" />} size="lg">
              Hablemos de tu empresa
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              ¿Eres empleado y buscas tu aporte?{" "}
              <Link href="/login" className="underline underline-offset-2">
                Ingresa aquí
              </Link>
            </p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
