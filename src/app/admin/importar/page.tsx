import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/company-admin";
import { EMPLOYEE_STATUS_LABELS } from "@/lib/labels";
import { ImportForm } from "./import-form";

export default async function ImportPage() {
  const { company } = await requireCompanyAdmin();
  const employees = await db.employee.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
          ← Volver al dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Importar empleados</h1>
      </div>

      <ImportForm />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Empleados ({employees.length})</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">
                <th className="p-3 font-medium">ID</th>
                <th className="p-3 font-medium">Nombre</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b last:border-0">
                  <td className="p-3">{employee.externalId}</td>
                  <td className="p-3">{employee.name}</td>
                  <td className="p-3">{employee.email}</td>
                  <td className="p-3">{EMPLOYEE_STATUS_LABELS[employee.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
