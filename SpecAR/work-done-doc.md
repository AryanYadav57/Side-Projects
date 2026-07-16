# Work Done Doc - SpecAR

Last updated: 2026-07-17

## Project Summary

SpecAR is an Expo React Native app for visualizing furniture dimensions from a quotation file. The current implementation supports Android and iOS from the same codebase because it is built with Expo and React Native.

The app flow is:

1. Open the home screen.
2. Start a new project.
3. Upload a CSV or JSON file with furniture dimensions.
4. Parse and confirm the dimensions.
5. View a 3D table preview.
6. Open a camera overlay and manually place, resize, and rotate the table.
7. Capture/share the AR-style preview.

## Phase Progress Log

### Phase 1 - Stabilize Diagnostics

Status: Completed

- Confirmed TypeScript passes.
- Confirmed Expo Doctor passes.
- Updated Expo SDK 57 patch versions to remove dependency mismatch warnings.

### Phase 2 - Add Automated Safety Checks

Status: Completed

- Added parser tests.
- Added Zustand store tests.
- Added `tsx` as a lightweight TypeScript test runner.
- Added `npm test`.
- Added `npm run verify`.

### Phase 3 - Android-First Handoff

Status: Completed

- Added `README.md`.
- Added Android-focused run instructions.
- Added LAN and tunnel scripts.
- Kept iOS Expo Go downgrade plan as reference only.

### Phase 4 - Progress Doc Updates

Status: Completed

- This document is being kept updated as work is completed.

### Phase 5 - PRD, Persistence, And Android Build Handoff

Status: Completed

- Added `PRD.md`.
- Added `TECH_STACK.md`.
- Added persistent saved-project storage with AsyncStorage.
- Added a test-safe storage adapter for Node tests.
- Added EAS build profiles in `eas.json`.
- Updated README with Android preview build instructions.

## PRD Status

`PRD.md` now exists and should be used as the product/development reference for friends continuing the project.

The original repository did not include a PRD, so this PRD was created from the implemented app behavior, current requirements, and known limitations.

## Current Tech Stack

- Framework: Expo / React Native
- Expo SDK: 57
- React: 19.2.3
- React Native: 0.86.0
- Navigation: Expo Router
- State: Zustand
- 3D rendering: Three.js, `@react-three/fiber`, `@react-three/drei`
- File parsing: PapaParse
- Device features:
  - Camera: `expo-camera`
  - File upload: `expo-document-picker`
  - File reading: `expo-file-system`
  - Media save/share: `expo-media-library`, `expo-sharing`, `react-native-view-shot`

## Current Health Status

Verified on 2026-07-17:

```powershell
npm run verify
```

Results:

- TypeScript passes.
- Parser tests pass.
- Store tests pass.
- Expo Doctor passes: `20/20 checks passed`.

Remaining warning from npm:

- `npm install` reports 11 moderate vulnerabilities from dependencies.
- I did not run `npm audit fix --force` because force fixes can introduce breaking changes.

## Android Support Status

The app already supports Android because it is an Expo React Native app.

For Android testing, use:

```powershell
cd E:\ARYAN\internship2\SpecAR2
npm install
npm run start:lan
```

Testing options:

- Android phone with Expo Go installed.
- Android emulator from Android Studio.
- Later, an EAS Android development build or APK/AAB for sharing with friends.

Convenience scripts now available:

```powershell
npm run start:lan
npm run start:tunnel
npm run android
npm run verify
```

For sharing with friends, the better long-term route is an Android build:

```powershell
npx eas-cli build --platform android --profile preview
```

This requires EAS login/setup first. `eas.json` now includes preview and development profiles.

## Files Added Or Implemented

### App Routes

- `app/_layout.tsx`
  - Sets up Expo Router stack navigation.
  - Wraps app in `GestureHandlerRootView`.
  - Hides default headers.

- `app/index.tsx`
  - Home screen.
  - Shows SpecAR branding.
  - Shows "New Project" CTA.
  - Shows recent projects from in-memory Zustand state.
  - Allows deleting saved projects.

- `app/upload.tsx`
  - File upload screen.
  - Uses Expo Document Picker.
  - Reads selected file through Expo File System.
  - Supports CSV and JSON quotation/dimension files.
  - Shows parsing guide and CSV example.
  - Shows parsed dimensions before preview.
  - Lets user name the project.

- `app/preview.tsx`
  - 3D preview screen.
  - Uses Three.js through React Three Fiber.
  - Shows table based on parsed dimensions.
  - Shows length, width, and height.
  - Provides button to open camera overlay.

