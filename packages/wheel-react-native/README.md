# spin-wheel-react-native

React Native spin wheel component for Android and iOS.

## Install

```bash
npm install spin-wheel-react-native react-native-reanimated react-native-gesture-handler react-native-svg
```

## Usage

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
          void ref.current?.spin({ random: { strategy: "weighted", seed: "session-42" } });
        }}
      />
    </View>
  );
}
```

## Gesture flick prop

- `allowGestureSpin`: enables gesture-triggered spin behavior.
- `flickEnabled`: optional explicit flick toggle (overrides `allowGestureSpin` when set).
