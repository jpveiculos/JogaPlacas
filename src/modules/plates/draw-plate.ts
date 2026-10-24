import { randomInt } from "node:crypto";

export type PlateDrawFormat = "legacy" | "mercosur";
export type RandomInteger = (maxExclusive: number) => number;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";

/**
 * Draw one structurally valid plate. Call once per format to obtain independent
 * results. Uses the operating system's cryptographically secure random source
 * by default; injection exists only to make unit tests deterministic.
 *
 * This validates the plate format, not whether a plate is registered to a vehicle.
 */
export function drawPlate(
  format: PlateDrawFormat,
  nextInt: RandomInteger = randomInt,
): string {
  const letter = () => LETTERS[nextInt(LETTERS.length)]!;
  const digit = () => DIGITS[nextInt(DIGITS.length)]!;

  if (format === "legacy") {
    return `${letter()}${letter()}${letter()}-${digit()}${digit()}${digit()}${digit()}`;
  }

  return `${letter()}${letter()}${letter()}${digit()}${letter()}${digit()}${digit()}`;
}
