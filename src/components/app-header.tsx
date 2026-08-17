import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { BrandWordmark } from "@/components/brand";

export function AppHeader({ area, userLabel }: { area: string; userLabel: string }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <BrandWordmark />
          <span className="hidden rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground sm:inline">
            {area}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{userLabel}</span>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
