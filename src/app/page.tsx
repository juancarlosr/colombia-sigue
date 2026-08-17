import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandWordmark } from "@/components/brand";

const STEPS = [
  {
    title: "Elige cuánto aportar",
    description: "Desde $10.000 al mes. Tú decides el monto y puedes cambiarlo cuando quieras.",
  },
  {
    title: "Autoriza el descuento",
    description:
      "Una autorización voluntaria y transparente. Tu empresa hace el descuento por nómina.",
  },
  {
    title: "Sigue tu aporte",
    description:
      "Ve cada mes cuándo tu aporte llega a la fundación. Cancela en un clic, sin trámites.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <BrandWordmark />
        <Button render={<Link href="/login" />} variant="outline" size="sm">
          Ingresar
        </Button>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
        <section className="relative overflow-hidden rounded-[2.5rem] rounded-bl-[6rem] bg-gradient-to-br from-primary to-lime-300 px-8 py-16 sm:px-14 sm:py-20 dark:to-lime-600">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 size-72 rounded-full bg-sky-300/40 blur-2xl"
          />
          <div className="relative max-w-2xl space-y-6 text-primary-foreground">
            <p className="inline-block rounded-full bg-white/60 px-4 py-1 text-xs font-bold tracking-wide uppercase dark:bg-white/20">
              Payroll giving en Colombia
            </p>
            <h1 className="text-4xl leading-tight font-medium tracking-tight text-balance sm:text-6xl">
              Ayuda todos los meses <strong className="font-extrabold">directamente desde tu nómina</strong>.
            </h1>
            <p className="max-w-xl text-lg sm:text-xl">
              Elige cuánto aportar, autoriza el descuento y detén tu aporte cuando quieras.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                render={<Link href="/login" />}
                size="lg"
                className="bg-white text-foreground hover:bg-white/85 dark:bg-white dark:text-lime-950"
              >
                Quiero participar
              </Button>
              <span className="text-sm font-medium">
                Sin tarjetas · Cancela cuando quieras
              </span>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="space-y-3 rounded-3xl bg-accent p-7 text-accent-foreground"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                {index + 1}
              </span>
              <h2 className="text-lg font-bold">{step.title}</h2>
              <p className="text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 space-y-3 text-center">
          <p className="text-muted-foreground">
            ¿Tu empresa todavía no participa? Pronto habrá más información.
          </p>
          <p className="mx-auto max-w-2xl text-xs text-muted-foreground">
            Colombia Sigue no recibe ni procesa dinero: tu empresa realiza el descuento por
            nómina y transfiere directamente a la fundación. Aquí solo registras tu autorización
            voluntaria y sigues el estado de tus aportes.
          </p>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6 text-sm text-muted-foreground">
          <BrandWordmark />
          <span>Piloto 2026</span>
        </div>
      </footer>
    </div>
  );
}
