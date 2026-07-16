# Tech Stack - SpecAR

Last updated: 2026-07-17

## App Platform

- Expo SDK 57
- React Native 0.86.0
- React 19.2.3
- TypeScript

## Routing And App Structure

- Expo Router
- File-based routes in `app/`
- Root layout in `app/_layout.tsx`

## State Management

- Zustand
- Zustand persist middleware
- AsyncStorage for saved project persistence

## Storage

- `@react-native-async-storage/async-storage`
- Saved projects are persisted locally on-device.
- Node tests use an in-memory storage adapter in `store/projectStorage.ts`.

## File Upload And Parsing

- `expo-document-picker`
- `expo-file-system`
- PapaParse

Supported input formats:

- CSV
- JSON

Supported units:

- cm
- mm
- inches
- feet
- meters

## 3D Rendering

- Three.js
- `@react-three/fiber`
- `@react-three/drei`
- `expo-gl`

Current 3D model:

- Simple generated table model
- Tabletop
- Edge highlight
- Square legs
- Round legs
- Ground shadow disk

## Camera And Media

- `expo-camera`
- `expo-media-library`
- `expo-sharing`
- `react-native-view-shot`

Current camera behavior:

- Live camera feed
- Manual 3D overlay
- Drag to move
- Pinch to resize
- Twist to rotate
- Screenshot/share

Important limitation:

- This is not true AR plane detection or world anchoring yet.

## Gestures And Animation

- `react-native-gesture-handler`
- `react-native-reanimated`
- `react-native-worklets`
- React Native `PanResponder` is currently used for AR overlay gestures.

## Testing And Verification

- TypeScript compiler
- Node assert
- `tsx` TypeScript test runner
- Expo Doctor

Commands:

```powershell
npm run typecheck
npm test
npm run doctor
npm run verify
```

## Build And Distribution

- Expo CLI
- EAS Build config in `eas.json`

Configured EAS profiles:

- `development`
- `preview`
- `production`

Recommended friend-testing path:

- Android physical device with Expo Go for development testing.
- EAS Android preview APK for non-developer testing.

## Key Project Files

- `app/index.tsx` - home screen
- `app/upload.tsx` - file upload and dimension confirmation
- `app/preview.tsx` - 3D preview
- `app/ar.tsx` - camera overlay
- `components/Table3D.tsx` - generated 3D furniture model
- `store/useProjectStore.ts` - app state and saved projects
- `store/projectStorage.ts` - persistence adapter
- `utils/parser.ts` - CSV/JSON dimension parser
- `tests/parser.test.ts` - parser tests
- `tests/store.test.ts` - store tests
- `PRD.md` - product requirements
- `work-done-doc.md` - development progress tracker
- `README.md` - setup and run guide
- `eas.json` - Android/iOS build profile config
