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
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type Adaptable,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import type { GestureStateChangeEvent, PanGestureHandlerEventPayload } from "react-native-gesture-handler";
import type {
  SegmentLabelContext,
  SpinWheelProps,
  SpinWheelRef,
  WinnerConfettiOptions,
} from "./types";

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (Math.PI / 180) * angleDeg;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
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
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

type SectorLabelProps = {
  x: number;
  y: number;
  text: string;
  fill: string;
  baseRotationDeg: number;
  rotation: SharedValue<number>;
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
  const animatedStyle = useAnimatedStyle(() => {
    const normalized = piece.delay >= 1 ? 1 : Math.max(0, (progress.value - piece.delay) / (1 - piece.delay));
    const translateX = piece.velocityX * normalized;
    const translateY = piece.velocityY * normalized + 0.5 * piece.gravity * normalized * normalized;

    return {
      opacity: interpolate(normalized, [0, 0.1, 0.85, 1], [0, 1, 1, 0]),
      transform: [
        { translateX },
        { translateY },
        { rotate: `${piece.spinDeg * normalized}deg` },
        { scale: interpolate(normalized, [0, 0.1, 1], [0.8, 1, 0.65]) },
      ],
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

function SectorLabel({ x, y, text, fill, baseRotationDeg, rotation }: SectorLabelProps) {
  const animatedProps = useAnimatedProps(() => {
    return {
      rotation: baseRotationDeg - rotation.value,
    };
  });

  return (
    <AnimatedSvgText
      animatedProps={animatedProps}
      originX={x}
      originY={y}
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={12}
      fontWeight="700"
      dy="0.35em"
      fill={fill}
    >
      {text}
    </AnimatedSvgText>
  );
}

function defaultSegmentColor(index: number): string {
  const palette = ["#EE6C4D", "#2A9D8F", "#E9C46A", "#3A86FF", "#5F8F00", "#F15BB5"];
  return palette[index % palette.length];
}

function defaultPointer() {
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
    innerRadiusRatio = 0,
    initialRotationDeg = 0,
    pointerPosition = "top",
    disabled,
    allowGestureSpin = true,
    flickEnabled,
    lockWhileSpinning = true,
    renderCenterContent,
    renderPointer,
    renderSegmentLabel,
    confettiOnWin,
    onSpinStart,
    onSpinEnd,
    onError,
  }: SpinWheelProps<TMeta>,
  ref: React.ForwardedRef<SpinWheelRef<TMeta>>
) => {
  const isSpinningRef = useRef(false);
  const lastResultRef = useRef<SpinResult<TMeta> | null>(null);
  const rotation = useSharedValue(initialRotationDeg);
  const isSpinning = useSharedValue(false);
  const confettiProgress = useSharedValue(1);

  const shouldAllowGesture = flickEnabled ?? allowGestureSpin;

  const sectorGeometry = useMemo(() => {
    validateSegments(segments as WheelSegment[]);
    return buildSectorGeometry(segments as WheelSegment[]);
  }, [segments]);

  const radius = size / 2;
  const innerRadius = radius * innerRadiusRatio;
  const confettiConfig = useMemo(() => normalizeConfettiOptions(confettiOnWin), [confettiOnWin]);
  const confettiOrigin = useMemo(() => {
    if (pointerPosition === "right") {
      return { x: size - 10, y: size / 2 };
    }
    if (pointerPosition === "bottom") {
      return { x: size / 2, y: size - 10 };
    }
    if (pointerPosition === "left") {
      return { x: 10, y: size / 2 };
    }
    return { x: size / 2, y: 10 };
  }, [pointerPosition, size]);
  const confettiPieces = useMemo(() => {
    if (!confettiConfig) {
      return [];
    }

    const baseAngleByPointer: Record<"top" | "right" | "bottom" | "left", number> = {
      top: -90,
      right: 0,
      bottom: 90,
      left: 180,
    };
    const baseAngle = baseAngleByPointer[pointerPosition];
    const sweep = 95;
    const pieces: ConfettiPieceModel[] = [];

    for (let index = 0; index < confettiConfig.pieceCount; index += 1) {
      const ratio = index / confettiConfig.pieceCount;
      const jitter = ((index * 37) % 17) - 8;
      const angleDeg = baseAngle - sweep / 2 + sweep * ratio + jitter;
      const angleRad = (angleDeg * Math.PI) / 180;
      const speed = 180 + ((index * 53) % 120);
      pieces.push({
        id: `confetti-${index}`,
        originX: confettiOrigin.x,
        originY: confettiOrigin.y,
        velocityX: Math.cos(angleRad) * speed,
        velocityY: Math.sin(angleRad) * speed,
        gravity: 340 + ((index * 29) % 220),
        delay: Math.min(0.24, ((index * 23) % 100) / 430),
        size: confettiConfig.size + ((index * 17) % 5),
        spinDeg: 180 + ((index * 73) % 360),
        color: confettiConfig.colors[index % confettiConfig.colors.length],
      });
    }

    return pieces;
  }, [confettiConfig, confettiOrigin.x, confettiOrigin.y, pointerPosition]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const handleSpinComplete = useCallback(
    (winnerIndex: number, finalAngleDeg: number, durationMs: number, resolve: (result: SpinResult<TMeta>) => void) => {
      const result: SpinResult<TMeta> = {
        winner: segments[winnerIndex],
        winnerIndex,
        finalAngleDeg,
        durationMs,
      };

      isSpinningRef.current = false;
      isSpinning.value = false;
      lastResultRef.current = result;
      if (confettiConfig) {
        cancelAnimation(confettiProgress);
        confettiProgress.value = 0;
        confettiProgress.value = withTiming(1, {
          duration: confettiConfig.durationMs,
          easing: Easing.out(Easing.quad),
        });
      }
      AccessibilityInfo.announceForAccessibility?.(
        `Spin complete. Winner is ${String(result.winner.label)}.`
      );
      onSpinEnd?.({ ...result, timestamp: Date.now() });
      resolve(result);
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
          });

          rotation.value = withTiming(
            plan.toDeg,
            {
              duration: plan.durationMs,
              easing: Easing.out(Easing.cubic),
            },
            (finished?: boolean) => {
              if (!finished) {
                isSpinning.value = false;
                return;
              }
              isSpinning.value = false;
              runOnJS(handleSpinComplete)(winnerIndex, plan.toDeg, plan.durationMs, resolve);
            }
          );
        } catch (err) {
          isSpinningRef.current = false;
          isSpinning.value = false;
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
    ]
  );

  const reset = useCallback(
    (opts?: { animated?: boolean }) => {
      const animated = opts?.animated ?? false;
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
    },
    [confettiProgress, initialRotationDeg, isSpinning, rotation]
  );

  const stop = useCallback(() => {
    cancelAnimation(rotation);
    isSpinningRef.current = false;
    isSpinning.value = false;
  }, [isSpinning, rotation]);

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

  const pointerStyle: ViewStyle = useMemo(() => {
    if (pointerPosition === "right") {
      return { right: -4, top: size / 2 - 10, transform: [{ rotate: "90deg" }] };
    }
    if (pointerPosition === "bottom") {
      return { bottom: -4, left: size / 2 - 10, transform: [{ rotate: "180deg" }] };
    }
    if (pointerPosition === "left") {
      return { left: -4, top: size / 2 - 10, transform: [{ rotate: "270deg" }] };
    }
    return { top: -4, left: size / 2 - 10 };
  }, [pointerPosition, size]);

  const wheelNode = (
    <View style={{ width: size, height: size }}>
      <AnimatedView style={[styles.wheel, animatedStyle]}>
        <Svg width={size} height={size}>
          <G>
            {sectorGeometry.map((sector) => {
              const path = buildSectorPath(
                radius,
                radius,
                radius,
                sector.startDeg,
                sector.endDeg,
                innerRadius
              );

              const labelRadius = innerRadius > 0 ? (radius + innerRadius) / 2 : radius * 0.62;
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
                    fill={sector.segment.color ?? defaultSegmentColor(sector.index)}
                    stroke="rgba(250, 246, 240, 0.92)"
                    strokeWidth={2}
                  />
                  {!renderSegmentLabel ? (
                    (() => {
                      const tangentRotation = sector.centerDeg + 90;
                      const normalizedTangent = ((tangentRotation % 360) + 360) % 360;
                      const uprightRotation =
                        normalizedTangent > 90 && normalizedTangent < 270
                          ? tangentRotation + 180
                          : tangentRotation;

                      return (
                    <SectorLabel
                      x={labelPoint.x}
                      y={labelPoint.y}
                      text={String(sector.segment.label)}
                      fill={sector.segment.textColor ?? "#1A1A1A"}
                      baseRotationDeg={uprightRotation}
                      rotation={rotation}
                    />
                      );
                    })()
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
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth={2}
            />
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

      {renderCenterContent ? (
        <View style={[styles.centerContent, { width: size, height: size }]}>{renderCenterContent()}</View>
      ) : null}

      <View style={[styles.pointerWrapper, pointerStyle]}>
        {renderPointer ? renderPointer() : defaultPointer()}
      </View>

      {confettiConfig ? (
        <View pointerEvents="none" style={styles.confettiLayer}>
          {confettiPieces.map((piece) => (
            <ConfettiPiece key={piece.id} piece={piece} progress={confettiProgress} />
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
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
  );
};

export const SpinWheel = forwardRef(SpinWheelInner) as <TMeta>(
  props: SpinWheelProps<TMeta> & { ref?: React.Ref<SpinWheelRef<TMeta>> }
) => React.ReactElement;

const styles = StyleSheet.create({
  wheel: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
    overflow: "hidden",
    shadowColor: "#0B0D12",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
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
  confettiLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  confettiPiece: {
    position: "absolute",
    borderRadius: 2,
  },
});
