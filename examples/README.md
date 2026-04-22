# Demo Applications

This directory contains example applications demonstrating how to use the `spin-wheel-react-native` component on both Expo and bare React Native setups.

## Quick Guide

### Expo Demo (Recommended for Quick Testing)

Easiest way to test the component on iOS/Android without native build setup.

```bash
cd examples/expo-demo
npm install
npm start
```

Then:
- Press `i` to open iOS Simulator (macOS only)
- Press `a` to open Android Emulator
- Scan QR code to test on physical device

**No native setup required!**

### Bare React Native Demo

For production-like environment with full native control.

```bash
cd examples/bare-rn-demo
npm install
npm run ios    # or npm run android
```

**Requires Xcode (iOS) or Android Studio (Android)**

## Testing on Real Devices

### Mobile Device + Expo

1. Install Expo Go app on your phone
2. From `expo-demo`, run `npm start`
3. Scan the QR code with your phone

### Mobile Device + Bare RN

1. Enable USB debugging on your device
2. From `bare-rn-demo`, run:
   - iOS: `npm run ios`
   - Android: `npm run android`

## File Structure

```
examples/
├── expo-demo/
│   ├── App.tsx          # Demo component
│   ├── package.json     # Expo dependencies
│   └── README.md        # Expo setup guide
│
└── bare-rn-demo/
    ├── App.tsx          # Demo component (same logic)
    ├── index.js         # Entry point
    ├── metro.config.js  # Metro bundler config
    ├── package.json     # Bare RN dependencies
    └── README.md        # Bare RN setup guide
```

## Comparison

| Feature | Expo | Bare RN |
|---------|------|---------|
| Setup Time | 2 minutes | 10-15 minutes |
| iOS Testing | Works on Mac | Works on Mac |
| Android Testing | Works (Android emulator or USB) | Works (Android emulator or USB) |
| Physical Devices | Built-in QR scanning | USB or WiFi debugging |
| Production Ready | Yes (with EAS Build) | Yes |
| Native Modules | Limited | Full control |

## Development Workflow

To make changes to the spin wheel component and test in either demo:

1. Edit files in `src/` (at root)
2. Build: `npm run build` (from root)
3. Reload demo app:
   - **Expo**: Press `r` twice in metro terminal (or shake device)
   - **Bare RN**: Press `r` in metro terminal (or shake device)

## Troubleshooting

### Both Demos
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear metro cache: `npm start -- --reset-cache`
- Clear build cache: Remove `dist/` and rebuild

### Expo
- See [expo-demo/README.md](./expo-demo/README.md)

### Bare React Native
- See [bare-rn-demo/README.md](./bare-rn-demo/README.md)

## Which Should I Use?

**Use Expo Demo if:**
- You want quick testing
- You're prototyping
- You don't need native module control
- You're on Windows or Linux (easier setup)

**Use Bare React Native if:**
- You need production setup
- You want native module integration
- You need full platform control
- You're experienced with React Native

## Questions?

Refer to the individual README files in each demo directory for specific setup and troubleshooting.