- `app/ar.tsx`
  - Camera overlay screen.
  - Requests camera and media permissions.
  - Shows live camera background.
  - Renders the 3D table over the camera feed.
  - Supports gestures:
    - Drag to move table.
    - Pinch to resize.
    - Twist to rotate.
  - Shows floating dimension labels.
  - Supports screenshot capture and share/save.

### Components

- `components/Table3D.tsx`
  - Converts centimeters to meters for 3D scale.
  - Renders tabletop, edge highlight, legs, and a shadow disk.
  - Supports square legs.
  - Supports round legs using cylinder geometry.
  - Supports optional auto-rotation and external scale.

### State

- `store/useProjectStore.ts`
  - Zustand store for:
    - current dimensions
    - current project name
    - saved projects
  - Actions:
    - set current dimensions
    - clear current dimensions
    - save project
    - delete project

Current limitation:

- Saved projects now persist locally with AsyncStorage.
- Persistence passes automated store tests.
- Persistence still needs manual verification on an Android device.

- `store/projectStorage.ts`
  - Uses AsyncStorage in app runtime.
  - Uses in-memory storage in Node tests.
  - Prevents test failures from React Native storage expecting browser/native globals.

### Utilities

- `utils/parser.ts`
  - Parses CSV and JSON dimension files.
  - Supports row-per-field CSV format:

```csv
field,value,unit
length,120,cm
width,60,cm
height,75,cm
top_thickness,4,cm
leg_thickness,5,cm
leg_style,square,
```

  - Supports single-row CSV format.
  - Supports JSON with root fields or nested `dimensions`.
  - Supports units:
    - cm
    - mm
    - in / inch / inches
    - ft / feet
    - m / meter / meters
  - Converts all values to centimeters.
  - Validates required fields:
    - length
    - width
    - height
  - Defaults optional fields:
    - `top_thickness_cm`: 4
    - `leg_thickness_cm`: 5
    - `leg_style`: square

### Assets

- `assets/icon.png`
- `assets/splash-icon.png`
- `assets/favicon.png`
- Android adaptive icon assets:
  - `assets/android-icon-background.png`
  - `assets/android-icon-foreground.png`
  - `assets/android-icon-monochrome.png`
- Sample quotation file:
  - `assets/sample_table.csv`

### Documentation

- `EXPO_GO_COMPATIBILITY_PLAN.md`
  - Plan for dealing with iOS Expo Go incompatibility.
  - Explains SDK 57 vs Expo Go runtime issue.
  - Includes possible downgrade path to SDK 56/55.

- `work-done-doc.md`
  - This handoff/progress document.

- `PRD.md`
  - Product requirements document for future development.

- `TECH_STACK.md`
  - Dedicated tech stack reference for collaborators.
  - Lists platform, routing, state, storage, parsing, 3D, camera/media, testing, build tools, and key files.

- `eas.json`
  - EAS build profiles for development, preview, and production.

- `README.md`
  - Setup and run instructions.
  - Android testing path.
  - Verification commands.
  - Known limitations.

### Tests

- `tests/parser.test.ts`
  - Covers row-per-field CSV parsing.
  - Covers single-row CSV parsing.
  - Covers JSON parsing with nested `dimensions`.
  - Covers unit conversion.
  - Covers missing required field failure.
  - Covers summary formatting.

- `tests/store.test.ts`
  - Covers setting current dimensions.
  - Covers saving a project.
  - Covers saved-project state surviving a store reset.
  - Covers deleting a project.
  - Covers clearing current dimensions.

## Config Changes Completed

- `package.json`
  - Updated project dependencies for Expo SDK 57.
  - Added Expo Router, camera, document picker, file system, GL, media library, sharing, view shot, Three.js, Zustand, and React Native gesture/reanimated dependencies.
  - Added scripts:
    - `start:lan`
    - `start:tunnel`
    - `typecheck`
    - `doctor`
    - `test`
    - `verify`

- `app.json`
  - Configured app name, slug, scheme, icon, orientation, dark style, iOS bundle identifier, Android package name, Android adaptive icon, and permissions.
  - Added camera permission copy.
  - Added media/photo permission copy.
  - Added Expo config plugins.

- `index.ts`
  - Uses Expo Router entry point.

- `tsconfig.json`
  - Uses Expo TypeScript base config.
  - Enables strict TypeScript.

- `.gitignore`
  - Updated during setup.

## Things Fixed During Development

