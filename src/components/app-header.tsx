import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function AppHeader({ area, userLabel }: { area: string; userLabel: string }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <div className="flex items-baseline gap-3">
          <span className="font-semibold">Colombia Sigue</span>
          <span className="text-sm text-muted-foreground">{area}</span>
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
