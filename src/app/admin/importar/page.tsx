import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/company-admin";
import { EMPLOYEE_STATUS_LABELS } from "@/lib/labels";
import { SortableTable } from "@/components/sortable-table";
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
        <SortableTable
          columns={[
            { key: "externalId", label: "ID" },
            { key: "name", label: "Nombre" },
            { key: "email", label: "Email" },
            { key: "status", label: "Estado" },
          ]}
          rows={employees.map((employee) => ({
            id: employee.id,
            cells: {
              externalId: { node: employee.externalId, value: employee.externalId },
              name: { node: employee.name, value: employee.name },
              email: { node: employee.email, value: employee.email },
              status: {
                node: EMPLOYEE_STATUS_LABELS[employee.status],
                value: EMPLOYEE_STATUS_LABELS[employee.status],
              },
            },
          }))}
        />
      </section>
    </div>
  );
}
