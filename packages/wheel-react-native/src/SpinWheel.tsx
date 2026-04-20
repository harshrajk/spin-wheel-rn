import {
  buildSectorGeometry,
  planRotation,
  resolveWinnerIndex,
  validateSegments,
  type SpinRequest,
  type SpinResult,
  type WheelSegment,
} from "spin-wheel-core";
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import type { SegmentLabelContext, SpinWheelProps, SpinWheelRef } from "./types";

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

function defaultSegmentColor(index: number): string {
  const palette = ["#FF7A59", "#00A6A6", "#F4B400", "#1976D2", "#6B8E23", "#F06292"];
  return palette[index % palette.length];
}

function defaultPointer() {
  return <View style={styles.pointer} />;
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
    onSpinStart,
    onSpinEnd,
    onError,
  }: SpinWheelProps<TMeta>,
  ref: React.ForwardedRef<SpinWheelRef<TMeta>>
) => {
  const isSpinningRef = useRef(false);
  const lastResultRef = useRef<SpinResult<TMeta> | null>(null);
  const rotation = useSharedValue(initialRotationDeg);

  const shouldAllowGesture = flickEnabled ?? allowGestureSpin;

  const sectorGeometry = useMemo(() => {
    validateSegments(segments as WheelSegment[]);
    return buildSectorGeometry(segments as WheelSegment[]);
  }, [segments]);

  const radius = size / 2;
  const innerRadius = radius * innerRadiusRatio;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

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
            (finished) => {
              if (!finished) {
                return;
              }

              const result: SpinResult<TMeta> = {
                winner: segments[winnerIndex],
                winnerIndex,
                finalAngleDeg: plan.toDeg,
                durationMs: plan.durationMs,
              };

              runOnJS(() => {
                isSpinningRef.current = false;
                lastResultRef.current = result;
                AccessibilityInfo.announceForAccessibility?.(
                  `Spin complete. Winner is ${String(result.winner.label)}.`
                );
                onSpinEnd?.({ ...result, timestamp: Date.now() });
                resolve(result);
              })();
            }
          );
        } catch (err) {
          isSpinningRef.current = false;
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
      lastResultRef.current = null;
    },
    [initialRotationDeg, rotation]
  );

  const stop = useCallback(() => {
    cancelAnimation(rotation);
    isSpinningRef.current = false;
  }, [rotation]);

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
    return Gesture.Pan().onEnd((event) => {
      if (!shouldAllowGesture || disabled || (lockWhileSpinning && isSpinningRef.current)) {
        return;
      }

      const velocity = Math.hypot(event.velocityX, event.velocityY);
      if (velocity < 400) {
        return;
      }

      const durationMs = Math.max(2200, Math.min(5000, 5500 - velocity));
      runOnJS(spin)({ durationMs });
    });
  }, [disabled, lockWhileSpinning, shouldAllowGesture, spin]);

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
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                  {!renderSegmentLabel ? (
                    <SvgText
                      x={labelPoint.x}
                      y={labelPoint.y}
                      textAnchor="middle"
                      fontSize={12}
                      fill={sector.segment.textColor ?? "#1A1A1A"}
                    >
                      {String(sector.segment.label)}
                    </SvgText>
                  ) : (
                    <G>
                      {/* Custom label rendering can be projected by parent via overlay components. */}
                      {renderSegmentLabel(labelCtx) as any}
                    </G>
                  )}
                </React.Fragment>
              );
            })}

            {innerRadius > 0 ? <Circle cx={radius} cy={radius} r={innerRadius} fill="#FFFFFF" /> : null}
          </G>
        </Svg>
      </AnimatedView>

      {renderCenterContent ? (
        <View style={[styles.centerContent, { width: size, height: size }]}>{renderCenterContent()}</View>
      ) : null}

      <View style={[styles.pointerWrapper, pointerStyle]}>
        {renderPointer ? renderPointer() : defaultPointer()}
      </View>
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
  },
  pointerWrapper: {
    position: "absolute",
    zIndex: 5,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 18,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#222222",
  },
  centerContent: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
  },
});
