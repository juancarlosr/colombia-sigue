"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCop } from "@/lib/format";
import { registerTransferAction, type TransferState } from "../actions";

const initialState: TransferState = {};

// The amount is fixed to the deducted total by default — a free-text
// money field invites typos. Entering a different amount is an
// explicit, warned, exceptional path.
export function TransferForm({ suggestedAmount }: { suggestedAmount: number }) {
  const [state, formAction, pending] = useActionState(registerTransferAction, initialState);
  const [customAmount, setCustomAmount] = useState(false);

  if (state.ok) {
    return (
      <p className="rounded-lg border bg-card p-3 text-sm">
        Transferencia registrada. La fundación confirmará la recepción de los fondos.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Fecha de la transferencia</Label>
          <Input id="date" name="date" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankReference">Referencia bancaria</Label>
          <Input id="bankReference" name="bankReference" type="text" required />
        </div>
      </div>

      {customAmount ? (
        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
          <Label htmlFor="amount" className="text-amber-900 dark:text-amber-200">
            Monto transferido (COP)
          </Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={suggestedAmount}
            required
          />
          <p className="text-xs text-amber-900 dark:text-amber-200">
            Estás registrando un monto distinto al total descontado (
            {formatCop(suggestedAmount)}). Verifica con tu área contable antes de continuar.
          </p>
        </div>
      ) : (
        <input type="hidden" name="amount" value={suggestedAmount} />
      )}

      {state.errors && (
        <ul className="space-y-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Registrando…"
            : customAmount
              ? "Registrar transferencia"
              : `Registrar transferencia por ${formatCop(suggestedAmount)}`}
        </Button>
        {!customAmount && (
          <button
            type="button"
            onClick={() => setCustomAmount(true)}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            ¿Transferiste un monto diferente?
          </button>
        )}
      </div>
    </form>
  );
}
