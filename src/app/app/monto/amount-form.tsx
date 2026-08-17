"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCop } from "@/lib/format";

const MIN_AMOUNT = 1_000;
const MAX_AMOUNT = 10_000_000;

export function AmountForm({ presets }: { presets: number[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | "otro" | null>(null);
  const [custom, setCustom] = useState("");

  const amount = selected === "otro" ? Number.parseInt(custom, 10) : selected;
  const isValid =
    typeof amount === "number" &&
    Number.isInteger(amount) &&
    amount >= MIN_AMOUNT &&
    amount <= MAX_AMOUNT;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setSelected(preset)}
            className={`rounded-xl border p-4 text-lg font-medium transition-colors ${
              selected === preset
                ? "border-primary bg-primary/5 ring-2 ring-primary"
                : "hover:bg-muted"
            }`}
          >
            {formatCop(preset)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelected("otro")}
          className={`rounded-xl border p-4 text-lg font-medium transition-colors ${
            selected === "otro"
              ? "border-primary bg-primary/5 ring-2 ring-primary"
              : "hover:bg-muted"
          }`}
        >
          Otro monto
        </button>
      </div>

      {selected === "otro" && (
        <div className="space-y-2">
          <Label htmlFor="custom-amount">Monto mensual en pesos</Label>
          <Input
            id="custom-amount"
            type="number"
            inputMode="numeric"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            step={1000}
            placeholder="30000"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          {custom !== "" && !isValid && (
            <p className="text-sm text-destructive">
              Ingresa un monto entre {formatCop(MIN_AMOUNT)} y {formatCop(MAX_AMOUNT)}.
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Este monto será descontado una vez al mes de tu nómina mientras tu autorización esté
        activa.
      </p>

      <Button
        className="w-full"
        size="lg"
        disabled={!isValid}
        onClick={() => isValid && router.push(`/app/autorizar?monto=${amount}`)}
      >
        Continuar
      </Button>
    </div>
  );
}
