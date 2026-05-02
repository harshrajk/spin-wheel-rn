export type WheelSegment<TMeta = unknown> = {
  id: string;
  label: string;
  weight?: number;
  color?: string;
  textColor?: string;
  metadata?: TMeta;
  disabled?: boolean;
  /** When true, winning this segment will not trigger the confetti animation. */
  disableConfetti?: boolean;
};

export type SpinRequest = {
  winnerId?: string;
  winnerIndex?: number;
  random?: {
    seed?: number | string;
    strategy?: "uniform" | "weighted";
  };
  durationMs?: number;
  minRounds?: number;
  maxRounds?: number;
  easing?: "outCubic" | "outQuart" | "outExpo" | "custom";
  /** Override the spin direction for this single request. Takes precedence over the `spinDirection` prop. */
  direction?: "clockwise" | "counterclockwise";
};

export type SpinResult<TMeta = unknown> = {
  winner: WheelSegment<TMeta>;
  winnerIndex: number;
  finalAngleDeg: number;
  durationMs: number;
};

export type PointerPosition = "top" | "right" | "bottom" | "left";

export type SectorGeometry<TMeta = unknown> = {
  segment: WheelSegment<TMeta>;
  index: number;
  startDeg: number;
  endDeg: number;
  centerDeg: number;
  sweepDeg: number;
};

export type RotationPlan = {
  fromDeg: number;
  toDeg: number;
  deltaDeg: number;
  winnerIndex: number;
  durationMs: number;
};
