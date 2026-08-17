import { requireEmployee } from "@/lib/auth/guards";
import { AMOUNT_PRESETS } from "@/lib/donations";
import { AmountForm } from "./amount-form";

export default async function ChooseAmountPage() {
  await requireEmployee();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">
        ¿Cuánto quieres aportar mensualmente?
      </h1>
      <AmountForm presets={AMOUNT_PRESETS} />
    </div>
  );
}
