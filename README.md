# spin-wheel-react-native

A customizable React Native spin wheel component for iOS and Android with weighted winner selection, gesture spin, built-in themes, pointer bounce animation, and full-screen confetti.

## Installation

```bash
npm install spin-wheel-react-native react-native-reanimated react-native-gesture-handler react-native-svg
```

> **Expo users:** Dependencies are auto-configured. No extra setup needed.
>
> **Bare React Native:** Add `react-native-reanimated/plugin` as the last entry in `babel.config.js` plugins.

## Setup

Wrap your app root with `GestureHandlerRootView`. In bare RN, also add the gesture handler import to the top of your entry file.

```tsx
// index.js (bare RN only)
import "react-native-gesture-handler";
```

```tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* your app */}
    </GestureHandlerRootView>
  );
}
```

## Usage

```tsx
import React, { useRef } from "react";
import { Pressable, Text } from "react-native";
import { SpinWheel, type SpinWheelRef } from "spin-wheel-react-native";

const segments = [
  { id: "coins-10", label: "10 Coins", weight: 4 },
  { id: "coins-50", label: "50 Coins", weight: 2 },
  { id: "coins-100", label: "100 Coins", weight: 1 },
  { id: "retry",    label: "Retry",     weight: 3 },
  { id: "gift",     label: "Gift",      weight: 1 },
  { id: "bonus",    label: "Bonus",     weight: 1 },
];

export default function GameScreen() {
  const wheelRef = useRef<SpinWheelRef>(null);

  return (
    <>
      <SpinWheel
        ref={wheelRef}
        size={320}
        segments={segments}
        flickEnabled
        confettiOnWin
        onSpinEnd={(event) => console.log("Winner:", event.winner.label)}
      />

      <Pressable onPress={() => wheelRef.current?.spin()}>
        <Text>Spin</Text>
      </Pressable>
    </>
  );
}
```

## Themes

Use the `theme` prop for a zero-config styled wheel. Both themes include a built-in teardrop pointer and a center hub with a **SPIN** label.

```tsx
<SpinWheel segments={segments} theme="minimal" />
<SpinWheel segments={segments} theme="sleek" />
```

| Theme | Description |
| --- | --- |
| `"minimal"` | Soft pastel palette, light borders, warm hub |
| `"sleek"` | Dark monochrome palette, sharp contrasts |

Omit `theme` for full manual control over colors.

## Props

### Core

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `segments` | `WheelSegment[]` | **required** | Wheel segments. |
| `size` | `number` | `320` | Wheel diameter in pixels. |
| `innerRadiusRatio` | `number` | `0` | Center hole as a ratio of radius (0–1). `0` = solid disc. |
| `theme` | `"minimal" \| "sleek"` | — | Built-in visual theme. |
| `pointerPosition` | `"top" \| "right" \| "bottom" \| "left"` | `"top"` | Where the pointer is anchored. |
| `initialRotationDeg` | `number` | `0` | Starting rotation angle. |
| `disabled` | `boolean` | `false` | Disables all spin interactions. |
| `allowGestureSpin` | `boolean` | `true` | Enables pan/flick gesture. |
| `flickEnabled` | `boolean` | — | Enables velocity-based flick to spin. |
| `lockWhileSpinning` | `boolean` | `true` | Prevents re-spin while animating. |
| `spinDirection` | `"clockwise" \| "counterclockwise"` | `"clockwise"` | Spin direction. |

### Visual

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `segmentStrokeColor` | `string` | — | Color of divider lines between segments. |
| `segmentStrokeWidth` | `number` | — | Width of divider lines. |
| `outerBorderColor` | `string` | — | Outer ring border color. |
| `outerBorderWidth` | `number` | — | Outer ring border width. |
| `labelFontSize` | `number` | `12` | Base font size for segment labels. Scales down automatically to fit. |
| `labelFontWeight` | `string` | `"700"` | Font weight for segment labels. |
| `disabledSegmentOpacity` | `number` | `0.4` | Opacity for segments marked `disabled: true`. |

