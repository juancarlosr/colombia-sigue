import { formatCop } from "./format";

// Placeholder pending review by a Colombian labor lawyer (launch gate,
// spec §28). Swapping in the approved text means bumping the version
// and updating the template — never editing stored authorizations.
export const AUTHORIZATION_TEXT_VERSION = "v0-draft";

export function buildAuthorizationText(
  companyName: string,
  foundationName: string,
  amount: number,
): string {
  return (
    `Autorizo voluntariamente a ${companyName} a descontar ${formatCop(amount)} ` +
    `mensuales de mi nómina y transferir estos recursos a ${foundationName}. ` +
    `Entiendo que puedo modificar o revocar esta autorización en cualquier momento ` +
    `y que los cambios aplicarán a los períodos de nómina que todavía no hayan sido procesados.`
  );
}
