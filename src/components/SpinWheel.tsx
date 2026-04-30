import {
  buildSectorGeometry,
  planRotation,
  resolveWinnerIndex,
  validateSegments,
  type SpinRequest,
  type SpinResult,
  type WheelSegment,
} from "../core";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Vibration,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, Text as SvgText, TSpan } from "react-native-svg";
import type { GestureStateChangeEvent, PanGestureHandlerEventPayload } from "react-native-gesture-handler";
import type {
  SegmentLabelContext,
  SpinWheelProps,
  SpinWheelRef,
  WheelTheme,
  WinnerConfettiOptions,
} from "./types";

function resolveEasing(
  request: SpinRequest,
  customEasingFn?: (t: number) => number
): (t: number) => number {
  const e = request.easing;
  if (e === "outQuart") return Easing.out(Easing.poly(4));
  if (e === "outExpo") return Easing.out(Easing.exp);
  if (e === "custom" && customEasingFn) return customEasingFn;
  return Easing.out(Easing.cubic);
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (Math.PI / 180) * angleDeg;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildSectorPath(
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
  innerRadius: number
): string {
  const start = polarToCartesian(cx, cy, radius, startDeg);
  const end = polarToCartesian(cx, cy, radius, endDeg);
  const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0;

  if (innerRadius <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      "Z",
    ].join(" ");
  }

  const innerStart = polarToCartesian(cx, cy, innerRadius, endDeg);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startDeg);

  return [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

const AnimatedView = Animated.createAnimatedComponent(View);
type SectorLabelProps = {
  x: number;
  y: number;
  text: string;
  fill: string;
  fontSize: number;
  fontWeight: string;
};

type LabelMetrics = {
  longestLineChars: number;
  lineCount: number;
};

type ConfettiPieceModel = {
  id: string;
  originX: number;
  originY: number;
  velocityX: number;
  velocityY: number;
  gravity: number;
  delay: number;
  size: number;
  spinDeg: number;
  color: string;
};

type ConfettiPieceProps = {
  piece: ConfettiPieceModel;
  progress: SharedValue<number>;
};

function ConfettiPiece({ piece, progress }: ConfettiPieceProps) {
  const animatedStyle = useAnimatedStyle<ViewStyle>(() => {
    const normalized = piece.delay >= 1 ? 1 : Math.max(0, (progress.value - piece.delay) / (1 - piece.delay));
    const translateX = piece.velocityX * normalized;
    const translateY = piece.velocityY * normalized + 0.5 * piece.gravity * normalized * normalized;
    const transform: NonNullable<ViewStyle["transform"]> = [
      { translateX },
      { translateY },
      { rotate: `${piece.spinDeg * normalized}deg` },
      { scale: interpolate(normalized, [0, 0.1, 1], [0.8, 1, 0.65]) },
    ];

    return {
      opacity: interpolate(normalized, [0, 0.1, 0.85, 1], [0, 1, 1, 0]),
      transform,
    };
  });

  return (
    <AnimatedView
      style={[
        styles.confettiPiece,
        {
          left: piece.originX,
          top: piece.originY,
          width: piece.size,
          height: piece.size * 0.55,
          marginLeft: -piece.size / 2,
          marginTop: -(piece.size * 0.55) / 2,
          backgroundColor: piece.color,
        },
        animatedStyle,
      ]}
    />
  );
}

function SectorLabel({
  x,
  y,
  text,
  fill,
  fontSize,
  fontWeight,
}: SectorLabelProps) {
  const lines = text.split("\n");
  return (
    <SvgText
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={fontSize}
      fontWeight={fontWeight}
      fill={fill}
    >
      {lines.map((line, index) => (
        <TSpan
          key={`${line}-${index}`}
          x={x}
          dy={index === 0 ? `${-(lines.length - 1) * 0.55}em` : "1.1em"}
        >
          {line}
        </TSpan>
      ))}
    </SvgText>
  );
}

function getLabelMetrics(text: string): LabelMetrics {
  const lines = text.split("\n");
  return {
    longestLineChars: lines.reduce((max, line) => Math.max(max, line.length), 0),
    lineCount: lines.length,
  };
}

function wrapLabelText(text: string, maxCharsPerLine: number) {
  if (text.includes("\n")) {
    // Respect explicit newlines but still enforce 2-line cap
    const explicit = text.split("\n");
    if (explicit.length <= 2) return text;
    const line1 = explicit[0] ?? "";
    const rest = explicit.slice(1).join(" ");
    const line2 = rest.length > maxCharsPerLine ? `${rest.slice(0, maxCharsPerLine - 1)}\u2026` : rest;
    return `${line1}\n${line2}`;
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    // Single long word: truncate if needed
    const w = words[0] ?? text;
    return w.length > maxCharsPerLine ? `${w.slice(0, maxCharsPerLine - 1)}\u2026` : w;
  }

  // Build exactly 2 lines; truncate overflow on line 2
  let line1 = words[0] ?? "";
  let wordIndex = 1;
  while (wordIndex < words.length) {
    const candidate = `${line1} ${words[wordIndex]}`;
    if (candidate.length <= maxCharsPerLine) {
      line1 = candidate;
      wordIndex += 1;
    } else {
      break;
    }
  }

  if (wordIndex >= words.length) {
    return line1;
  }

  // Remaining words go onto line 2
  let line2 = words[wordIndex] ?? "";
  wordIndex += 1;
  while (wordIndex < words.length) {
    const candidate = `${line2} ${words[wordIndex]}`;
    if (candidate.length <= maxCharsPerLine) {
      line2 = candidate;
      wordIndex += 1;
    } else {
      break;
    }
  }

  // If words still remain, truncate line2 with ellipsis
  if (wordIndex < words.length) {
    const ellipsis = "\u2026";
    line2 = line2.length > maxCharsPerLine - 1
      ? `${line2.slice(0, maxCharsPerLine - 1)}${ellipsis}`
      : `${line2}${ellipsis}`;
  }

  return `${line1}\n${line2}`;
}

function defaultSegmentColor(index: number): string {
  const palette = ["#EE6C4D", "#2A9D8F", "#E9C46A", "#3A86FF", "#5F8F00", "#F15BB5"];
  return palette[index % palette.length];
}

// ── Theme system ─────────────────────────────────────────────────────────────
type ThemeConfig = {
  palette: string[];
  defaultLabelColor: string;
  segmentStroke: string;
  segmentStrokeW: number;
  outerBorderStroke: string;
  outerBorderW: number;
  innerHubFill: string;
  innerHubStroke: string;
  innerHubLabelColor: string;
  innerRadiusRatio: number;
  pointerColor: string;
  doubleRing: boolean;
};

const THEME_CONFIGS: Record<WheelTheme, ThemeConfig> = {
  minimal: {
    palette: ["#D4C5F9", "#B5D8F7", "#B5EDD5", "#FFD9B5", "#FFB5D1", "#B5EDE7"],
    defaultLabelColor: "#222222",
    segmentStroke: "rgba(255,255,255,0.95)",
    segmentStrokeW: 2.5,
    outerBorderStroke: "rgba(255,255,255,0.95)",
    outerBorderW: 5,
    innerHubFill: "#FFFFFF",
    innerHubStroke: "rgba(0,0,0,0.10)",
    innerHubLabelColor: "#222222",
    innerRadiusRatio: 0.30,
    pointerColor: "#FFFFFF",
    doubleRing: true,
  },
  sleek: {
    palette: ["#2A2A2A", "#1E1E1E", "#2A2A2A", "#1E1E1E", "#2A2A2A", "#1E1E1E"],
    defaultLabelColor: "#FFFFFF",
    segmentStroke: "rgba(80,80,80,0.7)",
    segmentStrokeW: 1,
    outerBorderStroke: "#3A3A3A",
    outerBorderW: 2,
    innerHubFill: "#111111",
    innerHubStroke: "#444444",
    innerHubLabelColor: "#FFFFFF",
    innerRadiusRatio: 0.30,
    pointerColor: "#555555",
    doubleRing: false,
  },
};

function TearDropPointer({ color }: { color: string }) {
  return (
    <Svg width={22} height={28} viewBox="0 0 22 28">
      <Path
        d="M11 26 C5 19 2 15 2 9 A9 9 0 0 1 20 9 C20 15 17 19 11 26Z"
        fill={color}
      />
    </Svg>
  );
}

function defaultPointer(themeConfig: ThemeConfig | null) {
  if (themeConfig) {
    return <TearDropPointer color={themeConfig.pointerColor} />;
  }
  return <View style={styles.pointer} />;
}

function normalizeConfettiOptions(
  confettiOnWin: SpinWheelProps["confettiOnWin"]
): Required<WinnerConfettiOptions> | null {
  if (!confettiOnWin) {
    return null;
  }

  const defaults: Required<WinnerConfettiOptions> = {
    durationMs: 1800,
    pieceCount: 44,
    colors: ["#FFD166", "#F94144", "#F3722C", "#06D6A0", "#118AB2", "#8338EC", "#FF4D6D"],
    size: 8,
  };

  if (confettiOnWin === true) {
    return defaults;
  }

  const resolvedColors =
    confettiOnWin.colors && confettiOnWin.colors.length > 0 ? confettiOnWin.colors : defaults.colors;

  return {
    durationMs: Math.max(400, confettiOnWin.durationMs ?? defaults.durationMs),
    pieceCount: Math.max(8, Math.min(80, Math.round(confettiOnWin.pieceCount ?? defaults.pieceCount))),
    colors: resolvedColors,
    size: Math.max(4, confettiOnWin.size ?? defaults.size),
  };
}

const SpinWheelInner = <TMeta,>(
  {
    segments,
    size = 320,
    theme,
    innerRadiusRatio: innerRadiusRatioProp,
    initialRotationDeg = 0,
    pointerPosition = "top",
    disabled,
    allowGestureSpin = true,
    flickEnabled,
    lockWhileSpinning = true,
    segmentStrokeColor,
    segmentStrokeWidth,
    labelFontSize,
    labelFontWeight,
    disabledSegmentOpacity,
    outerBorderColor,
    outerBorderWidth,
    spinDirection = "clockwise",
    idleRotationSpeed,
    hapticFeedback,
    customEasing,
    renderCenterContent,
    renderPointer,
    renderSegmentLabel,
    confettiOnWin,
    pointerBounceEnabled = true,
    onSegmentChange,
    onSpinStart,
    onSpinEnd,
    onError,
  }: SpinWheelProps<TMeta>,
  ref: React.ForwardedRef<SpinWheelRef<TMeta>>
) => {
  const isSpinningRef = useRef(false);
  const isSettlingRef = useRef(false);
  const lastResultRef = useRef<SpinResult<TMeta> | null>(null);
  const pendingSpinResolveRef = useRef<((result: SpinResult<TMeta>) => void) | null>(null);
  const pendingSpinRejectRef = useRef<((reason?: unknown) => void) | null>(null);
  const rotation = useSharedValue(initialRotationDeg);
  const isSpinning = useSharedValue(false);
  const confettiProgress = useSharedValue(1);
  const currentSegmentIndex = useSharedValue(-1);
  const pointerDeflection = useSharedValue(0);
  const pointerLean = useSharedValue(0);
  const pointerScale = useSharedValue(1);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const windowSize = Dimensions.get("window");

  const shouldAllowGesture = flickEnabled ?? allowGestureSpin;

  const sectorGeometry = useMemo(() => {
    validateSegments(segments as WheelSegment[]);
    return buildSectorGeometry(segments as WheelSegment[]);
  }, [segments]);

  const radius = size / 2;
  const themeConfig = theme ? THEME_CONFIGS[theme] : null;
  const effectiveInnerRadiusRatio =
    innerRadiusRatioProp !== undefined ? innerRadiusRatioProp : (themeConfig?.innerRadiusRatio ?? 0);
  const innerRadius = radius * effectiveInnerRadiusRatio;
  const confettiConfig = useMemo(() => normalizeConfettiOptions(confettiOnWin), [confettiOnWin]);
  const confettiPieces = useMemo(() => {
    if (!confettiConfig) {
      return [];
    }

    const pieces: ConfettiPieceModel[] = [];
    const width = Math.max(windowSize.width, size);
    const height = Math.max(windowSize.height, size);

    for (let index = 0; index < confettiConfig.pieceCount; index += 1) {
      const ratio = index / Math.max(1, confettiConfig.pieceCount - 1);
      const speedX = -140 + ((index * 61) % 280);
      const speedY = 120 + ((index * 47) % 120);
      pieces.push({
        id: `confetti-${index}`,
        originX: width * ratio,
        originY: -24 - ((index * 19) % 70),
        velocityX: speedX,
        velocityY: speedY,
        gravity: 680 + ((index * 29) % 260),
        delay: Math.min(0.3, ((index * 17) % 100) / 360),
        size: confettiConfig.size + ((index * 17) % 5),
        spinDeg: 180 + ((index * 73) % 360),
        color: confettiConfig.colors[index % confettiConfig.colors.length],
      });
    }

    return pieces;
  }, [confettiConfig, size, windowSize.height, windowSize.width]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const rejectPendingSpin = useCallback((code: string, message: string) => {
    if (isSettlingRef.current) {
      isSettlingRef.current = false;
      return;
    }
    const reject = pendingSpinRejectRef.current;
    const error = new Error(message) as Error & { code: string };

    error.code = code;
    pendingSpinResolveRef.current = null;
    pendingSpinRejectRef.current = null;
    reject?.(error);
  }, []);

  const handleSpinComplete = useCallback(
    (winnerIndex: number, finalAngleDeg: number, durationMs: number) => {
      const result: SpinResult<TMeta> = {
        winner: segments[winnerIndex],
        winnerIndex,
        finalAngleDeg,
        durationMs,
      };
      const resolvePending = pendingSpinResolveRef.current;

      isSpinningRef.current = false;
      isSpinning.value = false;
      lastResultRef.current = result;
      pendingSpinResolveRef.current = null;
      pendingSpinRejectRef.current = null;
      resolvePending?.(result);

      cancelAnimation(pointerDeflection);
      cancelAnimation(pointerLean);
      cancelAnimation(pointerScale);
      pointerDeflection.value = 0;
      pointerLean.value = 0;
      pointerScale.value = 1;
      currentSegmentIndex.value = -1;

      if (confettiConfig) {
        setConfettiVisible(true);
        cancelAnimation(confettiProgress);
        confettiProgress.value = 0;
        confettiProgress.value = withTiming(1, {
          duration: confettiConfig.durationMs,
          easing: Easing.out(Easing.quad),
        }, (finished) => {
          if (finished) runOnJS(setConfettiVisible)(false);
        });
      }
      AccessibilityInfo.announceForAccessibility?.(
        `Spin complete. Winner is ${String(result.winner.label)}.`
      );
      onSpinEnd?.({ ...result, timestamp: Date.now() });
    },
    [confettiConfig, confettiProgress, isSpinning, onSpinEnd, segments]
  );

  const emitError = useCallback(
    (err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown spin wheel error";
      const code = err instanceof Error && "code" in err ? String((err as any).code) : "WHEEL_ERROR";
      onError?.({ code, message });
    },
    [onError]
  );

  const spin = useCallback(
    (request: SpinRequest = {}) => {
      if (disabled) {
        return Promise.reject(new Error("Spin wheel is disabled."));
      }

      if (lockWhileSpinning && isSpinningRef.current) {
        return Promise.reject(new Error("Spin already in progress."));
      }

      try {
        validateSegments(segments as WheelSegment[]);
      } catch (err) {
        emitError(err);
        return Promise.reject(err);
      }

      isSpinningRef.current = true;
      isSpinning.value = true;
      onSpinStart?.({ request, timestamp: Date.now() });

      return new Promise<SpinResult<TMeta>>((resolve, reject) => {
        try {
          const winnerIndex = resolveWinnerIndex(segments as WheelSegment[], request);
          const plan = planRotation({
            segments: segments as WheelSegment[],
            winnerIndex,
            currentAngleDeg: rotation.value,
            pointerPosition,
            request,
            direction: spinDirection,
          });

          pendingSpinResolveRef.current = resolve;
          pendingSpinRejectRef.current = reject;

          rotation.value = withTiming(
            plan.toDeg,
            {
              duration: plan.durationMs,
              easing: resolveEasing(request, customEasing),
            },
            (finished?: boolean) => {
              if (!finished) {
                runOnJS(rejectPendingSpin)("SPIN_CANCELLED", "Spin was interrupted before completion.");
                return;
              }
              isSpinning.value = false;
              runOnJS(handleSpinComplete)(winnerIndex, plan.toDeg, plan.durationMs);
            }
          );
        } catch (err) {
          isSpinningRef.current = false;
          isSpinning.value = false;
          pendingSpinResolveRef.current = null;
          pendingSpinRejectRef.current = null;
          emitError(err);
          reject(err);
        }
      });
    },
    [
      disabled,
      emitError,
      lockWhileSpinning,
      onSpinEnd,
      onSpinStart,
      pointerPosition,
      rotation,
      segments,
      handleSpinComplete,
      isSpinning,
      spinDirection,
      customEasing,
    ]
  );

  const reset = useCallback(
    (opts?: { animated?: boolean }) => {
      const animated = opts?.animated ?? false;
      if (isSpinningRef.current) {
        rejectPendingSpin("SPIN_CANCELLED", "Spin was reset before completion.");
      }
      if (animated) {
        rotation.value = withTiming(initialRotationDeg, { duration: 350 });
      } else {
        cancelAnimation(rotation);
        rotation.value = initialRotationDeg;
      }
      isSpinningRef.current = false;
      isSpinning.value = false;
      lastResultRef.current = null;
      cancelAnimation(confettiProgress);
      confettiProgress.value = 1;
      cancelAnimation(pointerDeflection);
      cancelAnimation(pointerLean);
      cancelAnimation(pointerScale);
      pointerDeflection.value = 0;
      pointerLean.value = 0;
      pointerScale.value = 1;
      currentSegmentIndex.value = -1;
    },
    [confettiProgress, currentSegmentIndex, initialRotationDeg, isSpinning, pointerDeflection, pointerLean, pointerScale, rejectPendingSpin, rotation]
  );

  const stop = useCallback((opts?: { settle?: boolean }) => {
    if (opts?.settle && isSpinningRef.current) {
      isSettlingRef.current = true;
      cancelAnimation(rotation);

      const currentAngle = rotation.value;
      const segCount = segments.length;
      const sweep = 360 / segCount;
      const normalizedAngle = ((currentAngle % 360) + 360) % 360;
      const pDeg =
        pointerPosition === "right" ? 0
        : pointerPosition === "bottom" ? 90
        : pointerPosition === "left" ? 180
        : 270;
      const relDeg = ((pDeg - normalizedAngle) % 360 + 360) % 360;
      let winnerIndex = Math.floor(relDeg / sweep) % segCount;

      if (segments[winnerIndex]?.disabled) {
        for (let offset = 1; offset < segCount; offset++) {
          const next = (winnerIndex + offset) % segCount;
          if (!segments[next]?.disabled) { winnerIndex = next; break; }
          const prev = ((winnerIndex - offset) % segCount + segCount) % segCount;
          if (!segments[prev]?.disabled) { winnerIndex = prev; break; }
        }
      }

      try {
        const plan = planRotation({
          segments: segments as WheelSegment[],
          winnerIndex,
          currentAngleDeg: currentAngle,
          pointerPosition,
          request: { minRounds: 0, maxRounds: 0, durationMs: 400 },
          direction: spinDirection,
        });

        rotation.value = withTiming(
          plan.toDeg,
          { duration: plan.durationMs, easing: Easing.out(Easing.cubic) },
          (finished?: boolean) => {
            if (!finished) {
              runOnJS(rejectPendingSpin)("SPIN_CANCELLED", "Spin was stopped before completion.");
              return;
            }
            isSpinning.value = false;
            runOnJS(handleSpinComplete)(winnerIndex, plan.toDeg, plan.durationMs);
          }
        );
      } catch {
        isSettlingRef.current = false;
        isSpinningRef.current = false;
        isSpinning.value = false;
        rejectPendingSpin("SPIN_CANCELLED", "Spin was stopped before completion.");
      }
    } else {
      cancelAnimation(rotation);
      cancelAnimation(pointerDeflection);
      cancelAnimation(pointerLean);
      cancelAnimation(pointerScale);
      pointerDeflection.value = 0;
      pointerLean.value = 0;
      pointerScale.value = 1;
      isSpinningRef.current = false;
      isSpinning.value = false;
      rejectPendingSpin("SPIN_CANCELLED", "Spin was stopped before completion.");
    }
  }, [isSpinning, pointerDeflection, pointerLean, pointerScale, rejectPendingSpin, rotation, segments, pointerPosition, handleSpinComplete, spinDirection]);

  useImperativeHandle(
    ref,
    () => ({
      spin,
      reset,
      stop,
      isSpinning: () => isSpinningRef.current,
    }),
    [reset, spin, stop]
  );

  const flickGesture = useMemo(() => {
    return Gesture.Pan().onEnd((event: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
      if (!shouldAllowGesture || disabled || (lockWhileSpinning && isSpinning.value)) {
        return;
      }

      const velocity = Math.hypot(event.velocityX, event.velocityY);
      if (velocity < 400) {
        return;
      }

      const durationMs = Math.max(2200, Math.min(5000, 5500 - velocity));
      runOnJS(spin)({ durationMs });
    });
  }, [disabled, isSpinning, lockWhileSpinning, shouldAllowGesture, spin]);

  // ── Segment-crossing reaction: onSegmentChange, haptics, pointer A / C / D ──
  const segCount = segments.length;
  const segSweep = 360 / segCount;
  const pDegValue =
    pointerPosition === "right" ? 0
    : pointerPosition === "bottom" ? 90
    : pointerPosition === "left" ? 180
    : 270;

  useAnimatedReaction(
    () => rotation.value,
    (current, previous) => {
      if (!isSpinning.value) return;
      const normalizedAngle = ((current % 360) + 360) % 360;
      const relDeg = ((pDegValue - normalizedAngle) % 360 + 360) % 360;
      const segIndex = Math.floor(relDeg / segSweep) % segCount;

      if (segIndex !== currentSegmentIndex.value) {
        currentSegmentIndex.value = segIndex;

        if (onSegmentChange) {
          runOnJS(onSegmentChange)(segments[segIndex] as WheelSegment<TMeta>);
        }
        if (hapticFeedback) {
          runOnJS(Vibration.vibrate)([0, 30]);
        }
        if (pointerBounceEnabled) {
          const speedDeg = previous !== null ? Math.abs(current - previous) : 15;
          const deflectDeg = Math.max(8, Math.min(22, 22 - speedDeg * 0.4));
          // A: speed-adaptive spring deflect
          pointerDeflection.value = -deflectDeg;
          pointerDeflection.value = withSpring(0, { damping: 12, stiffness: 400 });
          // C: scale pulse on tick
          pointerScale.value = 1.25;
          pointerScale.value = withSpring(1, { damping: 14, stiffness: 380 });
          // D: aerodynamic lean in spin direction
          const dir = spinDirection === "counterclockwise" ? -1 : 1;
          const lean = Math.min(12, speedDeg * 0.5) * dir;
          pointerLean.value = withTiming(lean, { duration: 80 });
        }
      }
    }
  );

  // ── isSpinning reaction: final ringing wobble (B) + lean reset + idle ────────
  useAnimatedReaction(
    () => isSpinning.value,
    (curr, prev) => {
      if (prev === true && !curr) {
        cancelAnimation(pointerDeflection);
        cancelAnimation(pointerScale);
        cancelAnimation(pointerLean);
        pointerDeflection.value = withTiming(0, { duration: 100 });
        pointerScale.value = withTiming(1, { duration: 100 });
        pointerLean.value = withTiming(0, { duration: 100 });
        // Restart idle rotation after spin ends
        if (idleRotationSpeed && idleRotationSpeed > 0) {
          const idleDuration = (360 / idleRotationSpeed) * 1000;
          rotation.value = withRepeat(
            withTiming(rotation.value + 360, { duration: idleDuration, easing: Easing.linear }),
            -1,
            false
          );
        }
      }
    }
  );

  // ── Idle rotation: start on mount or when speed prop changes ─────────────────
  useEffect(() => {
    if (!idleRotationSpeed || idleRotationSpeed <= 0 || isSpinningRef.current) return;
    const idleDuration = (360 / idleRotationSpeed) * 1000;
    rotation.value = withRepeat(
      withTiming(rotation.value + 360, { duration: idleDuration, easing: Easing.linear }),
      -1,
      false
    );
    return () => {
      cancelAnimation(rotation);
    };
  // rotation is a stable shared value; dep is intentionally idleRotationSpeed only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleRotationSpeed]);

  // ── Pointer position style (split: position coords + base rotation) ───────────
  const { pointerPositionStyle, pointerBaseRotationDeg } = useMemo(() => {
    if (pointerPosition === "right") {
      return { pointerPositionStyle: { right: -4, top: size / 2 - 10 } as ViewStyle, pointerBaseRotationDeg: 90 };
    }
    if (pointerPosition === "bottom") {
      return { pointerPositionStyle: { bottom: -4, left: size / 2 - 10 } as ViewStyle, pointerBaseRotationDeg: 180 };
    }
    if (pointerPosition === "left") {
      return { pointerPositionStyle: { left: -4, top: size / 2 - 10 } as ViewStyle, pointerBaseRotationDeg: 270 };
    }
    return { pointerPositionStyle: { top: -4, left: size / 2 - 10 } as ViewStyle, pointerBaseRotationDeg: 0 };
  }, [pointerPosition, size]);

  const pointerAnimatedStyle = useAnimatedStyle<ViewStyle>(() => {
    const totalRotation = pointerBaseRotationDeg + pointerDeflection.value + pointerLean.value;
    const transform: NonNullable<ViewStyle["transform"]> = [
      { rotate: `${totalRotation}deg` },
      { scale: pointerScale.value },
    ];
    return { transform };
  });

  const wheelNode = (
    <View style={{ width: size, height: size }}>
      <View style={styles.wheelShadow}>
      <View style={styles.wheelClip}>
      <AnimatedView style={[styles.wheelSpin, animatedStyle]}>
        <Svg width={size} height={size}>
          <G>
            {sectorGeometry.map((sector) => {
              const baseFontSize = labelFontSize ?? 12;
              // Position at ~52% of the available radius band — keeps text well away from outer edge
              const labelRadius = innerRadius > 0
                ? innerRadius + (radius - innerRadius) * 0.52
                : radius * 0.52;
              // Chord width at this radius for the slice's sweep angle
              const halfSweepRad = ((sector.sweepDeg / 2) * Math.PI) / 180;
              const chordWidth = 2 * labelRadius * Math.sin(halfSweepRad);
              // Use 62% of chord as safe zone — leaves clear margin from sector dividers
              const safeWidth = Math.max(16, chordWidth * 0.62);
              // Max chars per line: use 0.60 as char-width multiplier (accurate for bold fonts)
              const charWidth = baseFontSize * 0.60;
              const maxCharsPerLine = Math.max(3, Math.floor(safeWidth / charWidth));
              const labelText = wrapLabelText(String(sector.segment.label), maxCharsPerLine);
              const labelMetrics = getLabelMetrics(labelText);
              // Scale font down if the longest line still overflows safe width
              const estimatedWidth = labelMetrics.longestLineChars * baseFontSize * 0.60;
              const widthScale = Math.min(1, safeWidth / estimatedWidth);
              const resolvedFontSize = clamp(Math.floor(baseFontSize * widthScale), 7, baseFontSize);
              const path = buildSectorPath(
                radius,
                radius,
                radius,
                sector.startDeg,
                sector.endDeg,
                innerRadius
              );

              const labelPoint = polarToCartesian(radius, radius, labelRadius, sector.centerDeg);
              const labelCtx: SegmentLabelContext<TMeta> = {
                segment: sector.segment as WheelSegment<TMeta>,
                index: sector.index,
                angleDeg: sector.centerDeg,
                radius: labelRadius,
              };

              return (
                <React.Fragment key={sector.segment.id}>
                  <Path
                    d={path}
                    fill={sector.segment.color ?? (themeConfig ? themeConfig.palette[sector.index % themeConfig.palette.length] : defaultSegmentColor(sector.index))}
                    fillOpacity={sector.segment.disabled ? (disabledSegmentOpacity ?? 0.4) : 1}
                    stroke={segmentStrokeColor ?? themeConfig?.segmentStroke ?? "rgba(250, 246, 240, 0.92)"}
                    strokeWidth={segmentStrokeWidth ?? themeConfig?.segmentStrokeW ?? 2}
                  />
                  {!renderSegmentLabel ? (
                    <SectorLabel
                      x={labelPoint.x}
                      y={labelPoint.y}
                      text={labelText}
                      fill={sector.segment.textColor ?? themeConfig?.defaultLabelColor ?? "#1A1A1A"}
                      fontSize={resolvedFontSize}
                      fontWeight={labelFontWeight ?? "700"}
                    />
                  ) : (
                    <G>
                      {/* Custom label rendering can be projected by parent via overlay components. */}
                      {renderSegmentLabel(labelCtx) as any}
                    </G>
                  )}
                </React.Fragment>
              );
            })}

            <Circle
              cx={radius}
              cy={radius}
              r={Math.max(2, radius - 1)}
              fill="transparent"
              stroke={outerBorderColor ?? themeConfig?.outerBorderStroke ?? "rgba(255, 255, 255, 0.9)"}
              strokeWidth={outerBorderWidth ?? themeConfig?.outerBorderW ?? 2}
            />
            {themeConfig?.doubleRing ? (
              <Circle
                cx={radius}
                cy={radius}
                r={radius * 0.91}
                fill="transparent"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={1.5}
              />
            ) : null}
            <Circle
              cx={radius}
              cy={radius}
              r={Math.max(2, radius - 4)}
              fill="transparent"
              stroke="rgba(0, 0, 0, 0.08)"
              strokeWidth={1}
            />

            {innerRadius > 0 ? (
              <Circle
                cx={radius}
                cy={radius}
                r={innerRadius}
                fill="#FFFDF8"
                stroke="rgba(0, 0, 0, 0.08)"
                strokeWidth={1}
              />
            ) : null}
          </G>
        </Svg>
      </AnimatedView>
      </View>
      </View>

      {themeConfig && !renderCenterContent ? (
        <View style={[styles.centerContent, { width: size, height: size }]}>
          <View
            style={[
              styles.hubCircle,
              {
                width: innerRadius * 2,
                height: innerRadius * 2,
                borderRadius: innerRadius,
                backgroundColor: themeConfig.innerHubFill,
                borderColor: themeConfig.innerHubStroke,
              },
            ]}
          >
            <Text
              style={[
                styles.hubLabel,
                {
                  color: themeConfig.innerHubLabelColor,
                  fontSize: Math.max(10, innerRadius * 0.42),
                },
              ]}
            >
              SPIN
            </Text>
          </View>
        </View>
      ) : renderCenterContent ? (
        <View style={[styles.centerContent, { width: size, height: size }]}>{renderCenterContent()}</View>
      ) : null}

      <AnimatedView style={[styles.pointerWrapper, pointerPositionStyle, pointerAnimatedStyle]}>
        {renderPointer ? renderPointer() : defaultPointer(themeConfig)}
      </AnimatedView>

    </View>
  );

  return (
    <>
      <Pressable
        disabled={disabled || (lockWhileSpinning && isSpinningRef.current)}
        accessibilityRole="button"
        accessibilityLabel="Spin wheel"
        onPress={() => {
          void spin();
        }}
      >
        {shouldAllowGesture ? <GestureDetector gesture={flickGesture}>{wheelNode}</GestureDetector> : wheelNode}
      </Pressable>
      {confettiConfig && confettiVisible ? (
        <Modal transparent visible statusBarTranslucent animationType="none">
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {confettiPieces.map((piece) => (
              <ConfettiPiece key={piece.id} piece={piece} progress={confettiProgress} />
            ))}
          </View>
        </Modal>
      ) : null}
    </>
  );
};

export const SpinWheel = forwardRef(SpinWheelInner) as <TMeta>(
  props: SpinWheelProps<TMeta> & { ref?: React.Ref<SpinWheelRef<TMeta>> }
) => React.ReactElement;

const styles = StyleSheet.create({
  wheelShadow: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
    shadowColor: "#0B0D12",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  wheelClip: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
    overflow: "hidden",
  },
  wheelSpin: {
    width: "100%",
    height: "100%",
  },
  pointerWrapper: {
    position: "absolute",
    zIndex: 5,
    shadowColor: "#111827",
    shadowOpacity: 0.24,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 20,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#111827",
  },
  centerContent: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
  },
  confettiPiece: {
    position: "absolute",
    borderRadius: 2,
  },
  hubCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  hubLabel: {
    fontWeight: "800",
    letterSpacing: 2,
  },
});
