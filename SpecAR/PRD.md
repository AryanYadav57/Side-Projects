# Product Requirements Document - SpecAR

Last updated: 2026-07-17

## 1. Product Overview

SpecAR is a mobile app that helps users visualize furniture dimensions from quotation/specification files before purchase or installation. Users upload a CSV or JSON file containing furniture dimensions, preview a generated 3D model, then view it over their room camera with manual placement controls.

The current implementation is an Expo React Native app targeting Android and iOS from one codebase. Android is the recommended first testing platform.

## 2. Problem Statement

Furniture dimensions in quotations are difficult for non-technical users to imagine in real space. Users need a quick way to convert measurements into a visual model and compare it against their actual room.

## 3. Goals

- Let users upload a CSV or JSON quotation/specification file.
- Parse length, width, height, top thickness, leg thickness, and leg style.
- Convert common measurement units into centimeters.
- Generate a proportional 3D furniture model.
- Let users preview the furniture before opening the camera view.
- Let users manually place, resize, and rotate the model over the camera feed.
- Let users capture/share the visual preview.
- Support Android testing and handoff through GitHub.
- Keep setup simple for collaborators using `npm install` and `npm run verify`.

## 4. Non-Goals For Current Prototype

- True AR plane detection.
- Real ARCore/ARKit world anchoring.
- Multi-furniture scene planning.
- Cloud sync.
- User accounts.
- Payment or ordering.
- App Store / Play Store production submission.

## 5. Target Users

### Primary User

A customer, designer, or intern who has a furniture quotation/spec file and wants to quickly understand real-world size.

### Secondary User

A developer/tester friend who clones the GitHub repo and continues implementation or tests the app on Android.

## 6. Supported Platforms

### Current

- Android through Expo React Native.
- iOS code support exists, but Expo Go SDK runtime compatibility may block easy iOS testing.

### Recommended Testing Platform

- Android physical device with Expo Go.

### Future

- Android EAS preview build for testers.
- iOS EAS development build.

## 7. Core User Flow

1. User opens SpecAR.
2. User taps `+ New Project`.
3. User chooses a CSV or JSON file.
4. App reads and parses file contents.
5. App validates required dimensions.
6. App displays parsed values for confirmation.
7. User names/saves the project.
8. App opens 3D preview.
9. User opens camera overlay.
10. User drags, pinches, or twists the model.
11. User captures or shares a screenshot.

## 8. Functional Requirements

### 8.1 Home Screen

Status: Implemented

Requirements:

- Show app name and purpose.
- Provide new project CTA.
- Show recent saved projects.
- Let user reopen a saved project.
- Let user delete a saved project.

Acceptance criteria:

- Tapping `+ New Project` opens upload screen.
- Saved project list renders when projects exist.
- Delete removes project from the list.

### 8.2 File Upload

Status: Implemented

Requirements:

- Let user pick a file from device storage.
- Support CSV and JSON.
- Read file contents.
- Show parsing progress.
- Show parse errors.
- Show successful parsed dimensions.

Acceptance criteria:

- User can pick a CSV file.
- User can pick a JSON file.
- Invalid files show readable errors.
- Valid files move to confirmation state.

### 8.3 Dimension Parser

Status: Implemented with tests

Required fields:

- `length`
- `width`
- `height`

Optional fields:

- `top_thickness`
- `leg_thickness`
- `leg_style`

Supported units:

- `cm`
- `mm`
- `in`, `inch`, `inches`
- `ft`, `feet`
- `m`, `meter`, `meters`

Supported CSV format 1:

```csv
field,value,unit
length,120,cm
width,60,cm
height,75,cm
top_thickness,4,cm
leg_thickness,5,cm
leg_style,square,
```

Supported CSV format 2:

```csv
length,width,height,top_thickness,leg_thickness,leg_style
120cm,60cm,75cm,4cm,5cm,square
```

Supported JSON format:

