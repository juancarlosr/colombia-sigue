import { describe, expect, it } from "vitest";
import { computeNitCheckDigit, validateNit } from "./nit";

describe("NIT validation (DIAN check digit)", () => {
  it("computes the check digit", () => {
    // 900123456: sum of digit*prime (right to left) = 586, 586 % 11 = 3, dv = 8
    expect(computeNitCheckDigit("900123456")).toBe(8);
  });

  it("accepts a valid NIT and normalizes formatting", () => {
    expect(validateNit("900.123.456-8")).toEqual({
      valid: true,
      normalized: "900123456-8",
    });
    expect(validateNit(" 900123456-8 ")).toEqual({
      valid: true,
      normalized: "900123456-8",
    });
  });

  it("rejects a wrong check digit", () => {
    const result = validateNit("900123456-7");
    expect(result.valid).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(validateNit("900123456").valid).toBe(false); // sin dígito de verificación
    expect(validateNit("abc-1").valid).toBe(false);
    expect(validateNit("123-4").valid).toBe(false); // demasiado corto
  });
});
