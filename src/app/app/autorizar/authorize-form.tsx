"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { confirmAuthorization, type AuthorizeState } from "../actions";

const initialState: AuthorizeState = {};

export function AuthorizeForm({ amount }: { amount: number }) {
  const [state, formAction, pending] = useActionState(confirmAuthorization, initialState);
  const [accepted, setAccepted] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="monto" value={amount} />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
        <input
          type="checkbox"
          name="acepto"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 size-4 accent-primary"
        />
        <span className="text-sm font-medium">He leído y autorizo este descuento voluntario.</span>
      </label>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={!accepted || pending}>
        {pending ? "Confirmando…" : "Confirmar aporte mensual"}
      </Button>
    </form>
  );
}
