# Loom Security and Privacy Checklist

Date: 2026-04-11

## Data Residency
- [x] Local-first data model (IndexedDB + local storage)
- [x] No account/auth flow implemented
- [x] No telemetry pipeline detected

## API and Secrets
- [x] No API keys hardcoded in source files
- [x] Environment template provided via .env.example
- [x] Source uses HTTPS endpoint for AI calls
- [x] API key handling left unchanged per project constraint

## Provider Compliance
- [x] No Claude usage references in src/
- [x] NVIDIA-first extraction path present

## Ingestion Privacy Guardrails
- [x] Domain exclusion list enforced in content ingestion and settings defaults
- [x] Local/private/auth-like domain patterns excluded
- [x] Text truncation before AI call

## User-Controlled Privacy
- [x] Quiet hours settings available
- [x] Full data wipe action available with confirmation modal
- [x] Wipe clears graph and settings stores via backend endpoint

## Notifications and Nudge Safety
- [x] Anti-spam cap implemented (max 3 per hour)
- [x] Duplicate nudge suppression for same connection pair
- [x] Adaptive threshold based on interaction

## Open Security Follow-Ups
- [ ] Add automated static secret scan in CI
- [ ] Add optional incognito-mode explicit guard checks
- [ ] Add stronger content extraction redaction heuristics for sensitive text patterns
