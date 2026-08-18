import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandWordmark } from "@/components/brand";

export function MarketingHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-6">
      <Link href="/" aria-label="Inicio">
        <BrandWordmark />
      </Link>
      <nav className="flex items-center gap-4">
        <Link
          href="/empresas"
          className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Para empresas
        </Link>
        <Button render={<Link href="/login" />} variant="outline" size="sm">
          Ingresar
        </Button>
      </nav>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <BrandWordmark />
            <p className="text-sm text-muted-foreground">
              Ayuda todos los meses directamente desde tu nómina.
            </p>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/empresas"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Para empresas
            </Link>
            <Button render={<Link href="/login" />} variant="outline" size="sm">
              Ingresar
            </Button>
          </nav>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Hoy los aportes apoyan la reconstrucción de viviendas y escuelas en las comunidades
          afectadas por el terremoto en Colombia.
        </p>
        <p className="max-w-3xl text-xs text-muted-foreground">
          Colombia Sigue no recibe ni procesa dinero: tu empresa realiza el descuento por nómina
          y transfiere directamente a la fundación. Aquí solo registras tu autorización
          voluntaria — que puedes modificar o revocar cuando quieras — y sigues el estado de tus
          aportes.
        </p>
      </div>
    </footer>
  );
}
