import { WheelConfigError } from "./errors";
import type { WheelSegment } from "./types";

export function validateSegments<TMeta>(segments: WheelSegment<TMeta>[]): void {
  if (!Array.isArray(segments) || segments.length < 2) {
    throw new WheelConfigError(
      "INVALID_SEGMENTS_COUNT",
      "At least two segments are required."
    );
  }

  const seen = new Set<string>();
  let activeCount = 0;

  for (const segment of segments) {
    if (!segment?.id) {
      throw new WheelConfigError(
        "INVALID_SEGMENT_ID",
        "Every segment must include a non-empty id."
      );
    }

    if (seen.has(segment.id)) {
      throw new WheelConfigError(
        "DUPLICATE_SEGMENT_ID",
        `Duplicate segment id: ${segment.id}`
      );
    }

    seen.add(segment.id);

    const weight = segment.weight ?? 1;
    if (weight < 0) {
      throw new WheelConfigError(
        "INVALID_SEGMENT_WEIGHT",
        `Segment ${segment.id} has negative weight.`
      );
    }

    if (!segment.disabled) {
      activeCount += 1;
    }
  }

  if (activeCount < 2) {
    throw new WheelConfigError(
      "INSUFFICIENT_ACTIVE_SEGMENTS",
      "At least two active (non-disabled) segments are required."
    );
  }
}
