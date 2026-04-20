# Spin Wheel Roulette Monorepo

This workspace is scaffolded from the requirements in `spinwheel_design.md`.

## Packages

- `packages/wheel-core`: Pure TypeScript logic (geometry, selection, deterministic RNG, rotation planner).
- `packages/wheel-react-native`: React Native UI component with Reanimated and optional flick gesture.
- `apps/demo-expo`: Placeholder app for integration examples.

## Quick Start

```bash
npm install
npm run build
npm run test
```

## Publish (package-level)

From each package:

```bash
npm publish --access public
```
