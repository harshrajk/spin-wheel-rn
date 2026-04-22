import { describe, expect, it } from "vitest";
import {
  planRotation,
  resolveWinnerIndex,
  validateSegments,
  type WheelSegment,
} from "../src";

const segments: WheelSegment[] = [
  { id: "a", label: "A", weight: 1 },
  { id: "b", label: "B", weight: 2 },
  { id: "c", label: "C", weight: 4 },
  { id: "d", label: "D", weight: 8 },
];

describe("validateSegments", () => {
  it("passes valid segment arrays", () => {
    expect(() => validateSegments(segments)).not.toThrow();
  });

  it("throws for duplicate ids", () => {
    expect(() =>
      validateSegments([
        { id: "x", label: "X" },
        { id: "x", label: "X2" },
      ])
    ).toThrow();
  });
});

describe("resolveWinnerIndex", () => {
  it("resolves deterministic uniform random with seed", () => {
    const first = resolveWinnerIndex(segments, {
      random: { strategy: "uniform", seed: "seed-1" },
    });

    const second = resolveWinnerIndex(segments, {
      random: { strategy: "uniform", seed: "seed-1" },
    });

    expect(first).toBe(second);
  });

  it("respects forced winner id", () => {
    expect(resolveWinnerIndex(segments, { winnerId: "c" })).toBe(2);
  });

  it("throws on invalid forced winner index", () => {
    expect(() => resolveWinnerIndex(segments, { winnerIndex: 99 })).toThrow();
  });
});

describe("planRotation", () => {
  it("creates a valid plan with positive delta", () => {
    const plan = planRotation({
      segments,
      winnerIndex: 1,
      currentAngleDeg: 0,
      pointerPosition: "top",
      request: { minRounds: 3, maxRounds: 3, durationMs: 4000 },
    });

    expect(plan.deltaDeg).toBeGreaterThan(360);
    expect(plan.durationMs).toBe(4000);
    expect(plan.toDeg).toBeGreaterThan(plan.fromDeg);
  });
});
