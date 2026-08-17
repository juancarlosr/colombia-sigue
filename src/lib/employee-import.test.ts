import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { importEmployees, parseEmployeeCsv } from "./employee-import";

const HEADER = "employee_id,name,document_number,email";

let companyId: string;

beforeAll(async () => {
  const company = await db.company.create({
    data: { name: "Import Test SAS", nit: `import-co-${Date.now()}` },
  });
  companyId = company.id;
});

afterAll(async () => {
  await db.employee.deleteMany({ where: { companyId } });
  await db.company.delete({ where: { id: companyId } });
  await db.$disconnect();
});

describe("parseEmployeeCsv", () => {
  it("parses valid rows and lowercases emails", () => {
    const { rows, errors } = parseEmployeeCsv(
      `${HEADER}\nE1,Ana Gómez,123,ANA@x.com\nE2,"Ruiz, Carlos",456,carlos@x.com`,
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { externalId: "E1", name: "Ana Gómez", documentNumber: "123", email: "ana@x.com" },
      { externalId: "E2", name: "Ruiz, Carlos", documentNumber: "456", email: "carlos@x.com" },
    ]);
  });

  it("rejects wrong headers, missing fields, bad emails, and in-file duplicates", () => {
    expect(parseEmployeeCsv("id,nombre\nx,y").errors).toHaveLength(1);
    expect(parseEmployeeCsv(`${HEADER}\nE1,,123,a@x.com`).errors).toHaveLength(1);
    expect(parseEmployeeCsv(`${HEADER}\nE1,Ana,123,no-es-email`).errors).toHaveLength(1);
    expect(
      parseEmployeeCsv(`${HEADER}\nE1,Ana,123,a@x.com\nE1,Bea,456,b@x.com`).errors,
    ).toHaveLength(1);
    expect(
      parseEmployeeCsv(`${HEADER}\nE1,Ana,123,a@x.com\nE2,Bea,456,a@x.com`).errors,
    ).toHaveLength(1);
  });
});

describe("importEmployees", () => {
  it("creates employees and then rejects duplicates against the database", async () => {
    const rows = [
      { externalId: "I-1", name: "Uno", documentNumber: "1", email: "uno@import.example.com" },
      { externalId: "I-2", name: "Dos", documentNumber: "2", email: "dos@import.example.com" },
    ];
    const first = await importEmployees(companyId, rows);
    expect(first).toEqual({ created: 2, errors: [] });

    const second = await importEmployees(companyId, [rows[0]]);
    expect(second.created).toBe(0);
    expect(second.errors.length).toBeGreaterThan(0);

    expect(await db.employee.count({ where: { companyId } })).toBe(2);
  });
});
