import type {
  PointerPosition,
  SpinRequest,
  SpinResult,
  WheelSegment,
} from "@acme/wheel-core";
import type { ReactNode } from "react";

export type SegmentLabelContext<TMeta = unknown> = {
  segment: WheelSegment<TMeta>;
  index: number;
  angleDeg: number;
  radius: number;
};

export type SpinStartEvent = {
  request: SpinRequest;
  timestamp: number;
};

export type SpinEndEvent<TMeta = unknown> = SpinResult<TMeta> & {
  timestamp: number;
};

export type WheelError = {
  code: string;
  message: string;
};

export type SpinWheelProps<TMeta = unknown> = {
  segments: WheelSegment<TMeta>[];
  size?: number;
  innerRadiusRatio?: number;
  pointerPosition?: PointerPosition;
  initialRotationDeg?: number;
  disabled?: boolean;
  allowGestureSpin?: boolean;
  flickEnabled?: boolean;
  lockWhileSpinning?: boolean;
  renderSegmentLabel?: (ctx: SegmentLabelContext<TMeta>) => ReactNode;
  renderCenterContent?: () => ReactNode;
  renderPointer?: () => ReactNode;
  onSpinStart?: (event: SpinStartEvent) => void;
  onSpinEnd?: (event: SpinEndEvent<TMeta>) => void;
  onError?: (error: WheelError) => void;
};

export type SpinWheelRef<TMeta = unknown> = {
  spin: (request?: SpinRequest) => Promise<SpinResult<TMeta>>;
  reset: (opts?: { animated?: boolean }) => void;
  stop: (opts?: { settle?: boolean }) => void;
  isSpinning: () => boolean;
};
