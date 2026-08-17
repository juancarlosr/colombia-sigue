"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerTransferAction, type TransferState } from "../actions";

const initialState: TransferState = {};

export function TransferForm({ suggestedAmount }: { suggestedAmount: number }) {
  const [state, formAction, pending] = useActionState(registerTransferAction, initialState);

  if (state.ok) {
    return (
      <p className="rounded-lg border bg-card p-3 text-sm">
        Transferencia registrada. La fundación confirmará la recepción de los fondos.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="amount">Monto transferido (COP)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={suggestedAmount || undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" name="date" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankReference">Referencia bancaria</Label>
          <Input id="bankReference" name="bankReference" type="text" required />
        </div>
      </div>
      {state.errors && (
        <ul className="space-y-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Registrando…" : "Registrar transferencia"}
      </Button>
    </form>
  );
}
