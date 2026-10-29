import { describe, expect, it } from "vitest";
import { normalizePlate, plateInputSchema } from "./normalize-plate";

describe("normalizePlate", () => {
  it("normalizes a legacy plate and preserves its display format", () => {
    expect(normalizePlate("abc-1323")).toEqual({
      normalized: "ABC1323",
      display: "ABC1323",
      format: "legacy",
    });
  });

  it("preserves Mercosur format instead of converting it to a legacy key", () => {
    expect(normalizePlate("ABC1D23")).toEqual({
      normalized: "ABC1D23",
      display: "ABC1D23",
      format: "mercosur",
    });
  });

  it("preserves every letter A-Z in the fifth Mercosur position", () => {
    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      expect(normalizePlate(`ABC1${letter}23`)).toEqual({
        normalized: `ABC1${letter}23`,
        display: `ABC1${letter}23`,
        format: "mercosur",
      });
    }
  });

  it("accepts lowercase input and surrounding whitespace", () => {
    expect(normalizePlate("  abc1d23 ")).toEqual({
      normalized: "ABC1D23",
      display: "ABC1D23",
      format: "mercosur",
    });
  });

  it.each(["", "AB-1234", "ABCD123", "ABC12345", "ABC-12A4", "ABC11A23"])(
    "rejects invalid plate %s",
    (plate) => {
      expect(() => normalizePlate(plate)).toThrow();
    },
  );

  it("validates legacy and complete Mercosur formats", () => {
    expect(plateInputSchema.safeParse("ABC1323").success).toBe(true);
    expect(plateInputSchema.safeParse("ABC-1323").success).toBe(true);
    expect(plateInputSchema.safeParse("ABC1D23").success).toBe(true);
    expect(plateInputSchema.safeParse("ABC1Z23").success).toBe(true);
    expect(plateInputSchema.safeParse("not a plate").success).toBe(false);
  });
});