```json
{
  "dimensions": {
    "length_cm": 120,
    "width_cm": 60,
    "height_cm": 75,
    "top_thickness_cm": 4,
    "leg_thickness_cm": 5,
    "leg_style": "square"
  }
}
```

Acceptance criteria:

- Missing required fields fail.
- Invalid numbers fail.
- Units convert to centimeters.
- Round and square leg styles are supported.

### 8.4 Dimension Confirmation

Status: Implemented

Requirements:

- Show parsed dimensions before preview.
- Let user edit project name.
- Save project.
- Continue to 3D preview.

Acceptance criteria:

- User sees length, width, height, top thickness, leg thickness, and leg style.
- User can change project name.
- Confirm opens preview screen.

### 8.5 3D Preview

Status: Implemented

Requirements:

- Render table model from parsed dimensions.
- Show tabletop and legs.
- Support square and round leg styles.
- Show dimension summary.
- Provide navigation to camera overlay.

Acceptance criteria:

- Model renders without TypeScript errors.
- Model proportions reflect parsed dimensions.
- Round legs render as cylinders.
- Square legs render as boxes.

### 8.6 Camera Overlay

Status: Implemented as manual overlay

Requirements:

- Request camera permission.
- Show live camera feed.
- Render 3D furniture over camera feed.
- Support manual transform controls:
  - drag to move
  - pinch to resize
  - twist to rotate
- Show dimension labels.
- Capture/share screenshot.

Acceptance criteria:

- Camera permission flow works.
- Camera view opens after permission.
- Model appears over camera feed.
- Gestures update model placement.
- Screenshot/share action runs.

### 8.7 Saved Project Persistence

Status: Implemented, needs device verification

Requirements:

- Saved projects should remain after app reload.
- Current project may reset, but saved projects should persist.

Acceptance criteria:

- Save a project.
- Reload app.
- Project still appears in recent projects.
- Delete persists after reload.

### 8.8 Android Testing / Sharing

Status: Partially implemented

Requirements:

- Project should run through Expo Go on Android.
- Repo should include setup instructions.
- Repo should include verification command.
- Include EAS preview build profile for non-developer testers.

Acceptance criteria:

- `npm install` works.
- `npm run verify` passes.
- `npm run start:lan` starts Expo.
- Android tester can open app through Expo Go.
- `eas.json` includes Android preview APK profile.

## 9. Non-Functional Requirements

### Reliability

- Parser should not crash on bad input.
- App should show user-facing errors for invalid files.
- Verification command should catch common regressions.

### Maintainability

- Keep app structure simple:
  - `app/` for routes
  - `components/` for UI/3D components
  - `store/` for state
  - `utils/` for parsing
  - `tests/` for automated checks

### Performance

- 3D model should be simple enough for mid-range Android devices.
- Avoid large assets or complex scene geometry in prototype.

### Privacy

- Uploaded files are read locally.
- No backend or cloud upload exists.
- Camera is used locally for preview.

## 10. Current Test Coverage

Automated:

- Parser tests.
- Store tests.
- TypeScript check.
- Expo Doctor.

Manual still needed:

- Android physical device smoke test.
- Camera permission test.
- File picker test.
- 3D preview visual test.
- Screenshot/share test.

## 11. Known Risks

- iOS Expo Go may reject SDK 57.
- Current AR is not true world anchoring.
- Camera/GL behavior must be verified on real Android hardware.
- EAS build profiles exist, but no cloud build has been run in this session.
- npm audit reports moderate dependency vulnerabilities.

## 12. Release / Handoff Criteria

For GitHub developer handoff:

- `README.md` exists.
- `PRD.md` exists.
- `work-done-doc.md` exists.
- `npm run verify` passes.
- Current work is committed.

For friend testing:

- Android device smoke test passes.
- Saved project persistence works.
- Clear test instructions are included.
- Optional: Android EAS preview build is available.

For production:

- True AR anchoring decision made.
- Device test matrix completed.
- Privacy policy written.
- Store metadata created.
- App signing/build pipeline configured.