- Cleaned corrupted UI text from earlier encoding issues.
- Removed negative letter spacing from styles.
- Fixed TypeScript errors around React Native absolute-fill styles.
- Updated React Three Fiber and Drei to React 19-compatible versions.
- Added `react-native-worklets`, required by newer Reanimated/Expo SDKs.
- Fixed `expo-doctor` dependency mismatch by updating SDK 57 patch versions.
- Improved parser behavior for units and invalid data.
- Made `round` leg style visually render as round legs.
- Added lightweight automated tests using `tsx` and Node assertions.
- Added a full `npm run verify` command for future handoff safety.
- Added Android-first README instructions.
- Added persistent saved-project storage.
- Added EAS Android preview build config.
- Added PRD for GitHub/friend handoff.
- Added tech stack doc for GitHub/friend handoff.

## Known Current Issues / Limitations

### 1. iOS Expo Go Compatibility

The project targets Expo SDK 57. If the installed iOS Expo Go app does not include SDK 57 runtime support, it may show:

```txt
Project is incompatible with this version of Expo Go
```

Options:

- Test on Android first.
- Build a development client using EAS.
- Downgrade to SDK 56/55 using `EXPO_GO_COMPATIBILITY_PLAN.md`.

### 2. AR Is Not True World-Anchored AR

The current AR screen is a camera overlay with a 3D table rendered on top. It supports manual placement gestures, but it does not perform plane detection or true ARKit/ARCore world anchoring.

For true furniture placement, future work should consider:

- EAS development build.
- A native AR library.
- ARCore/ARKit integration.
- Plane detection and object anchoring.

### 3. Persistence Needs Device Verification

Saved projects now persist through AsyncStorage, but this still needs a real Android device reload test.

Manual test:

- Save a project.
- Fully reload/close the app.
- Reopen the app.
- Confirm recent project is still present.

### 4. Limited Automated Tests

Parser and store tests now exist. UI/device tests do not exist yet.

Highest-value next tests:

- Basic render tests for screens.
- Manual Android device smoke test.
- Future end-to-end tests once the app flow stabilizes.

### 5. EAS Cloud Build Not Run Yet

The project has EAS profiles, but no cloud build was started in this session.

## Recommended Next Steps

### Immediate Next Step

Test on Android instead of iOS Expo Go:

```powershell
cd E:\ARYAN\internship2\SpecAR2
npm install
npm run verify
npm run start:lan
```

If using a physical Android phone:

1. Install Expo Go from the Play Store.
2. Keep phone and laptop on same Wi-Fi.
3. Run:

```powershell
npm run start:lan
```

4. Scan the QR code with Expo Go.

If LAN fails:

```powershell
npm run start:tunnel
```

### Before Sending To Friends

Do these before sharing:

1. Test once on an Android device.
2. Verify saved-project persistence on a real Android device.
3. Decide whether friends should use:
   - Expo Go, or
   - an Android APK/dev build.
4. If sharing outside your local network, create an EAS Android preview build.

## Manual Testing Checklist

Use this checklist when someone can test on Android:

- App opens without crash.
- Home screen renders.
- New Project button opens upload screen.
- CSV guide is readable.
- File picker opens.
- Sample CSV parses correctly.
- Parsed dimensions are shown.
- Project name can be edited.
- 3D preview opens.
- Table renders with correct proportions.
- Dimension cards show correct values.
- AR/camera screen opens.
- Camera permission prompt appears.
- Camera feed appears after permission.
- Table overlay appears.
- Drag gesture moves table.
- Pinch gesture resizes table.
- Twist gesture rotates table.
- Screenshot button opens share/save flow.
- Back navigation works from all screens.
- App does not crash after returning home.

## Current Git State Note

At the time this document was created, many project files were modified or untracked. Before handing off to another developer, commit the current work:

```powershell
git status --short
git add .
git commit -m "Build SpecAR Expo prototype"
```

## Suggested Handoff Message To Friend

This is an Expo React Native project named SpecAR. It currently targets Expo SDK 57 and is intended to run on Android/iOS. iOS Expo Go may reject SDK 57 depending on the installed Expo Go runtime, so Android testing is the recommended first path. Run `npm install`, then `npx expo start --android` or `npx expo start --lan`. The core flow is upload CSV/JSON dimensions, preview a generated 3D table, then view it through a camera overlay with manual gestures.

## Source Reference

Expo SDK 57 docs were checked before dependency/code work:

- https://docs.expo.dev/versions/v57.0.0/

The docs state that Expo SDK 57 targets React Native 0.86 and React 19.2.3, and that Expo SDK packages are used to access device functionality such as camera and file APIs.
