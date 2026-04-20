import { WheelConfigError } from "./errors";
import { createSeededRng } from "./rng";
import type { SpinRequest, WheelSegment } from "./types";

function activeIndexes<TMeta>(segments: WheelSegment<TMeta>[]): number[] {
  const indexes: number[] = [];
  for (let i = 0; i < segments.length; i += 1) {
    if (!segments[i].disabled) {
      indexes.push(i);
    }
  }
  return indexes;
}

export function resolveWinnerIndex<TMeta>(
  segments: WheelSegment<TMeta>[],
  request: SpinRequest = {}
): number {
  const active = activeIndexes(segments);

  if (request.winnerIndex !== undefined) {
    if (!active.includes(request.winnerIndex)) {
      throw new WheelConfigError(
        "INVALID_FORCED_WINNER_INDEX",
        "winnerIndex must point to an active segment."
      );
    }
    return request.winnerIndex;
  }

  if (request.winnerId !== undefined) {
    const winnerIndex = segments.findIndex((x) => x.id === request.winnerId && !x.disabled);
    if (winnerIndex < 0) {
      throw new WheelConfigError(
        "INVALID_FORCED_WINNER_ID",
        "winnerId must match an active segment id."
      );
    }
    return winnerIndex;
  }

  const strategy = request.random?.strategy ?? "uniform";
  const rng = createSeededRng(request.random?.seed);

  if (strategy === "weighted") {
    const totalWeight = active.reduce((sum, index) => sum + (segments[index].weight ?? 1), 0);
    if (totalWeight <= 0) {
      throw new WheelConfigError(
        "INVALID_WEIGHT_TOTAL",
        "Weighted strategy requires active segments with total weight > 0."
      );
    }

    let cursor = rng() * totalWeight;
    for (const index of active) {
      cursor -= segments[index].weight ?? 1;
      if (cursor <= 0) {
        return index;
      }
    }

    return active[active.length - 1];
  }

  const randomIndex = Math.floor(rng() * active.length);
  return active[randomIndex];
}
