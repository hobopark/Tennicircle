---
phase: 04-coach-dashboard-community-events
plan: "00"
subsystem: testing
tags: [test-stubs, vitest, events, calendar, announcements]
dependency_graph:
  requires: []
  provides:
    - test stubs for event CRUD actions (EVNT-01 through EVNT-05)
    - test stubs for RSVP actions (EVNT-04)
    - test stubs for announcement actions (EVNT-05)
    - test stubs for WeekCalendarGrid day view and attendance preview (DASH-01, DASH-02)
    - test stubs for EventCard event type badges and RSVP state (EVNT-06)
  affects: []
tech_stack:
  added: []
  patterns:
    - vitest it.todo() for pending behavioral contracts
key_files:
  created:
    - src/lib/actions/events.test.ts
    - src/lib/actions/announcements.test.ts
    - src/components/calendar/WeekCalendarGrid.test.tsx
    - src/components/events/EventCard.test.tsx
  modified: []
decisions: []
metrics:
  duration_minutes: 5
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
---

# Phase 04 Plan 00: Test Stubs for Wave 0 Gaps Summary

**One-liner:** 4 vitest stub files with 36 todo tests defining behavioral contracts for EVNT-01 through EVNT-06 and DASH-01 through DASH-02.

## What Was Built

Created test stub files for all Phase 4 Wave 0 gaps identified in RESEARCH.md. These stubs use vitest's `it.todo()` API to define pending behavioral contracts without producing test failures. Implementation plans in subsequent waves will convert stubs to real tests as server actions and components are built.

### Test files created

**`src/lib/actions/events.test.ts`** — 13 todo tests:
- `createEvent`: 6 tests covering EVNT-01 (tournament), EVNT-02 (social), EVNT-03 (open session), EVNT-05 (is_official from JWT), validation, auth
- `rsvpEvent`: 4 tests covering EVNT-04 (confirmed/waitlist RSVP, duplicates, cancelled event)
- `cancelEventRsvp`: 2 tests covering cancel idempotency
- `deleteEvent`: 3 tests covering creator/admin/non-owner deletion

**`src/lib/actions/announcements.test.ts`** — 4 todo tests:
- `createAnnouncement`: coach, admin, client-rejection, validation cases (EVNT-05)

**`src/components/calendar/WeekCalendarGrid.test.tsx`** — 9 todo tests:
- Day view rendering, date navigation, filtering (DASH-01)
- Attendance preview: count, avatar strip, overflow pill (DASH-02)
- View toggle persistence

**`src/components/events/EventCard.test.tsx`** — 8 todo tests:
- Event type badges: tournament, social, open_session (EVNT-06)
- Capacity display, RSVP state: button/Going/Waitlisted

## Verification

`npx vitest run` completed successfully:
- 4 new test files detected and skipped (all todo)
- 36 new todo tests across the 4 files — all pending, none failing
- No configuration errors

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

All test content is intentionally stub/todo — this is the expected output of this plan. Stubs will be resolved by implementation plans in subsequent waves.

## Threat Flags

None — test files contain no production logic or security-relevant surface.

## Self-Check: PASSED

- [x] `src/lib/actions/events.test.ts` exists
- [x] `src/lib/actions/announcements.test.ts` exists
- [x] `src/components/calendar/WeekCalendarGrid.test.tsx` exists
- [x] `src/components/events/EventCard.test.tsx` exists
- [x] Commit `45e376e` exists (task 1: action stubs)
- [x] Commit `a21dbe4` exists (task 2: component stubs)
- [x] All tests show as todo/pending in vitest output
