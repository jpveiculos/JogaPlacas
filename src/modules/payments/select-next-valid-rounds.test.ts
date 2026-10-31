import { describe, expect, it } from "vitest";
import { selectNextValidRounds } from "./select-next-valid-rounds";

const instant = new Date("2026-10-30T15:00:00.000Z");
const round = (id: string, resultAt: string, status = "SCHEDULED", cutoffAt?: string) => ({
  id,
  status,
  cutoffAt: new Date(cutoffAt ?? new Date(new Date(resultAt).getTime() - 60_000).toISOString()),
  resultAt: new Date(resultAt),
});

describe("selectNextValidRounds", () => {
  it("selects the earliest eligible rounds using the decision instant", () => {
    const rounds = [
      round("later", "2026-10-30T16:00:00.000Z"),
      round("first", "2026-10-30T15:30:00.000Z", "OPEN"),
      round("closed", "2026-10-30T15:10:00.000Z", "CLOSED"),
    ];
    expect(selectNextValidRounds(rounds, 2, instant).map((item) => item.id)).toEqual(["first", "later"]);
  });

  it("skips a round whose cutoff has arrived and continues to the next valid round", () => {
    const rounds = [
      round("cutoff-passed", "2026-10-30T15:30:00.000Z", "OPEN", "2026-10-30T15:00:00.000Z"),
      round("next", "2026-10-30T16:00:00.000Z"),
    ];
    expect(selectNextValidRounds(rounds, 1, instant).map((item) => item.id)).toEqual(["next"]);
  });

  it("returns fewer rounds when the requested repetition count cannot be satisfied", () => {
    expect(selectNextValidRounds([round("only", "2026-10-30T15:30:00.000Z")], 2, instant)).toHaveLength(1);
  });

  it("rejects invalid counts and invalid decision timestamps", () => {
    const rounds = [round("one", "2026-10-30T15:30:00.000Z")];
    expect(selectNextValidRounds(rounds, 0, instant)).toEqual([]);
    expect(selectNextValidRounds(rounds, 1, new Date("invalid"))).toEqual([]);
  });
});
