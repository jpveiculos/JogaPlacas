import { z } from "zod";

const legacyPlatePattern = /^[A-Z]{3}-?\d{4}$/;
const mercosurPlatePattern = /^[A-Z]{3}\d[A-Z]\d{2}$/;

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
  /** Comparison key: A-J Mercosur maps to legacy digits; K-Z remains Mercosur-specific. */
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

  const convertedDigit = mercosurLetterToDigit[parsed[4]];
  // A-J maps to a legacy digit. K-Z is valid Mercosur but has no legacy equivalent.
  const normalized = convertedDigit === undefined
    ? parsed
    : `${parsed.slice(0, 4)}${convertedDigit}${parsed.slice(5)}`;
  return {
    normalized,
    display: parsed,
    format: "mercosur",
  };
}
