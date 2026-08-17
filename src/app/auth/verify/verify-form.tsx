"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { completeLoginAction, type VerifyState } from "./actions";

const initialState: VerifyState = {};

export function VerifyForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(completeLoginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <div className="space-y-2">
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}
          </p>
          <Link href="/login" className="text-sm underline">
            Solicitar un enlace nuevo
          </Link>
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Ingresando…" : "Continuar"}
      </Button>
    </form>
  );
}
