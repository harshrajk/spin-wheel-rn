import type {
  PointerPosition,
  SpinRequest,
  SpinResult,
  WheelSegment,
} from "../core";
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

export type WinnerConfettiOptions = {
  durationMs?: number;
  pieceCount?: number;
  colors?: string[];
  size?: number;
};

/** Built-in visual themes. "minimal" = soft pastel. "sleek" = dark monochrome. */
export type WheelTheme = "minimal" | "sleek";

export type SpinWheelProps<TMeta = unknown> = {
  // ─── Core ───
  segments: WheelSegment<TMeta>[];
  size?: number;
  innerRadiusRatio?: number;
  theme?: WheelTheme;
  pointerPosition?: PointerPosition;
  initialRotationDeg?: number;
  disabled?: boolean;
  allowGestureSpin?: boolean;
  flickEnabled?: boolean;
  lockWhileSpinning?: boolean;

  // ─── Visual ───
  segmentStrokeColor?: string;
  segmentStrokeWidth?: number;
  labelFontSize?: number;
  labelFontWeight?: string;
  labelRotation?: "slice" | "static";
  disabledSegmentOpacity?: number;
  outerBorderColor?: string;
  outerBorderWidth?: number;

  // ─── Behavior ───
  spinDirection?: "clockwise" | "counterclockwise";
  idleRotationSpeed?: number;
  hapticFeedback?: boolean;
  customEasing?: (t: number) => number;

  // ─── Render ───
  renderSegmentLabel?: (ctx: SegmentLabelContext<TMeta>) => ReactNode;
  renderCenterContent?: () => ReactNode;
  renderPointer?: () => ReactNode;
  confettiOnWin?: boolean | WinnerConfettiOptions;

  // ─── Pointer animation ───
  pointerBounceEnabled?: boolean;

  // ─── Callbacks ───
  onSegmentChange?: (segment: WheelSegment<TMeta>) => void;
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
