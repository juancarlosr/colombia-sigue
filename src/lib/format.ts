const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function formatCop(amount: number): string {
  return `$${amount.toLocaleString("es-CO")}`;
}

export function formatPeriod(month: number, year: number): string {
  return `${MONTHS_ES[month - 1]} ${year}`;
}
