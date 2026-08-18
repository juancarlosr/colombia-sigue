import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingHeader } from "@/components/marketing";

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

const TRUST = [
  {
    title: "Sin tarjetas ni datos bancarios",
    description:
      "Nunca te pedimos información financiera. La plataforma no recibe ni procesa dinero.",
  },
  {
    title: "Tú decides, siempre",
    description:
      "Cambia el monto o cancela tu aporte en un clic. Sin correos, sin llamadas, sin aprobaciones.",
  },
  {
    title: "Trazable de punta a punta",
    description:
      "Cada aporte se registra: descontado por tu empresa, transferido y confirmado por la fundación.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-20">
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
              Ayuda todos los meses{" "}
              <strong className="font-extrabold">directamente desde tu nómina</strong>.
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
              <span className="text-sm font-medium">Sin tarjetas · Cancela cuando quieras</span>
            </div>
          </div>
        </section>

        {/* Split: cada quien a su camino */}
        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <Link
            href="/login"
            className="group space-y-3 rounded-3xl bg-accent p-8 text-accent-foreground transition-shadow hover:shadow-lg"
          >
            <p className="text-xs font-bold tracking-widest text-sky-700 uppercase dark:text-sky-300">
              Soy empleado
            </p>
            <h2 className="text-2xl font-bold tracking-tight">
              Recibí una invitación o ya tengo mi aporte
            </h2>
            <p className="text-sm leading-relaxed">
              Entra con tu correo corporativo — sin contraseñas. Ve tu aporte, cámbialo o
              cancélalo cuando quieras.
            </p>
            <span className="inline-block font-semibold underline-offset-4 group-hover:underline">
              Ingresar →
            </span>
          </Link>
          <Link
            href="/empresas"
            className="group space-y-3 rounded-3xl border-2 border-primary/40 bg-card p-8 transition-shadow hover:shadow-lg"
          >
            <p className="text-xs font-bold tracking-widest text-lime-700 uppercase dark:text-lime-400">
              Soy empresa
            </p>
            <h2 className="text-2xl font-bold tracking-tight">
              Quiero que mi equipo pueda aportar
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Registra tu empresa, invita a tu equipo y opera todo en minutos al mes. Sin tocar
              la plata, sin integraciones.
            </p>
            <span className="inline-block font-semibold underline-offset-4 group-hover:underline">
              Cómo funciona para empresas →
            </span>
          </Link>
        </section>

        {/* Por qué existimos */}
        <section className="mx-auto max-w-3xl py-20 text-center sm:py-24">
          <h2 className="text-3xl leading-snug font-bold tracking-tight text-balance sm:text-4xl">
            Ayudar debería ser{" "}
            <span className="text-sky-600 dark:text-sky-400">así de fácil</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Eliges cuánto aportar, lo autorizas una vez y tu empresa lo descuenta de tu nómina y
            lo gira directamente a la fundación. Sin tarjetas, sin cobros recurrentes y sin que
            nosotros toquemos la plata.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-center text-sm font-bold tracking-widest text-muted-foreground uppercase">
            Cómo funciona para ti
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
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
            Pensado para que confíes
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {TRUST.map((item) => (
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

        <section className="mt-20 rounded-3xl bg-accent p-10 text-center text-accent-foreground">
          <h2 className="text-2xl font-bold tracking-tight">
            ¿Tu empresa todavía no participa?
          </h2>
          <p className="mx-auto mt-3 max-w-xl">
            El piloto está abierto a empresas que quieran facilitar la generosidad de su equipo.
          </p>
          <Button render={<Link href="/empresas" />} className="mt-5">
            Conoce cómo funciona para empresas
          </Button>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
