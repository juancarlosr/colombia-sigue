import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/guards";
import { AppHeader } from "@/components/app-header";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(UserRole.PLATFORM_ADMIN);
  return (
    <div className="min-h-screen">
      <AppHeader area="Plataforma" userLabel={user.email} />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
