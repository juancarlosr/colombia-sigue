"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { markReceivedAction, type MarkReceivedState } from "./actions";

const initialState: MarkReceivedState = {};

export function MarkReceivedButton({ periodId }: { periodId: string }) {
  const [state, formAction, pending] = useActionState(markReceivedAction, initialState);

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="periodId" value={periodId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Confirmando…" : "Fondos recibidos"}
      </Button>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
