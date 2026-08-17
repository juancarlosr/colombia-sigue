import { requireEmployee } from "@/lib/auth/guards";
import { AppHeader } from "@/components/app-header";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireEmployee();
  return (
    <div className="min-h-screen">
      <AppHeader area="Mi aporte" userLabel={user.employee.name} />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
