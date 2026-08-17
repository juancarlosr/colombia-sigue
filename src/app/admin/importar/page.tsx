import Link from "next/link";
import { EmployeeStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/company-admin";
import { ImportForm } from "./import-form";

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  IMPORTED: "Importado",
  INVITED: "Invitado",
  ACTIVATED: "Activo",
};

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
              <tr className="border-b text-left text-muted-foreground">
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
                  <td className="p-3">{STATUS_LABELS[employee.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
