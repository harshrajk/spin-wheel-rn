import { buildSectorGeometry, normalizeAngleDeg, pointerAngleDeg } from "./geometry";
import { createSeededRng } from "./rng";
import type { PointerPosition, RotationPlan, SpinRequest, WheelSegment } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function chooseRounds(request: SpinRequest): number {
  const minRounds = request.minRounds ?? 4;
  const maxRounds = request.maxRounds ?? 8;
  if (minRounds === maxRounds) {
    return minRounds;
  }
  const rng = createSeededRng(request.random?.seed);
  return clamp(Math.floor(rng() * (maxRounds - minRounds + 1)) + minRounds, minRounds, maxRounds);
}

export function planRotation<TMeta>(args: {
  segments: WheelSegment<TMeta>[];
  winnerIndex: number;
  currentAngleDeg: number;
  pointerPosition?: PointerPosition;
  request?: SpinRequest;
  direction?: "clockwise" | "counterclockwise";
}): RotationPlan {
  const {
    segments,
    winnerIndex,
    currentAngleDeg,
    pointerPosition = "top",
    request = {},
    direction = "clockwise",
  } = args;

  const sectors = buildSectorGeometry(segments);
  const winnerSector = sectors[winnerIndex];

  const pointerDeg = pointerAngleDeg(pointerPosition);
  const finalNormalized = normalizeAngleDeg(pointerDeg - winnerSector.centerDeg);
  const normalizedCurrent = normalizeAngleDeg(currentAngleDeg);
  const distanceToFinal = normalizeAngleDeg(finalNormalized - normalizedCurrent);

  const rounds = chooseRounds(request);

  let deltaDeg: number;
  if (direction === "counterclockwise") {
    const ccwDistance = distanceToFinal > 0 ? 360 - distanceToFinal : 0;
    deltaDeg = -(rounds * 360 + ccwDistance);
  } else {
    deltaDeg = rounds * 360 + distanceToFinal;
  }

  const durationMs = request.durationMs ?? 4500;

  return {
    fromDeg: currentAngleDeg,
    toDeg: currentAngleDeg + deltaDeg,
    deltaDeg,
    winnerIndex,
    durationMs,
  };
}
