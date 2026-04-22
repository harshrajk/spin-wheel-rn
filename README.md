# spin-wheel-react-native

A highly customizable React Native spin wheel component for iOS and Android.

## Features

- 🎡 Deterministic winner selection with weighted segments
- 🎨 Fully customizable styling and rendering
- 📱 Works on iOS and Android
- ⚡ Smooth animations powered by React Native Reanimated
- 👆 Touch gestures with optional flick-to-spin
- 🔧 TypeScript support

## Install

```bash
npm install spin-wheel-react-native react-native-reanimated react-native-gesture-handler react-native-svg
```

## Quick Start

```tsx
import React, { useRef } from "react";
import { Button, View } from "react-native";
import { SpinWheel, type SpinWheelRef } from "spin-wheel-react-native";

export function Example() {
  const ref = useRef<SpinWheelRef>(null);

  return (
    <View>
      <SpinWheel
        ref={ref}
        segments={[
          { id: "1", label: "10 Coins", weight: 1 },
          { id: "2", label: "Try Again", weight: 3 },
          { id: "3", label: "50 Coins", weight: 1 },
          { id: "4", label: "Bonus", weight: 1 }
        ]}
        allowGestureSpin
        flickEnabled
        onSpinEnd={(event) => {
          console.log("Winner:", event.winner.label);
        }}
      />

      <Button
        title="Spin"
        onPress={() => {
          void ref.current?.spin({ random: { strategy: "weighted" } });
        }}
      />
    </View>
  );
}
```

## Core Exports

The package exports core logic utilities for server-side winner calculation:

```tsx
import {
  resolveWinnerIndex,
  planRotation,
  validateSegments,
  type WheelSegment,
  type SpinRequest,
  type SpinResult,
} from "spin-wheel-react-native";
```

## Testing

Run tests:

```bash
npm test
```

## Development

Start the Expo demo app:

```bash


### Quick Testing with Expo

Fastest way to test on iOS/Android - no native build tools required!

```bash
npm install
npm run dev
```

Then:
- Press `i` to open iOS Simulator (macOS only)
- Press `a` to open Android Emulator
- Scan QR code to test on physical device

See [examples/expo-demo/README.md](./examples/expo-demo/README.md) for details.

### Testing with Bare React Native

For production-like environment with full native control:

```bash
cd examples/bare-rn-demo
npm install
npm run ios    # or npm run android
```

Requires Xcode (iOS) or Android Studio (Android).

See [examples/bare-rn-demo/README.md](./examples/bare-rn-demo/README.md) for setup guide.
## License

MIT


From each package:

```bash
npm publish --access public
```
