# Loom Implementation Plan 2 (PRD Gap Closure)

Version: 1.0  
Date: 2026-04-11  
Owner: Aryan Yadav

## 1. Objective
This plan closes all gaps between the current codebase and the PRD v1.0.

## 2. Hard Constraints (Must Not Violate)
1. Do not modify, rotate, hardcode, or otherwise change API keys in code or tracked files.
2. Do not introduce Claude provider usage anywhere in implementation.
3. AI integration must be provider-agnostic or NVIDIA-only for current implementation.
4. Maintain local-first architecture (no cloud sync, no account system).

## 3. Current State Summary
Completed foundation:
1. Extension scaffold and message passing baseline.
2. Basic graph persistence and transition edges.
3. Popup D3 graph, search, settings panel, and edge pulse visuals.

Remaining PRD-critical gaps:
1. Passive ingestion fidelity (dwell, extraction quality, excludes, SPA routing).
2. AI concept extraction pipeline and validation.
3. IndexedDB data model parity (Node, Edge, Event, Connection, Settings).
4. Semantic connection detection and nudge quality tiers.
5. Notification system and anti-spam controls.
6. Onboarding and Day-3 reminder flow.
7. Query interface and graph answer flows.
8. Full settings and privacy controls parity.

## 4. Scope for Plan 2
In scope:
1. MVP parity from PRD sections 6, 7, 8, 9, 10, 11, and 12.
2. Structural refactor to modular architecture under src/utils and popup components.
3. Migration from chrome.storage-only graph to IndexedDB-backed graph engine.

Out of scope:
1. v1.5 and above items in PRD section 13 unless explicitly required for MVP dependencies.
2. Cloud sync, account systems, multi-device features.

## 5. Workstreams

### Workstream A: Ingestion Engine (PRD 6.1)
Deliverables:
1. 30s dwell-time tracking before extraction trigger.
2. Main-content extraction (remove nav/footer/sidebar/cookie chrome).
3. Exclusion filtering (banking/medical/email/private/auth patterns).
4. SPA route change re-trigger support.
5. Token truncation to 2,000-token equivalent budget.

Acceptance Criteria:
1. No extraction for dwell < 30s.
2. Excluded domains never emit extraction payloads.
3. Route transitions in SPA pages are detected without full page reload.

### Workstream B: AI Extraction Pipeline (PRD 6.2, 9.1)
Deliverables:
1. NVIDIA-backed extraction wrapper module (no Claude references).
2. Strict JSON schema validation for concepts/entities/claims/summary/confidence.
3. Confidence gate: skip persistence when confidence < 0.5.
4. Queue + cooldown (min 5s between calls), max one call per page event.
5. Daily API call cap from settings (default 200).

Acceptance Criteria:
1. Malformed responses are rejected without breaking processing loop.
2. Queue drains in order and respects cooldown.
3. Daily cap prevents additional calls after threshold.

### Workstream C: IndexedDB Graph Core (PRD 6.3, 8.x)
Deliverables:
1. Implement IndexedDB stores for Node, Edge, Event, Connection, Settings.
2. Deduplication and semantic merge pipeline (string normalization first, semantic merge later).
3. Edge strengthening and node aging hooks.
4. Weekly pruning worker for stale/orphan records.
5. Migration adapter from legacy storage structure.

Acceptance Criteria:
1. CRUD operations pass unit tests for each model.
2. Existing graph data is migrated without data loss.
3. Query performance remains within PRD targets for small and medium datasets.

### Workstream D: Connection Detection + Nudges (PRD 6.4, 6.5)
Deliverables:
1. Similarity scoring engine with weighted ranking.
2. Tier behavior: strong, medium, weak, noise.
3. Nudge trigger policy with anti-spam constraints.
4. Nudge learning loop (dismiss raises threshold, click lowers threshold).
5. Quiet hours enforcement.

Acceptance Criteria:
1. Maximum 3 nudges per hour.
2. Same connection is not nudged twice.
3. Tier thresholds are configurable and persisted.