### Behavior

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `idleRotationSpeed` | `number` | — | Constant idle spin speed (deg/s) when no spin is active. |
| `hapticFeedback` | `boolean` | — | Triggers haptic pulse when the pointer passes a segment. |
| `customEasing` | `(t: number) => number` | — | Custom easing function. Use with `easing: "custom"` in `SpinRequest`. |
| `pointerBounceEnabled` | `boolean` | `true` | Enables bounce/wobble animation on the pointer as the wheel spins. |

### Confetti

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `confettiOnWin` | `boolean \| WinnerConfettiOptions` | `false` | Plays full-screen confetti when spin completes. |

```ts
confettiOnWin={{
  durationMs: 1800,   // animation duration in ms
  pieceCount: 44,     // number of confetti pieces
  size: 8,            // base piece size in px
  colors: ["#FFD166", "#EF476F", "#06D6A0"],
}}
```

### Custom Render

| Prop | Type | Description |
| --- | --- | --- |
| `renderSegmentLabel` | `(ctx: SegmentLabelContext) => ReactNode` | Override the default label for each segment. |
| `renderCenterContent` | `() => ReactNode` | Render custom content inside the center hub. |
| `renderPointer` | `() => ReactNode` | Replace the built-in pointer with a custom component. |

### Callbacks

| Prop | Type | Description |
| --- | --- | --- |
| `onSpinStart` | `(event: SpinStartEvent) => void` | Fired when a spin begins. |
| `onSpinEnd` | `(event: SpinEndEvent) => void` | Fired when the spin animation completes with the winner. |
| `onSegmentChange` | `(segment: WheelSegment) => void` | Fired each time the pointer crosses into a new segment. |
| `onError` | `(error: WheelError) => void` | Fired on validation or runtime errors. |

## Ref Methods

```ts
wheelRef.current.spin(request?)   // start a spin; returns Promise<SpinResult>
wheelRef.current.reset()          // reset to initial rotation angle
wheelRef.current.stop()           // cancel the current animation
wheelRef.current.isSpinning()     // returns true if a spin is in progress
```

## Controlling the Winner

```ts
// Random weighted (default)
wheelRef.current?.spin();

// Seeded deterministic — same seed always picks same winner
wheelRef.current?.spin({ random: { strategy: "weighted", seed: "session-abc" } });

// Force a specific winner by id
wheelRef.current?.spin({ winnerId: "gift" });

// Force a specific winner by index
wheelRef.current?.spin({ winnerIndex: 2 });

// Custom duration and easing
wheelRef.current?.spin({ durationMs: 4000, easing: "outExpo" });
```

### SpinRequest options

```ts
type SpinRequest = {
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
};
```

## Segments

```ts
type WheelSegment<TMeta = unknown> = {
  id: string;          // unique identifier
  label: string;       // display text (auto-wrapped to 2 lines, font auto-scales to fit)
  weight?: number;     // relative probability (default 1)
  color?: string;      // segment fill color
  textColor?: string;  // label color
  metadata?: TMeta;    // your custom data, returned in SpinResult
  disabled?: boolean;  // excluded from winner selection, rendered at reduced opacity
};
```

## Text Placement

Labels are positioned at ~52% of the wheel radius (mid-slice) with no rotation — they stay horizontal and rotate naturally with the wheel. Font size scales down automatically so longer labels always fit within their slice boundary.

- Long labels are auto-wrapped to a maximum of 2 lines
- Overflow is truncated with an ellipsis (`…`)
- A 62% chord safe-zone prevents text from touching segment dividers

## TypeScript

All props, events, and ref methods are fully typed. Pass a generic `TMeta` to type the `metadata` field on segments and access it in `SpinResult`:

```tsx
type Reward = { coins: number };

const segments: WheelSegment<Reward>[] = [
  { id: "big", label: "Jackpot", metadata: { coins: 1000 } },
];

<SpinWheel<Reward>
  segments={segments}
  onSpinEnd={(e) => console.log(e.winner.metadata?.coins)}
/>
```

## License

MIT
