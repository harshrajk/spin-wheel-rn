import { buildSectorGeometry, normalizeAngleDeg, pointerAngleDeg } from "./geometry";
import type { PointerPosition, RotationPlan, SpinRequest, WheelSegment } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function chooseRounds(request: SpinRequest): number {
  const minRounds = request.minRounds ?? 4;
  const maxRounds = request.maxRounds ?? 8;
  return clamp(Math.round((minRounds + maxRounds) / 2), minRounds, maxRounds);
}

export function planRotation<TMeta>(args: {
  segments: WheelSegment<TMeta>[];
  winnerIndex: number;
  currentAngleDeg: number;
  pointerPosition?: PointerPosition;
  request?: SpinRequest;
}): RotationPlan {
  const {
    segments,
    winnerIndex,
    currentAngleDeg,
    pointerPosition = "top",
    request = {},
  } = args;

  const sectors = buildSectorGeometry(segments);
  const winnerSector = sectors[winnerIndex];

  const pointerDeg = pointerAngleDeg(pointerPosition);
  const desiredWheelCenterDeg = normalizeAngleDeg(pointerDeg + 180);
  const finalNormalized = normalizeAngleDeg(desiredWheelCenterDeg - winnerSector.centerDeg);
  const normalizedCurrent = normalizeAngleDeg(currentAngleDeg);
  const distanceToFinal = normalizeAngleDeg(finalNormalized - normalizedCurrent);

  const rounds = chooseRounds(request);
  const deltaDeg = rounds * 360 + distanceToFinal;
  const durationMs = request.durationMs ?? 4500;

  return {
    fromDeg: currentAngleDeg,
    toDeg: currentAngleDeg + deltaDeg,
    deltaDeg,
    winnerIndex,
    durationMs,
  };
}
