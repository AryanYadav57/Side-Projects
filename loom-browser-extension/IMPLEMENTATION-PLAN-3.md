# Loom Implementation Plan 3 (Experience Hardening)

Version: 1.0  
Date: 2026-04-11  
Owner: Aryan Yadav

## 1. Objective
Improve the extension’s day-to-day usefulness and trust without changing the current visual style or core graph experience.

Primary goals:
1. Make AI status and last extraction visible at all times.
2. Add an activity log for recent page visits, extractions, and connection detections.
3. Improve graph usability with stronger filters, focus mode, and stable node-detail actions.
4. Add a compact onboarding checklist that proves the extension is working after install.
5. Surface AI failure and fallback behavior clearly instead of degrading silently.

## 2. Hard Constraints
1. Preserve the current dark graph style and layout language.
2. Do not introduce Claude provider usage.
3. Do not change the extension into a cloud or account-based product.
4. Keep the AI path local-first in behavior and transparent in the UI.
5. Do not break existing graph browsing, query, zoom, or node detail flows.

## 3. Current State Summary
Already working:
1. Popup graph rendering.
2. Search and reset flows.
3. Filters for time, node type, min weight, and highlight mode.
4. Node detail panel.
5. Settings with AI test action.
6. Backend health and extraction telemetry.
7. Zoom controls and smoother graph canvas interaction.

Current gaps:
1. AI state is not prominent enough in the main browsing flow.
2. There is no visible activity history for recent events.
3. Graph filtering is still too basic for trust and recall workflows.
4. The node detail panel lacks source reopen/copy actions.
5. Onboarding does not yet verify working ingestion and AI extraction clearly.
6. Fallback/failure messaging needs to be more explicit.
7. Focus mode is useful but can be stronger for topic exploration.

## 4. Scope for Plan 3
In scope:
1. Popup UI/UX improvements that keep the current visual style intact.
2. Graph exploration helpers: activity log, filters, focus mode, and node actions.
3. AI visibility improvements: live status, last extraction, and fallback explanation.
4. Onboarding verification checklist.
5. Small supporting backend message/state additions only where needed for UI visibility.

Out of scope:
1. Major visual redesign.
2. New provider integrations beyond the current NVIDIA-only path.
3. Cloud sync, accounts, or external dashboards.
4. Replacing the canvas graph with a different graph library.

## 5. Workstreams

### Workstream A: AI Visibility Surface
Deliverables:
1. Always-visible AI status in the popup.
2. Show last extraction time and provider.
3. Show fallback state when extraction is heuristic or degraded.
4. Show a concise reason when AI is unavailable or skipped.

Acceptance Criteria:
1. User can tell at a glance whether AI is active.
2. The UI shows the most recent extraction provider and time.
3. Fallback mode is visible and not silent.

### Workstream B: Activity Log
Deliverables:
1. Compact recent activity feed in the popup.
2. Activity types: page visit, extraction, connection detection.
3. Inline timestamps and short descriptions.
4. Optional quick jump from activity items to related graph nodes.

Acceptance Criteria:
1. Recent events are visible without opening devtools.
2. Activity items are readable in the existing popup layout.
3. Feed remains compact and does not crowd the graph.

### Workstream C: Stronger Graph Filters
Deliverables:
1. Domain filter.
2. Date range filter.
3. Confidence filter.
4. "Only AI-generated nodes" toggle.
5. Preserve current filter controls and styling language.

Acceptance Criteria:
1. Filter combinations update the graph without page refresh.
2. Users can isolate AI-derived nodes only.
3. Filters remain responsive with the current graph size.

### Workstream D: Node Detail Actions
Deliverables:
1. Open source page again from node detail.
2. Copy source URL from node detail.
3. Keep source metadata visible.
4. Preserve current panel look and layout.

Acceptance Criteria:
1. User can reopen the original page with one action.
2. User can copy the source URL without leaving the popup.
3. Existing detail layout remains stable.

### Workstream E: Onboarding Verification Checklist
Deliverables:
1. Compact checklist in onboarding.
2. Verify extension loaded.
3. Verify AI key/status.
4. Verify first extraction.
5. Verify graph is updating.

Acceptance Criteria:
1. New users can confirm setup success within the extension.
2. Checklist reflects actual runtime state.
3. Onboarding remains short and non-blocking.

### Workstream F: Failure and Fallback Messaging
Deliverables:
1. Show when AI is falling back to heuristic extraction.
2. Explain why extraction skipped or failed.
3. Surface retry guidance in settings or status area.
4. Avoid silent failure states.

Acceptance Criteria:
1. Users know why AI is not fully active.
2. Errors are actionable and short.
3. No silent fallback during normal usage.

### Workstream G: Focus Mode
Deliverables:
1. Focus mode centered on a selected topic or node.
2. Highlight nearest connections and downplay unrelated nodes.
3. Keep current highlight mode behavior intact.
4. Support quick exit back to normal browsing.

Acceptance Criteria:
1. User can isolate a topic and its neighborhood quickly.
2. Focus mode is visually clear but does not change the graph style.
3. Exit is one click and state restores cleanly.

## 6. Proposed Execution Phases
Phase 3.1: AI visibility and fallback messaging  
Phase 3.2: Activity log and event summaries  
Phase 3.3: Stronger filtering and AI-only node toggles  
Phase 3.4: Node detail actions and source utilities  
Phase 3.5: Onboarding checklist and setup verification  
Phase 3.6: Focus mode and graph browsing polish  
Phase 3.7: Final integration, verification, and performance pass

### 6.1 Phase Isolation Rule
Keep UI changes incremental and style-preserving.

Allowed:
1. Small popup component additions.
2. Minimal backend telemetry or event endpoints if needed.
3. Small supporting state additions.

Avoid:
1. Full popup redesign.
2. Replacing the graph rendering stack.
3. Broad backend refactors unrelated to these features.

## 7. Verification Plan
1. Build verification after each phase.
2. Manual popup checks for AI visibility, activity log, filters, node actions, onboarding, and focus mode.
3. Regression checks for search, reset, zoom, and node selection.
4. Performance checks on the graph screen to preserve responsiveness.

## 8. Delivery Checklist
1. Activity log visible and compact.
2. Domain/date/confidence/AI-only filters working.
3. Source reopen/copy actions in node detail.
4. Onboarding checklist proves the extension is working.
5. AI status and last extraction visible in the main popup.
6. Failure and fallback states are explicit.
7. Focus mode highlights the selected topic and nearby connections.

## 9. Non-Negotiable Notes
1. Keep the current graph style and overall feel.
2. Do not add Claude usage.
3. Keep the AI story transparent to the user.
4. Optimize for clarity, trust, and responsiveness over visual novelty.
