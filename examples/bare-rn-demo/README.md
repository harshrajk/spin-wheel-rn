# Bare React Native Demo

A bare React Native example of the spin wheel component running on iOS and Android without Expo.

## Prerequisites

- Node.js 18+
- Xcode (for iOS) or Android Studio (for Android)
- Ruby 2.7+ (for iOS dependencies)
- CocoaPods (for iOS dependencies)

## Setup

```bash
npm install
```

## Build & Run

### iOS

```bash
npm run ios
```

Or manually:
```bash
npm start
# In another terminal:
xcode-select --install  # if needed
npm run ios
```

### Android

```bash
npm run android
```

Make sure you have an Android emulator running or a device connected via USB with debugging enabled.

## Development

After making changes to the spin wheel package:

```bash
# Terminal 1: Start metro bundler
npm start

# Terminal 2: Run on iOS
npm run ios

# Or run on Android
npm run android
```

Hot reload is enabled by default - press `r` twice or shake device to reload.

## Troubleshooting

### iOS build issues
```bash
cd ios
pod install
cd ..
npm run ios
```

### Android build issues
Make sure `ANDROID_HOME` is set:
```bash
export ANDROID_HOME=/Users/$(whoami)/Library/Android/sdk
npm run android
```

### Metro bundler issues
Clear cache and restart:
```bash
npm start -- --reset-cache
```

## License

MIT
