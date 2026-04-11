# Loom PRD Coverage Matrix

Date: 2026-04-11

## Summary
This matrix maps PRD v1.0 requirements to current implementation files and completion status after Plan 2 Phase 2.9.

Legend:
- PASS: Implemented and wired
- PARTIAL: Implemented baseline, reduced scope, or heuristic fallback
- GAP: Not yet implemented

## 6.1 Passive Page Ingestion
- Requirement: 30s dwell-time trigger
- Status: PASS
- Evidence: src/content/content.js

- Requirement: Main-content extraction and boilerplate stripping
- Status: PARTIAL
- Evidence: src/content/content.js
- Notes: Heuristic selector and cleanup are implemented; extractor quality tuning remains iterative.

- Requirement: Exclusion list coverage
- Status: PASS
- Evidence: src/content/content.js, src/utils/settings.js

- Requirement: SPA route re-trigger support
- Status: PASS
- Evidence: src/content/content.js

- Requirement: 2,000 token truncation before AI call
- Status: PASS
- Evidence: src/content/content.js, src/background/service-worker.js

## 6.2 AI Concept Extraction Engine
- Requirement: Structured extraction output (concepts/entities/claims/summary/confidence)
- Status: PASS
- Evidence: src/utils/ai.js

- Requirement: Confidence gate (<0.5 skip)
- Status: PASS
- Evidence: src/background/service-worker.js

- Requirement: Queueing + 5s cooldown
- Status: PASS
- Evidence: src/background/service-worker.js

- Requirement: Daily AI call cap (default 200)
- Status: PASS
- Evidence: src/utils/settings.js, src/background/service-worker.js

- Requirement: No Claude dependency
- Status: PASS
- Evidence: src/utils/ai.js

## 6.3 Local Knowledge Graph
- Requirement: IndexedDB graph stores
- Status: PASS
- Evidence: src/utils/graph-db.js

- Requirement: Node/edge/event/connection/settings model persistence
- Status: PASS
- Evidence: src/utils/graph-db.js

- Requirement: Dedup/merge and aging/pruning hooks
- Status: PARTIAL
- Evidence: src/utils/graph-db.js
- Notes: Normalization and aging/pruning are present; semantic node-merge remains simplified.

## 6.4 Connection Detection Engine
- Requirement: Similarity scoring and ranking
- Status: PASS
- Evidence: src/utils/connectionEngine.js

- Requirement: Tier behavior (strong/medium/weak/noise)
- Status: PASS
- Evidence: src/utils/connectionEngine.js, src/background/service-worker.js

- Requirement: 24h recency bias and anti-spam integration
- Status: PASS
- Evidence: src/background/service-worker.js

## 6.5 Nudge Notification System
- Requirement: Notification trigger for strong matches
- Status: PASS
- Evidence: src/background/service-worker.js

- Requirement: Dismiss/click learning loop
- Status: PASS
- Evidence: src/background/service-worker.js

- Requirement: Quiet hours and max 3 nudges/hour
- Status: PASS
- Evidence: src/background/service-worker.js, src/utils/settings.js

## 6.6 Knowledge Graph Viewer (Popup)
- Requirement: Force-directed graph with interaction
- Status: PASS
- Evidence: src/popup/components/GraphCanvas.jsx

- Requirement: Node panel with metadata/sources/connections
- Status: PASS
- Evidence: src/popup/components/NodePanel.jsx

- Requirement: Filters/search/highlight mode
- Status: PASS
- Evidence: src/popup/components/Filters.jsx, src/popup/components/SearchBar.jsx, src/popup/App.jsx

## 6.7 Day 1 Onboarding Flow
- Requirement: Multi-step onboarding and persistence
- Status: PASS
- Evidence: src/popup/components/Onboarding.jsx, src/popup/App.jsx, src/utils/settings.js

- Requirement: Day 3 reminder scheduling
- Status: PASS
- Evidence: src/utils/scheduler.js, src/background/service-worker.js

## 6.8 Query Interface
- Requirement: Query endpoint and graph-aware responses
- Status: PASS
- Evidence: src/background/service-worker.js

- Requirement: Topic/this-week/stale flows
- Status: PASS
- Evidence: src/background/service-worker.js

- Requirement: X-to-Y path flow
- Status: PARTIAL
- Evidence: src/background/service-worker.js
- Notes: Intent branch exists; full explicit pathfinding algorithm is not yet deeply implemented.

## 6.9 Settings and Controls
- Requirement: Min dwell/daily cap/sensitivity/quiet hours/excludes
- Status: PASS
- Evidence: src/popup/components/SettingsPanel.jsx, src/utils/settings.js

- Requirement: Wipe all data with confirmation
- Status: PASS
- Evidence: src/popup/components/ConfirmModal.jsx, src/popup/App.jsx, src/background/service-worker.js

## 11 Privacy and Security
- Requirement: Local-first persistence
- Status: PASS
- Evidence: src/utils/graph-db.js, src/utils/settings.js

- Requirement: HTTPS AI calls
- Status: PASS
- Evidence: src/utils/ai.js

- Requirement: No hardcoded API keys
- Status: PASS
- Evidence: src/utils/ai.js, .env.example

## 12 Performance
- Requirement: Build-time and runtime readiness checks
- Status: PASS
- Evidence: npm run build output, canvas graph renderer

- Requirement: Profiling against all numeric SLOs
- Status: PARTIAL
- Evidence: PERFORMANCE-REPORT.md
- Notes: Build/bundle metrics captured; full benchmark suite is pending.
