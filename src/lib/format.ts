export function formatCop(amount: number): string {
  return `$${amount.toLocaleString("es-CO")}`;
}
