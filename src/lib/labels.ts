import type { EmployeeStatus } from "@prisma/client";

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  IMPORTED: "Importado",
  INVITED: "Invitado",
  ACTIVATED: "Activo",
};
