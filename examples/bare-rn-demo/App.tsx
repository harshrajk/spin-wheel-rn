import React, { useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SpinWheel, type SpinWheelRef, type WheelSegment, type WheelTheme } from "../../src";

// Segments without explicit colors → theme palette takes over
const themedSegments: WheelSegment[] = [
  { id: "s1", label: "10% OFF", weight: 4 },
  { id: "s2", label: "Free\nShipping", weight: 3 },
  { id: "s3", label: "20% OFF", weight: 2 },
  { id: "s4", label: "Better Luck\nNext Time", weight: 5, disableConfetti: true },
  { id: "s5", label: "5% OFF", weight: 3 },
  { id: "s6", label: "15% OFF", weight: 2 },
];

// Segments with explicit colors for the "no theme" fallback
const coloredSegments: WheelSegment[] = [
  { id: "c1", label: "10 Coins", weight: 4, color: "#EE6C4D" },
  { id: "c2", label: "50 Coins", weight: 2, color: "#2A9D8F" },
  { id: "c3", label: "100 Coins", weight: 1, color: "#E9C46A" },
  { id: "c4", label: "Retry", weight: 3, color: "#3A86FF" },
  { id: "c5", label: "Gift", weight: 1, color: "#8338EC" },
  { id: "c6", label: "Bonus", weight: 1, color: "#F15BB5" },
];

const THEMES: { label: string; value: WheelTheme | undefined }[] = [
  { label: "Default", value: undefined },
  { label: "Minimal", value: "minimal" },
  { label: "Sleek", value: "sleek" },
];

export default function App() {
  const wheelRef = useRef<SpinWheelRef>(null);
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const [currentSegment, setCurrentSegment] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<WheelTheme | undefined>("minimal");
  const [haptics, setHaptics] = useState(false);
  const [bounceEnabled, setBounceEnabled] = useState(true);

  const isThemed = activeTheme !== undefined;
  const segments = isThemed ? themedSegments : coloredSegments;
  const bg = activeTheme === "sleek" ? "#111111" : "#F4EFE6";
  const textColor = activeTheme === "sleek" ? "#FFFFFF" : "#1A1A1A";
  const subColor = activeTheme === "sleek" ? "#999999" : "#555555";
  const btnBg = activeTheme === "sleek" ? "#333333" : "#1A1A1A";
  const btnBorderColor = activeTheme === "sleek" ? "#555555" : "#1A1A1A";

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: textColor }]}>Spin Wheel Demo</Text>

          {/* Theme selector */}
          <View style={styles.themeRow}>
            {THEMES.map((t) => {
              const active = activeTheme === t.value;
              return (
                <Pressable
                  key={String(t.value)}
                  style={[
                    styles.themeBtn,
                    { borderColor: btnBorderColor },
                    active && { backgroundColor: btnBg },
                  ]}
                  onPress={() => {
                    setLastWinner(null);
                    setCurrentSegment(null);
                    setActiveTheme(t.value);
                  }}
                >
                  <Text style={[styles.themeBtnText, { color: active ? "#fff" : textColor }]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Toggles */}
          <View style={styles.toggleRow}>
            <View style={styles.toggle}>
              <Text style={[styles.toggleLabel, { color: subColor }]}>Haptics</Text>
              <Switch value={haptics} onValueChange={setHaptics} />
            </View>
            <View style={styles.toggle}>
              <Text style={[styles.toggleLabel, { color: subColor }]}>Bounce</Text>
              <Switch value={bounceEnabled} onValueChange={setBounceEnabled} />
            </View>
          </View>

          {/* Ticker */}
          {currentSegment ? (
            <Text style={[styles.ticker, { color: "#3A86FF" }]}>→ {currentSegment}</Text>
          ) : (
            <View style={styles.tickerPlaceholder} />
          )}

          {/* Wheel */}
          <View style={styles.container}>
            <SpinWheel
              ref={wheelRef}
              size={300}
              segments={segments}
              theme={activeTheme}
              allowGestureSpin
              flickEnabled
              confettiOnWin
              hapticFeedback={haptics}
              pointerBounceEnabled={bounceEnabled}
              labelFontSize={11}
              disabledSegmentOpacity={0.35}
              onSegmentChange={(seg) => setCurrentSegment(String(seg.label))}
              onSpinEnd={(event) => {
                setLastWinner(String(event.winner.label));
                setCurrentSegment(null);
              }}
            />
          </View>

          {lastWinner ? (
            <Text style={[styles.winner, { color: textColor }]}>🎉 Winner: {lastWinner}</Text>
          ) : (
            <View style={{ height: 32 }} />
          )}

          <Pressable
            style={[styles.button, { backgroundColor: btnBg }]}
            onPress={() => {
              void wheelRef.current?.spin({ random: { strategy: "weighted" } });
            }}
          >
            <Text style={styles.buttonText}>Spin!</Text>
          </Pressable>

          <Pressable
            style={[styles.buttonSecondary, { borderColor: btnBorderColor }]}
            onPress={() => {
              void wheelRef.current?.stop({ settle: true });
            }}
          >
            <Text style={[styles.buttonTextSecondary, { color: textColor }]}>Stop &amp; Settle</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 14,
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  themeBtn: {
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 8,
  },
  toggle: {
    alignItems: "center",
    gap: 2,
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  ticker: {
    fontSize: 13,
    fontWeight: "600",
    height: 20,
    marginBottom: 8,
  },
  tickerPlaceholder: {
    height: 28,
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  winner: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 10,
    width: 220,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  buttonSecondary: {
    paddingVertical: 13,
    paddingHorizontal: 48,
    borderRadius: 12,
    borderWidth: 2,
    width: 220,
    alignItems: "center",
  },
  buttonTextSecondary: {
    fontWeight: "700",
    fontSize: 16,
  },
});
