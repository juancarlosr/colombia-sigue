import { z } from "zod";
import { db } from "@/lib/db";
import { parseCsv } from "@/lib/csv";

const EXPECTED_HEADER = ["employee_id", "name", "document_number", "email"];
const MAX_ROWS = 5_000;

const emailSchema = z.email();

export type EmployeeImportRow = {
  externalId: string;
  name: string;
  documentNumber: string;
  email: string;
};

export function parseEmployeeCsv(
  text: string,
): { rows: EmployeeImportRow[]; errors: string[] } {
  const errors: string[] = [];
  const parsed = parseCsv(text);

  if (parsed.length === 0) return { rows: [], errors: ["El archivo está vacío."] };
  const header = parsed[0].map((h) => h.trim().toLowerCase());
  if (header.join(",") !== EXPECTED_HEADER.join(",")) {
    return {
      rows: [],
      errors: [`El encabezado debe ser exactamente: ${EXPECTED_HEADER.join(",")}`],
    };
  }
  const dataRows = parsed.slice(1);
  if (dataRows.length === 0) return { rows: [], errors: ["El archivo no contiene empleados."] };
  if (dataRows.length > MAX_ROWS) {
    return { rows: [], errors: [`Máximo ${MAX_ROWS} empleados por archivo.`] };
  }

  const rows: EmployeeImportRow[] = [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();

  dataRows.forEach((fields, index) => {
    const line = index + 2;
    if (fields.length !== EXPECTED_HEADER.length) {
      errors.push(`Línea ${line}: se esperaban ${EXPECTED_HEADER.length} columnas.`);
      return;
    }
    const [externalId, name, documentNumber, rawEmail] = fields.map((f) => f.trim());
    const email = rawEmail.toLowerCase();
    if (!externalId || !name || !documentNumber || !email) {
      errors.push(`Línea ${line}: todos los campos son obligatorios.`);
      return;
    }
    if (!emailSchema.safeParse(email).success) {
      errors.push(`Línea ${line}: email inválido (${email}).`);
      return;
    }
    if (seenIds.has(externalId)) {
      errors.push(`Línea ${line}: employee_id duplicado en el archivo (${externalId}).`);
      return;
    }
    if (seenEmails.has(email)) {
      errors.push(`Línea ${line}: email duplicado en el archivo (${email}).`);
      return;
    }
    seenIds.add(externalId);
    seenEmails.add(email);
    rows.push({ externalId, name, documentNumber, email });
  });

  return { rows, errors };
}

// All-or-nothing: duplicates against existing employees reject the file.
export async function importEmployees(
  companyId: string,
  rows: EmployeeImportRow[],
): Promise<{ created: number; errors: string[] }> {
  const existing = await db.employee.findMany({
    where: {
      companyId,
      OR: [
        { externalId: { in: rows.map((r) => r.externalId) } },
        { email: { in: rows.map((r) => r.email) } },
      ],
    },
    select: { externalId: true, email: true },
  });

  const errors: string[] = [];
  const existingIds = new Set(existing.map((e) => e.externalId));
  const existingEmails = new Set(existing.map((e) => e.email));
  for (const row of rows) {
    if (existingIds.has(row.externalId)) {
      errors.push(`employee_id ya existe: ${row.externalId}`);
    }
    if (existingEmails.has(row.email)) {
      errors.push(`email ya existe: ${row.email}`);
    }
  }
  if (errors.length > 0) return { created: 0, errors };

  const result = await db.employee.createMany({
    data: rows.map((row) => ({
      companyId,
      externalId: row.externalId,
      name: row.name,
      documentNumber: row.documentNumber,
      email: row.email,
    })),
  });
  return { created: result.count, errors: [] };
}
