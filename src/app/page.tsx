import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Colombia Sigue
      </span>
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Ayuda todos los meses directamente desde tu nómina.
      </h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Elige cuánto aportar, autoriza el descuento y detén tu aporte cuando quieras.
      </p>
      <Button render={<Link href="/login" />} size="lg">
        Quiero participar
      </Button>
      <p className="text-sm text-muted-foreground">
        ¿Tu empresa todavía no participa? Pronto habrá más información.
      </p>
    </main>
  );
}
