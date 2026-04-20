import type { SectorGeometry, WheelSegment } from "./types";

export function normalizeAngleDeg(angle: number): number {
  const mod = angle % 360;
  return mod < 0 ? mod + 360 : mod;
}

export function buildSectorGeometry<TMeta>(
  segments: WheelSegment<TMeta>[]
): SectorGeometry<TMeta>[] {
  const sweep = 360 / segments.length;

  return segments.map((segment, index) => {
    const startDeg = index * sweep;
    const endDeg = startDeg + sweep;
    const centerDeg = startDeg + sweep / 2;

    return {
      segment,
      index,
      startDeg,
      endDeg,
      centerDeg,
      sweepDeg: sweep,
    };
  });
}

export function pointerAngleDeg(pointer: "top" | "right" | "bottom" | "left"): number {
  if (pointer === "right") return 0;
  if (pointer === "bottom") return 90;
  if (pointer === "left") return 180;
  return 270;
}
