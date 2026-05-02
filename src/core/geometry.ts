import type { SectorGeometry, WheelSegment } from "./types";

export function normalizeAngleDeg(angle: number): number {
  const mod = angle % 360;
  return mod < 0 ? mod + 360 : mod;
}

export function buildSectorGeometry<TMeta>(
  segments: WheelSegment<TMeta>[]
): SectorGeometry<TMeta>[] {
  const totalWeight = segments.reduce((sum, s) => sum + (s.weight ?? 1), 0);
  let startDeg = 0;

  return segments.map((segment, index) => {
    const sweepDeg = ((segment.weight ?? 1) / totalWeight) * 360;
    const endDeg = startDeg + sweepDeg;
    const centerDeg = startDeg + sweepDeg / 2;
    const geo: SectorGeometry<TMeta> = {
      segment,
      index,
      startDeg,
      endDeg,
      centerDeg,
      sweepDeg,
    };
    startDeg = endDeg;
    return geo;
  });
}

export function pointerAngleDeg(pointer: "top" | "right" | "bottom" | "left"): number {
  if (pointer === "right") return 0;
  if (pointer === "bottom") return 90;
  if (pointer === "left") return 180;
  return 270;
}
