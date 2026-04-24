# spin-wheel-react-native

A customizable React Native spin wheel component for iOS and Android with weighted winner selection, gesture spin, and optional confetti.

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

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `segments` | `WheelSegment[]` | required | Wheel segments. |
| `size` | `number` | `320` | Wheel diameter in pixels. |
| `innerRadiusRatio` | `number` | `0` | Center hole size as a ratio of radius (0–1). |
| `pointerPosition` | `"top" \| "right" \| "bottom" \| "left"` | `"top"` | Where the pointer is anchored. |
| `initialRotationDeg` | `number` | `0` | Starting rotation angle. |
| `disabled` | `boolean` | `false` | Disables all spin interactions. |
| `allowGestureSpin` | `boolean` | `true` | Enables pan gesture detection. |
| `flickEnabled` | `boolean` | — | Enables velocity-based flick to spin. |
| `lockWhileSpinning` | `boolean` | `true` | Prevents re-spin while animating. |
| `confettiOnWin` | `boolean \| WinnerConfettiOptions` | `false` | Plays confetti on spin complete. |
| `renderSegmentLabel` | `(ctx) => ReactNode` | — | Custom label renderer per segment. |
| `renderCenterContent` | `() => ReactNode` | — | Custom center overlay. |
| `renderPointer` | `() => ReactNode` | — | Custom pointer renderer. |
| `onSpinStart` | `(event) => void` | — | Fired when a spin begins. |
| `onSpinEnd` | `(event) => void` | — | Fired when spin animation completes. |
| `onError` | `(error) => void` | — | Fired on validation or runtime errors. |

## Ref Methods

```ts
wheelRef.current.spin(request?)   // starts spin, returns Promise<SpinResult>
wheelRef.current.reset()          // resets to initial angle
wheelRef.current.stop()           // cancels current animation
wheelRef.current.isSpinning()     // returns boolean
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
```

## Segments

```ts
type WheelSegment<TMeta = unknown> = {
  id: string;          // unique identifier
  label: string;       // display text
  weight?: number;     // relative probability (default 1)
  color?: string;      // segment fill color
  textColor?: string;  // label color
  metadata?: TMeta;    // your custom data, returned in SpinResult
  disabled?: boolean;  // excluded from winner selection
};
```

## Confetti Options

Pass `confettiOnWin` as `true` for defaults, or pass an options object:

```ts
confettiOnWin={{
  durationMs: 1800,   // animation duration
  pieceCount: 44,     // number of pieces
  size: 8,            // base piece size in px
  colors: ["#FFD166", "#EF476F", "#06D6A0"],
}}
```

## License

MIT
