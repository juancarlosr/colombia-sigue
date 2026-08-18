// Validación del NIT colombiano con dígito de verificación (algoritmo
// módulo 11 de la DIAN). Acepta formatos con puntos y espacios; exige
// el dígito de verificación explícito tras un guion: "900123456-8".

const DIAN_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export function computeNitCheckDigit(body: string): number {
  const digits = body.split("").reverse();
  const sum = digits.reduce(
    (acc, digit, index) => acc + Number(digit) * DIAN_WEIGHTS[index],
    0,
  );
  const remainder = sum % 11;
  return remainder > 1 ? 11 - remainder : remainder;
}

export function validateNit(
  input: string,
): { valid: true; normalized: string } | { valid: false; error: string } {
  const cleaned = input.replace(/[.\s]/g, "");
  const match = cleaned.match(/^(\d{5,15})-(\d)$/);
  if (!match) {
    return {
      valid: false,
      error: "Ingresa el NIT con dígito de verificación, por ejemplo: 900123456-8.",
    };
  }
  const [, body, checkDigit] = match;
  if (computeNitCheckDigit(body) !== Number(checkDigit)) {
    return {
      valid: false,
      error: "El dígito de verificación no corresponde al NIT. Revísalo.",
    };
  }
  return { valid: true, normalized: `${body}-${checkDigit}` };
}
