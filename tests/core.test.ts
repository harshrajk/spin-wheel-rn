import { describe, expect, it } from "vitest";
import {
  buildSectorGeometry,
  normalizeAngleDeg,
  planRotation,
  pointerAngleDeg,
  resolveWinnerIndex,
  validateSegments,
  type WheelSegment,
} from "../src/core";

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

  it("lands the selected winner under the top pointer", () => {
    const winnerIndex = 1;
    const plan = planRotation({
      segments,
      winnerIndex,
      currentAngleDeg: 0,
      pointerPosition: "top",
      request: { minRounds: 0, maxRounds: 0, durationMs: 1000 },
    });
    const winnerSector = buildSectorGeometry(segments)[winnerIndex];
    const landedCenter = normalizeAngleDeg(winnerSector.centerDeg + normalizeAngleDeg(plan.toDeg));

    expect(landedCenter).toBe(pointerAngleDeg("top"));
  });

  it("lands the selected winner under each pointer position", () => {
    const winnerIndex = 2;
    const winnerSector = buildSectorGeometry(segments)[winnerIndex];

    for (const pointerPosition of ["top", "right", "bottom", "left"] as const) {
      const plan = planRotation({
        segments,
        winnerIndex,
        currentAngleDeg: 0,
        pointerPosition,
        request: { minRounds: 0, maxRounds: 0, durationMs: 1000 },
      });
      const landedCenter = normalizeAngleDeg(winnerSector.centerDeg + normalizeAngleDeg(plan.toDeg));

      expect(landedCenter).toBe(pointerAngleDeg(pointerPosition));
    }
  });

  it("counterclockwise spin produces a negative deltaDeg", () => {
    const plan = planRotation({
      segments,
      winnerIndex: 0,
      currentAngleDeg: 0,
      pointerPosition: "top",
      request: { minRounds: 3, maxRounds: 3 },
      direction: "counterclockwise",
    });

    expect(plan.deltaDeg).toBeLessThan(0);
    expect(plan.toDeg).toBeLessThan(plan.fromDeg);
  });

  it("clockwise and counterclockwise land the same winner under the same pointer", () => {
    const winnerIndex = 1;
    const winnerSector = buildSectorGeometry(segments)[winnerIndex];

    for (const direction of ["clockwise", "counterclockwise"] as const) {
      const plan = planRotation({
        segments,
        winnerIndex,
        currentAngleDeg: 0,
        pointerPosition: "top",
        request: { minRounds: 0, maxRounds: 0, durationMs: 1000 },
        direction,
      });
      const landedCenter = normalizeAngleDeg(winnerSector.centerDeg + normalizeAngleDeg(plan.toDeg));

      expect(landedCenter).toBe(pointerAngleDeg("top"));
    }
  });

  it("same seed always produces the same round count", () => {
    const make = () =>
      planRotation({
        segments,
        winnerIndex: 0,
        currentAngleDeg: 0,
        pointerPosition: "top",
        request: { minRounds: 3, maxRounds: 8, random: { seed: "round-seed-test" } },
      });

    expect(make().deltaDeg).toBe(make().deltaDeg);
  });

  it("different seeds produce varied round counts within the allowed range", () => {
    const deltas = ["seed-a", "seed-b", "seed-c", "seed-d", "seed-e"].map((seed) =>
      planRotation({
        segments,
        winnerIndex: 0,
        currentAngleDeg: 0,
        pointerPosition: "top",
        request: { minRounds: 3, maxRounds: 8, random: { seed } },
      }).deltaDeg
    );

    const uniqueDeltas = new Set(deltas);
    expect(uniqueDeltas.size).toBeGreaterThan(1);
  });
});
