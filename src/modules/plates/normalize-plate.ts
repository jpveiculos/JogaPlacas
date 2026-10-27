import { z } from "zod";

const legacyPlatePattern = /^[A-Z]{3}-?\d{4}$/;
const mercosurPlatePattern = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export const plateInputSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine(
    (value) => legacyPlatePattern.test(value) || mercosurPlatePattern.test(value),
    "Informe uma placa válida no padrão ABC1234 ou ABC1D23.",
  );

export type NormalizedPlate = {
  /** Comparison key is format-specific; legacy and Mercosur keys never collide by conversion. */
  normalized: string;
  /** User-facing plate form, canonicalized for display. */
  display: string;
  /** Format recognized at input time. */
  format: "legacy" | "mercosur";
};

export function normalizePlate(input: string): NormalizedPlate {
  const parsed = plateInputSchema.parse(input);

  if (legacyPlatePattern.test(parsed)) {
    const normalized = parsed.replace("-", "");
    return {
      normalized,
      display: normalized,
      format: "legacy",
    };
  }

  // Keep the full Mercosur string intact, including A-Z in position five.
  // Cross-format equivalence must be an explicit business rule, never implicit normalization.
  return {
    normalized: parsed,
    display: parsed,
    format: "mercosur",
  };
}
