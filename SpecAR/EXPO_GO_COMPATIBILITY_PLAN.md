# Expo Go Compatibility Downgrade Plan

## Problem

The app currently targets Expo SDK 57:

- `expo`: `~57.0.4`
- `react`: `19.2.3`
- `react-native`: `0.86.0`

When opened in Expo Go on iOS, Expo Go shows:

> Project is incompatible with this version of Expo Go

This means the installed Expo Go app does not include the native runtime required by SDK 57 yet. The quickest workaround is to downgrade the project to an SDK version supported by the current Expo Go app.

## Goal

Make the app runnable in Expo Go on the iPhone without requiring an EAS development build.

## Recommended Target

Start with **Expo SDK 56**.

If Expo Go still rejects the app, downgrade one step further to **SDK 55**. Avoid going all the way back to SDK 51 unless necessary, because that is a much older stack and may require more code/package changes.

## Estimated Time

Expected time: **10-20 minutes** if SDK 56 works cleanly.

Possible extra time: **10-30 minutes** if `@react-three/fiber`, `@react-three/drei`, or native module versions need adjustment.

## Current State To Preserve

Do not lose these app features while downgrading:

- Expo Router screens in `app/`
- File upload via `expo-document-picker`
- CSV/JSON parsing via `utils/parser.ts`
- 3D preview via `@react-three/fiber` and `three`
- Camera AR overlay via `expo-camera`
- Screenshot/share flow via `react-native-view-shot`, `expo-sharing`, and `expo-media-library`

## Step 1: Confirm Current State

From the project root:

```powershell
cd E:\ARYAN\internship2\SpecAR2
git status --short
npx expo-doctor
npx tsc --noEmit
```

Expected before downgrading:

- `expo-doctor` passes for SDK 57.
- TypeScript passes.
- Expo Go still rejects the app on iOS.

## Step 2: Create A Safety Branch

```powershell
git checkout -b codex/expo-go-sdk56-downgrade
```

If there are uncommitted changes, either commit them first or keep careful track of the working tree.

## Step 3: Downgrade Expo Core Packages

Try SDK 56 first:

```powershell
npx expo install expo@~56.0.0 react@19.2.3 react-native@0.85.0
```

Then let Expo pin compatible package versions:

```powershell
npx expo install --fix
```

Why this matters:

- Expo SDK 56 pairs with React Native 0.85.
- Expo CLI knows the correct compatible versions for Expo packages like `expo-camera`, `expo-router`, `expo-file-system`, etc.

## Step 4: Fix React Three Package Compatibility If Needed

If npm reports peer dependency conflicts around React, React Native, or Three.js, check current package compatibility:

```powershell
npm view @react-three/fiber version peerDependencies --json
npm view @react-three/drei version peerDependencies --json
```

Then install compatible versions. For SDK 56, React 19-compatible versions may still be okay:

```powershell
npm install @react-three/fiber@latest @react-three/drei@latest three@latest
npx expo install --fix
```

If latest creates problems, use the nearest versions whose peer dependencies match React 19 and the installed Three.js version.

## Step 5: Clean Install If Dependencies Get Tangled

If npm gets stuck with old peer resolutions, do a clean install:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npx expo install --fix
```

Only do this from:

```txt
E:\ARYAN\internship2\SpecAR2
```

## Step 6: Verify Project Health

Run:

```powershell
npx expo-doctor
npx tsc --noEmit
```

Expected:

- `expo-doctor` passes.
- TypeScript passes.

If TypeScript fails, fix source-level API/type changes before testing on device.

## Step 7: Start Expo For iPhone Testing

Use LAN first:

```powershell
npx expo start --lan
```

Then scan the QR code with the iPhone camera or Expo Go.

If LAN fails, try tunnel:

```powershell
npx expo start --tunnel
```

## Step 8: If SDK 56 Still Fails In Expo Go

Downgrade one more level to SDK 55:

```powershell
npx expo install expo@~55.0.0
npx expo install --fix
npx expo-doctor
npx tsc --noEmit
npx expo start --lan
```

If SDK 55 also fails, check the Expo Go app version/runtime support and consider either:

- downgrading further, or
- switching to an EAS development build instead of Expo Go.

## Device Test Checklist

Once the app opens in Expo Go, test:

- Home screen loads.
- Upload screen opens.
- `assets/sample_table.csv` parses correctly when uploaded.
- 3D preview renders the table.
- Preview gestures work.
- AR screen asks for camera permission.
- Camera view opens.
- Table overlay appears.
- Drag, pinch, and rotate gestures work.
- Screenshot/share button works.

## Known Tradeoff

This plan optimizes for quick Expo Go testing. It may temporarily move the app away from the newest SDK 57 stack.

For production-quality iOS testing, the better long-term option is an EAS development build:

```powershell
eas build --profile development --platform ios
npx expo start --dev-client
```

## Done Criteria

This task is complete when:

- The app opens in Expo Go on the iPhone.
- `npx expo-doctor` passes.
- `npx tsc --noEmit` passes.
- Core upload, preview, camera overlay, and screenshot flows are manually tested.
