"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerCompanyAction, type RegisterCompanyState } from "./actions";

const initialState: RegisterCompanyState = {};

const FIELDS = [
  { name: "legalName", label: "Razón social", placeholder: "Mi Empresa S.A.S." },
  { name: "name", label: "Nombre comercial", placeholder: "Mi Empresa" },
  { name: "nit", label: "NIT (con dígito de verificación)", placeholder: "900123456-8" },
  { name: "contactName", label: "Nombre del responsable", placeholder: "Nombre y apellido" },
  { name: "contactRole", label: "Cargo", placeholder: "Gerente de Gestión Humana" },
  {
    name: "contactEmail",
    label: "Correo corporativo del responsable",
    placeholder: "nombre@tuempresa.com",
    type: "email",
  },
  {
    name: "employeeEstimate",
    label: "Número aproximado de empleados",
    placeholder: "50",
    type: "number",
  },
] as const;

export function RegistrationForm({ agreementText }: { agreementText: string }) {
  const [state, formAction, pending] = useActionState(registerCompanyAction, initialState);
  const [accepted, setAccepted] = useState(false);
  // Campos controlados: React 19 resetea los formularios no controlados
  // tras cada action — un error del servidor no debe borrar lo escrito.
  const [values, setValues] = useState<Record<string, string>>({});

  if (state.ok) {
    return (
      <div className="space-y-3 rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-bold">Solicitud recibida ✓</h2>
        {state.emailSent === false ? (
          <p className="text-muted-foreground">
            Registramos tu solicitud, pero no pudimos enviarte el correo de verificación. No te
            preocupes: la revisaremos y te contactaremos directamente.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Te enviamos un correo para verificar la solicitud. Después de la verificación la
            revisamos y te contactamos — normalmente en un día hábil.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            key={field.name}
            className={field.name === "contactEmail" ? "space-y-2 sm:col-span-2" : "space-y-2"}
          >
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              name={field.name}
              placeholder={field.placeholder}
              type={"type" in field ? field.type : "text"}
              min={"type" in field && field.type === "number" ? 1 : undefined}
              value={values[field.name] ?? ""}
              onChange={(e) =>
                setValues((current) => ({ ...current, [field.name]: e.target.value }))
              }
              required
            />
          </div>
        ))}
      </div>

      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer font-semibold">
          Acuerdo de participación (léelo antes de aceptar)
        </summary>
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
          {agreementText}
        </p>
      </details>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4">
        <input
          type="checkbox"
          name="acepto"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 size-4 accent-primary"
        />
        <span className="text-sm font-medium">
          He leído y acepto el acuerdo de participación en nombre de la empresa.
        </span>
      </label>

      {state.errors && (
        <ul className="space-y-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <Button type="submit" size="lg" disabled={!accepted || pending}>
        {pending ? "Enviando…" : "Enviar solicitud"}
      </Button>
    </form>
  );
}