### Workstream E: Popup Feature Parity (PRD 6.6, 10.x)
Deliverables:
1. Split popup into components: Graph, NodePanel, SearchBar, Filters, Onboarding.
2. Node detail side panel with sources and connected node strengths.
3. Filters for time range, node type, and minimum weight.
4. Highlight mode for first/second degree neighbors.
5. Maintain performance targets with canvas-first rendering.

Acceptance Criteria:
1. Node click opens detail panel with source metadata.
2. Filters update graph view without full reload.
3. Interactions remain smooth under moderate graph size.

### Workstream F: Onboarding + Scheduler (PRD 6.7)
Deliverables:
1. Day-3 reminder scheduling via chrome.alarms.
2. Onboarding state model and completion persistence.
3. Privacy onboarding content contract for UI phase.

Acceptance Criteria:
1. New install triggers onboarding once.
2. Reminder is scheduled and can be canceled/reset.

### Workstream G: Query Interface (PRD 6.8, 9.3)
Deliverables:
1. QUERY_GRAPH message endpoint.
2. Query types: topic summary, this-week view, X-to-Y connection path, stale-high-weight recall.
3. Result format with visual highlight + concise response + source list.

Acceptance Criteria:
1. Query responses are based only on stored graph data.
2. Missing-evidence queries explicitly return insufficient-data responses.

### Workstream H: Settings + Privacy Controls (PRD 6.9, 11.x)
Deliverables:
1. Full settings schema and runtime application.
2. Wipe all data with irreversible confirmation.
3. Excluded domain defaults + persistence.
4. Quiet hours and sensitivity runtime enforcement.

Acceptance Criteria:
1. Wipe clears IndexedDB, storage, alarms, and resets onboarding state.
2. Settings changes are persisted and applied at runtime.

## 6. Proposed Execution Phases
Phase 2.1: Ingestion and exclusion engine (backend only)  
Phase 2.2: NVIDIA extraction wrapper, validator, queueing (backend only)  
Phase 2.3: IndexedDB data model and migration (backend only)  
Phase 2.4: Semantic connection scoring, nudge policy, anti-spam rules (backend only)  
Phase 2.5: Query engine endpoints and graph retrieval APIs (backend only)  
Phase 2.6: Scheduler, settings runtime, and privacy controls (backend only)  
Phase 2.7: Backend verification and performance hardening  
Phase 2.8: UI Rework Phase (all popup/onboarding/query/settings UI)  
Phase 2.9: Final integration, UAT, and launch-readiness validation

### 6.1 UI Rework Isolation Rule
All visual and interaction rework is isolated to Phase 2.8. No UI refactor should happen in Phases 2.1 to 2.7 except strictly required wiring stubs.

Included in Phase 2.8:
1. Popup component split: Graph, NodePanel, SearchBar, Filters, Onboarding.
2. Node detail panel UX and graph interaction polish.
3. Query UI and visual response rendering.
4. Onboarding screens and copy flow.
5. Settings UI, wipe confirmation modal, exclude-domain editor, sensitivity and quiet-hours controls.

## 7. Verification Plan
1. Unit tests for extraction validator, queue, dedup, scoring, and settings logic.
2. Integration tests for content->background->storage->popup flow.
3. Scenario tests for anti-spam nudges and quiet hours.
4. Manual UAT against PRD emotional arc:
- Day 1 Wonder: visible node growth.
- Day 3 Shock: meaningful nudge and connection reveal.
- Week 2 Dependency: query usefulness and graph trust.

## 8. Delivery Checklist
1. PRD coverage matrix with requirement-to-file mapping.
2. Updated architecture docs matching actual implementation.
3. Security checklist confirming local-first and key handling constraints.
4. Performance report vs PRD targets.

## 9. Non-Negotiable Compliance Notes
1. API key handling remains unchanged in this planning step.
2. No Claude integration or Claude prompt references in new implementation tasks.
3. NVIDIA-only AI usage for implementation under this plan.
