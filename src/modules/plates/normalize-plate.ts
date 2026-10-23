import { z } from "zod";

const legacyPlatePattern = /^[A-Z]{3}-?\d{4}$/;
const mercosurPlatePattern = /^[A-Z]{3}\d[A-J]\d{2}$/;

export const plateInputSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase().replace(/\s+/g, ""))
  .refine(
    (value) => legacyPlatePattern.test(value) || mercosurPlatePattern.test(value),
    "Informe uma placa válida no padrão ABC-1234 ou ABC1D23.",
  );

const mercosurLetterToDigit: Readonly<Record<string, string>> = {
  A: "0",
  B: "1",
  C: "2",
  D: "3",
  E: "4",
  F: "5",
  G: "6",
  H: "7",
  I: "8",
  J: "9",
};

export type NormalizedPlate = {
  /** Canonical comparison/result key, always three letters plus four digits. */
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
      display: `${normalized.slice(0, 3)}-${normalized.slice(3)}`,
      format: "legacy",
    };
  }

  const converted = `${parsed.slice(0, 4)}${mercosurLetterToDigit[parsed[4]]}${parsed.slice(5)}`;
  return {
    normalized: converted,
    display: parsed,
    format: "mercosur",
  };
}
