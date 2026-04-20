import React, { useRef } from "react";
import { SafeAreaView, StyleSheet, Text, View, Pressable } from "react-native";
import { SpinWheel, type SpinWheelRef } from "@acme/wheel-react-native";

const segments = [
  { id: "coins-10", label: "10 Coins", weight: 4 },
  { id: "coins-50", label: "50 Coins", weight: 2 },
  { id: "coins-100", label: "100 Coins", weight: 1 },
  { id: "retry", label: "Retry", weight: 3 },
  { id: "gift", label: "Gift", weight: 1 },
  { id: "bonus", label: "Bonus", weight: 1 },
];

export default function App() {
  const wheelRef = useRef<SpinWheelRef>(null);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Spin Wheel Demo</Text>
      <View style={styles.container}>
        <SpinWheel
          ref={wheelRef}
          size={320}
          segments={segments}
          allowGestureSpin
          flickEnabled
          onSpinEnd={(event) => {
            console.log("Winner:", event.winner.label);
          }}
        />
      </View>

      <Pressable
        style={styles.button}
        onPress={() => {
          void wheelRef.current?.spin({ random: { strategy: "weighted", seed: "demo-seed" } });
        }}
      >
        <Text style={styles.buttonText}>Spin</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4EFE6",
    paddingTop: 16,
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#2F2A24",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    marginHorizontal: 24,
    marginBottom: 28,
    borderRadius: 999,
    backgroundColor: "#0D5C63",
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
