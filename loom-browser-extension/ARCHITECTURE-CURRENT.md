# Loom Current Architecture (Post Plan 2.9)

## Runtime Topology
- Content script ingests page content after dwell threshold and sends PAGE_VISITED.
- Background service worker orchestrates extraction queue, graph persistence, detection, nudges, and query endpoints.
- Popup uses message-driven APIs and a canvas D3 renderer for visualization and interaction.

## Message Contracts
- PAGE_VISITED: content -> background ingestion queue
- GET_GRAPH / SEARCH_GRAPH: popup graph read
- GET_NODE_DETAIL: popup panel detail fetch
- QUERY_GRAPH: popup query flow
- GET_SETTINGS / UPDATE_SETTINGS: settings roundtrip
- WIPE_GRAPH: data wipe operation
- GET_BACKEND_HEALTH: backend readiness introspection

## Data Layer
Primary persistent data store:
- IndexedDB database: loomKnowledgeDB
- Stores: nodes, edges, events, connections, settings

Runtime/auxiliary state:
- chrome.storage.local for settings and daily API usage counters

## Processing Pipeline
1. Content script waits 30s dwell and extracts cleaned page text.
2. Service worker enqueues visit event.
3. Queue processor enforces cooldown and daily API limits.
4. NVIDIA-first extraction yields concepts/entities/claims/summary.
5. Event, nodes, and edges are upserted in IndexedDB.
6. Connection engine scores against prior graph state.
7. Nudge logic applies tiering, quiet hours, and anti-spam limits.
8. Popup receives graph updates and pulse signals.

## Popup UI Composition
- App orchestration: src/popup/App.jsx
- Graph canvas: src/popup/components/GraphCanvas.jsx
- Node detail: src/popup/components/NodePanel.jsx
- Query/search: src/popup/components/SearchBar.jsx
- Filters: src/popup/components/Filters.jsx
- Onboarding: src/popup/components/Onboarding.jsx
- Settings: src/popup/components/SettingsPanel.jsx
- Wipe confirmation: src/popup/components/ConfirmModal.jsx

## Scheduled Jobs
- day3 reminder alarm
- weekly prune alarm

## Provider Constraint
- No Claude provider integration.
- NVIDIA-first extraction in src/utils/ai.js.

## Residual Engineering Notes
- Semantic merge/pathfinding sophistication can be expanded incrementally without changing current contracts.
- Benchmark automation should be formalized to enforce PRD SLOs continuously.
