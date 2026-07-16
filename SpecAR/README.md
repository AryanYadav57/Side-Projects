# SpecAR

SpecAR is an Expo React Native app for uploading furniture dimensions from a CSV/JSON quotation file, previewing a generated 3D table, and placing it over a live camera view with manual gestures.

## Current Status

- Targets Android and iOS through Expo React Native.
- Current recommended testing path: Android with Expo Go.
- iOS Expo Go may reject the project if the installed Expo Go runtime does not support Expo SDK 57 yet.
- True AR plane detection is not implemented yet; the current AR screen is a camera overlay with manual drag, pinch, and twist controls.
- Saved projects persist locally on the device.

## Requirements

- Node.js compatible with Expo SDK 57. Expo SDK 57 expects Node 22.13.x or newer.
- npm
- Android phone with Expo Go, or Android Studio emulator

## Install

```powershell
cd E:\ARYAN\internship2\SpecAR2
npm install
```

## Verify Before Running

```powershell
npm run verify
```

This runs:

- TypeScript check
- Parser and store tests
- Expo Doctor

## Run On Android

### Physical Android Phone

1. Install Expo Go from the Play Store.
2. Connect phone and laptop to the same Wi-Fi.
3. Start the project:

```powershell
npx expo start --lan
```

4. Scan the QR code with Expo Go.

If LAN does not connect:

```powershell
npx expo start --tunnel
```

### Android Emulator

1. Start an Android emulator from Android Studio.
2. Run:

```powershell
npx expo start --android
```

## Android Preview Build For Friends

For friends who only want to install and test the app, use an EAS Android preview APK.

First log in and configure EAS if needed:

```powershell
npx eas-cli login
npx eas-cli build:configure
```

Then create an internal Android APK:

```powershell
npx eas-cli build --platform android --profile preview
```

When the build finishes, share the APK/install link from EAS.

## Run On iOS

```powershell
npx expo start --ios
```

Note: iOS Expo Go may show an SDK incompatibility message for SDK 57. See `EXPO_GO_COMPATIBILITY_PLAN.md` for the older downgrade plan. For serious iOS testing, prefer an EAS development build.

## Useful Commands

```powershell
npm run typecheck
npm test
npm run doctor
npm run verify
npx expo start --lan
npx expo start --tunnel
npx expo start --android
npx eas-cli build --platform android --profile preview
```

## Sample File

Use `assets/sample_table.csv` as the expected CSV shape:

```csv
field,value,unit
length,120,cm
width,60,cm
height,75,cm
top_thickness,4,cm
leg_thickness,5,cm
leg_style,square,
```

## Main App Flow

1. Open the app.
2. Tap `+ New Project`.
3. Upload a CSV or JSON file.
4. Confirm detected dimensions.
5. View the 3D preview.
6. Open the camera overlay.
7. Drag, pinch, or twist the furniture model.
8. Capture/share a screenshot.

## Known Limitations

- Saved projects persist locally, but persistence still needs manual device testing.
- The camera overlay is not true AR plane detection.
- iOS Expo Go compatibility depends on Expo Go SDK runtime support.
- EAS build profiles exist, but a real cloud build has not been run yet.

## Handoff Docs

- `work-done-doc.md` tracks completed development and next steps.
- `PRD.md` defines product requirements and acceptance criteria.
- `TECH_STACK.md` lists frameworks, libraries, storage, build tools, and key files.
- `EXPO_GO_COMPATIBILITY_PLAN.md` keeps the old iOS Expo Go downgrade plan as reference context.
