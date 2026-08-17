"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadPayrollResultsAction, type ResultsState } from "../actions";

const initialState: ResultsState = {};

export function ResultsForm() {
  const [state, formAction, pending] = useActionState(uploadPayrollResultsAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="results-file">Archivo CSV de resultados</Label>
        <Input id="results-file" name="file" type="file" accept=".csv,text/csv" required />
        <p className="text-xs text-muted-foreground">
          Columnas requeridas: employee_id,amount_deducted · Los empleados ausentes del archivo
          no aportan este mes.
        </p>
      </div>
      {state.errors && (
        <ul className="space-y-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {state.applied !== undefined && (
        <p className="rounded-lg border bg-card p-3 text-sm">
          Se registraron <strong>{state.applied}</strong> descuentos.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Registrando…" : "Registrar resultados"}
      </Button>
    </form>
  );
}
