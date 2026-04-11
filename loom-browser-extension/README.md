# Loom Browser Extension

Loom is a Chrome Extension (Manifest V3) that builds a local-first knowledge graph from your browsing behavior so you can rediscover concepts, entities, and connections later.

## What Loom Does

- Captures page context after dwell-time gating (default 30 seconds).
- Extracts concepts, entities, and claims using NVIDIA-first AI with a heuristic fallback path.
- Stores all graph data locally in IndexedDB.
- Detects cross-page semantic connections and triggers nudge notifications for strong matches.
- Provides an interactive popup UI to search, filter, inspect nodes, and query your graph.
- Includes onboarding, activity log, and configurable privacy/sensitivity settings.

## Core Features

### Passive Ingestion
- Dwell-time trigger and SPA-aware re-triggering.
- Content cleaning and truncation before extraction.
- Domain exclusion controls.

### AI Extraction Engine
- Structured output: concepts, entities, claims, summary, confidence.
- Confidence gate to skip weak extractions.
- Queue + cooldown control.
- Daily API cap controls.

### Local Knowledge Graph
- IndexedDB persistence for nodes, edges, events, connections, and settings.
- Aging/pruning hooks for long-term graph hygiene.

### Connection Detection + Nudges
- Similarity scoring with tiered outcomes.
- Anti-spam nudge policy with quiet hours and hourly caps.
- Interaction feedback loop for threshold adaptation.

### Popup Knowledge UI
- Canvas graph renderer (D3-powered).
- Node detail panel (sources, timestamps, quick actions).
- Search + query flow.
- Filtering by date/domain/type/confidence/weight/AI-only.
- Focus mode and highlight mode.
- Activity log and status surfaces.

### Settings + Privacy
- Runtime settings for AI key, sensitivity, dwell time, daily limit, quiet hours, excluded domains.
- Full local data wipe with confirmation.
- Local-first model, no account system.

## Tech Stack

- Vite + React
- Manifest V3 (Chrome Extension)
- D3 for graph rendering
- IndexedDB persistence
- GSAP motion enhancements
- Tailwind/PostCSS styling pipeline

## Project Structure

```text
loom1/
  ARCHITECTURE-CURRENT.md
  IMPLEMENTATION-PLAN-2.md
  IMPLEMENTATION-PLAN-3.md
  manifest.json
  package.json
  PERFORMANCE-REPORT.md
  PRD-COVERAGE-MATRIX.md
  PROGRESS.md
  SECURITY-CHECKLIST.md
  postcss.config.js
  tailwind.config.js
  vite.config.js
  src/
    background/
      service-worker.js
    content/
      content.js
    popup/
      App.jsx
      index.html
      main.jsx
      components/
        ActivityLog.jsx
        ConfirmModal.jsx
        Filters.jsx
        GraphCanvas.jsx
        NodePanel.jsx
        Onboarding.jsx
        SearchBar.jsx
        SettingsPanel.jsx
      lib/
        runtime.js
      styles/
        index.css
    utils/
      ai.js
      connectionEngine.js
      graph-db.js
      nvidiaClient.js
      scheduler.js
      settings.js
```

## Runtime Architecture

1. Content script observes dwell time and sends `PAGE_VISITED`.
2. Background service worker queues extraction work.
3. AI extraction runs (NVIDIA-first).
4. Graph DB persists nodes/edges/events/connections.
5. Connection engine scores new relationships.
6. Nudge logic evaluates thresholds and quiet-hour constraints.
7. Popup requests graph/health/settings via runtime messaging.

### Message Contracts

- `PAGE_VISITED`
- `GET_GRAPH`, `SEARCH_GRAPH`
- `GET_NODE_DETAIL`
- `QUERY_GRAPH`
- `GET_SETTINGS`, `UPDATE_SETTINGS`
- `GET_BACKEND_HEALTH`
- `GET_ACTIVITY_LOG`
- `WIPE_GRAPH`

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Chrome or Chromium-based browser

### Install

```bash
npm install
```

### Development Build

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

Build artifacts are generated under `dist/`.

## Load Extension in Chrome

1. Build the extension (`npm run build`).
2. Open `chrome://extensions/`.
3. Enable Developer Mode.
4. Click **Load unpacked**.
5. Select the project `dist/` folder.

## Configuration

- Open Loom popup -> Settings.
- Add NVIDIA API key.
- Configure sensitivity, dwell time, daily cap, quiet hours, and exclusions.

## Validation Artifacts

- Architecture snapshot: `ARCHITECTURE-CURRENT.md`
- PRD requirement mapping: `PRD-COVERAGE-MATRIX.md`
- Security checklist: `SECURITY-CHECKLIST.md`
- Performance snapshot: `PERFORMANCE-REPORT.md`
- Progress log: `PROGRESS.md`

## Scripts

```bash
npm run dev      # Start Vite dev server
npm run build    # Build extension bundle
npm run preview  # Preview built app
```

## Current Status

- Major Plan 2 and Plan 3 phases implemented.
- Local-first ingestion, AI extraction pipeline, graph rendering, query/filter UX, onboarding, and settings are in place.
- Remaining work is mainly iterative quality improvement (benchmark automation and deeper pathfinding sophistication).

## License

No license file is currently included. Add one if you plan to open-source this project publicly.
