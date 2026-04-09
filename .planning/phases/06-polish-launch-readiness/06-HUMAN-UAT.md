---
status: partial
phase: 06-polish-launch-readiness
source: [06-VERIFICATION.md]
started: 2026-04-09T14:35:00+09:00
updated: 2026-04-09T14:35:00+09:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. Atomic RSVP schema push confirmed
expected: `atomic_rsvp()` function appears in Supabase Dashboard → Database → Functions and returns expected error for nonexistent session UUID
result: [pending]

### 2. Concurrent RSVP race condition (SC-3)
expected: Two simultaneous RSVPs to a full session result in one confirmed and one waitlisted, never two confirmed
result: [pending]

### 3. Calendar scroll frozen panes (SC-2)
expected: Time column stays visible on horizontal scroll; header row stays visible on vertical scroll; corner cell anchors both
result: [pending]

### 4. Timezone suffix rendering (SC-2)
expected: Non-Sydney browser shows AEST/AEDT suffix after session times; Sydney browser shows no suffix
result: [pending]

### 5. Mobile calendar view default (design tension)
expected: Confirm whether calendar should default to day view on mobile or follow D-03 (user choice only, no breakpoint auto-switch)
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
