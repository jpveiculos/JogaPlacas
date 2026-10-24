import { describe, expect, it } from "vitest";
import { normalizePlate, plateInputSchema } from "./normalize-plate";

describe("normalizePlate", () => {
  it("normalizes a legacy plate and preserves its display format", () => {
    expect(normalizePlate("abc-1323")).toEqual({
      normalized: "ABC1323",
      display: "ABC-1323",
      format: "legacy",
    });
  });

  it("maps a Mercosur plate to the same canonical result key", () => {
    expect(normalizePlate("ABC1D23")).toEqual({
      normalized: "ABC1323",
      display: "ABC1D23",
      format: "mercosur",
    });
  });

  it("supports the complete A-J conversion mapping", () => {
    const expectedDigits = "0123456789";
    [..."ABCDEFGHIJ"].forEach((letter, index) => {
      const plate = normalizePlate(`ABC1${letter}23`);
      expect(plate.normalized).toBe(`ABC1${expectedDigits[index]}23`);
    });
  });

  it("accepts Mercosur letters K-Z without inventing a legacy equivalent", () => {\n    expect(normalizePlate("ABC1K23")).toEqual({\n      normalized: "ABC1K23",\n      display: "ABC1K23",\n      format: "mercosur",\n    });\n  });\n\n  it("accepts lowercase input and surrounding whitespace", () => {
    expect(normalizePlate("  abc1d23 ").normalized).toBe("ABC1323");
  });

  it.each(["", "AB-1234", "ABCD123", "ABC12345", "ABC-12A4"])(
    "rejects invalid plate %s",
    (plate) => {
      expect(() => normalizePlate(plate)).toThrow();
    },
  );

  it("validates input through the shared schema", () => {
    expect(plateInputSchema.safeParse("ABC-1323").success).toBe(true);
    expect(plateInputSchema.safeParse("ABC1D23").success).toBe(true);\n    expect(plateInputSchema.safeParse("ABC1Z23").success).toBe(true);
    expect(plateInputSchema.safeParse("not a plate").success).toBe(false);
  });
});
