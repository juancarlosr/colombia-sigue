"use client";

import { useActionState } from "react";
import type { Foundation } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateFoundationAction, type FoundationState } from "../actions";

const initialState: FoundationState = {};

const FIELDS: Array<{ name: keyof Foundation & string; label: string; required?: boolean }> = [
  { name: "displayName", label: "Nombre para mostrar", required: true },
  { name: "legalName", label: "Razón social", required: true },
  { name: "nit", label: "NIT", required: true },
  { name: "description", label: "Descripción de la causa" },
  { name: "website", label: "Sitio web" },
  { name: "logoUrl", label: "URL del logo" },
  { name: "bankName", label: "Banco" },
  { name: "bankAccount", label: "Cuenta bancaria" },
  { name: "contactName", label: "Nombre de contacto" },
  { name: "contactEmail", label: "Email de contacto" },
];

export function FoundationForm({ foundation }: { foundation: Foundation }) {
  const [state, formAction, pending] = useActionState(updateFoundationAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              name={field.name}
              defaultValue={(foundation[field.name] as string | null) ?? ""}
              required={field.required}
            />
          </div>
        ))}
      </div>
      {state.errors && (
        <ul className="space-y-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {state.ok && (
        <p className="rounded-lg border bg-card p-3 text-sm">Fundación actualizada.</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
