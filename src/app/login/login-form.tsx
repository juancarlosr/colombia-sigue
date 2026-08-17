"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestMagicLink, type RequestLinkState } from "./actions";

const initialState: RequestLinkState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(requestMagicLink, initialState);

  if (state.status === "sent") {
    return (
      <div className="rounded-lg border bg-card p-4 text-center text-sm text-card-foreground">
        Si tu correo está registrado, te enviamos un enlace de acceso.
        <br />
        Revisa tu bandeja de entrada.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo corporativo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@empresa.com"
        />
      </div>
      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Enviar enlace de acceso"}
      </Button>
    </form>
  );
}
