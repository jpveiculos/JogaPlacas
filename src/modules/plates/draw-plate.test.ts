import { describe, expect, it } from "vitest";
import { drawPlate } from "./draw-plate";

describe("drawPlate", () => {
  it("draws a valid legacy-format plate", () => {
    let index = 0;
    const result = drawPlate("legacy", (max) => (index++ % max));
    expect(result).toMatch(/^[A-Z]{3}-\d{4}$/);
  });

  it("draws a valid Mercosur-format plate including letters K-Z", () => {
    const values = [0, 1, 2, 3, 25, 4, 5];
    const result = drawPlate("mercosur", () => values.shift() ?? 0);
    expect(result).toBe("ABC3Z45");
    expect(result).toMatch(/^[A-Z]{3}\d[A-Z]\d{2}$/);
  });

  it("allows two independent format draws in one round", () => {
    const legacy = drawPlate("legacy", () => 0);
    const mercosur = drawPlate("mercosur", () => 0);
    expect(legacy).toBe("AAA-0000");
    expect(mercosur).toBe("AAA0A00");
  });
});
