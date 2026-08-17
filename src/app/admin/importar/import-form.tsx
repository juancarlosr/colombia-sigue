"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importEmployeesAction, type ImportState } from "../actions";

const initialState: ImportState = {};

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importEmployeesAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Archivo CSV</Label>
        <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
        <p className="text-xs text-muted-foreground">
          Columnas requeridas: employee_id,name,document_number,email
        </p>
      </div>
      {state.errors && (
        <ul className="space-y-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {state.created !== undefined && (
        <p className="rounded-lg border bg-card p-3 text-sm">
          Se importaron <strong>{state.created}</strong> empleados. Ahora puedes enviarles
          invitaciones desde el dashboard.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Importando…" : "Importar empleados"}
      </Button>
    </form>
  );
}
