"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { confirmCompanyEmailAction, type VerifyCompanyState } from "./actions";

const initialState: VerifyCompanyState = {};

export function VerifyCompanyForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(confirmCompanyEmailAction, initialState);

  if (state.done) {
    return (
      <div className="space-y-2 rounded-2xl border bg-card p-6 text-center">
        <h2 className="text-xl font-bold">Correo verificado ✓</h2>
        <p className="text-muted-foreground">
          Tu solicitud quedó completa. La revisaremos y te contactaremos — normalmente en un
          día hábil.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Verificando…" : "Verificar solicitud"}
      </Button>
    </form>
  );
}
