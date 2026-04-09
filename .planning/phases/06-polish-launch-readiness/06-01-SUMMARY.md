---
phase: 06-polish-launch-readiness
plan: 01
subsystem: client-dashboard
tags: [capacity, waitlist, session-grouping, timezone, ux-polish]
dependency_graph:
  requires: [06-00]
  provides: [capacity-display, waitlist-inline, session-grouping, timezone-label]
  affects: [client-dashboard, sessions-page]
tech_stack:
  added: [src/lib/utils/timezone.ts]
  patterns: [CapacityBadge component, SessionCard subcomponent, useEffect timezone detection]
key_files:
  created:
    - src/lib/utils/timezone.ts
    - src/__tests__/capacity-display.test.ts
    - src/__tests__/waitlist-display.test.ts
    - src/__tests__/session-grouping.test.ts
    - src/__tests__/timezone-label.test.ts
  modified:
    - src/app/sessions/page.tsx
    - src/components/dashboard/ClientDashboard.tsx
decisions:
  - "SessionCard extracted as subcomponent to share session card JSX between Today and This Week sections cleanly"
  - "Wave 0 test stubs created inline during Plan 01 execution (Plan 00 was not executed by orchestrator)"
  - "Used &mdash; HTML entity for em-dash in waitlist label to avoid JSX lint warnings"
metrics:
  duration: ~12 minutes
  completed: 2026-04-09
  tasks_completed: 2
  files_changed: 7
---

# Phase 06 Plan 01: Session Card Polish — Capacity, Waitlist, Grouping, Timezone Summary

Client dashboard session cards now show capacity fill level with color-coded fraction badges, waitlist position inline, Today/This Week section grouping, and conditional AEST/AEDT timezone suffix for non-Sydney users.

## What Was Built

### Task 1: Timezone utility + session query updates

- Created `src/lib/utils/timezone.ts` exporting `getTimezoneLabel()` and `isTodaySydney()`
- Updated `sessions/page.tsx` RSVP query to fetch both `confirmed` and `waitlisted` RSVPs (removed `.eq('rsvp_type', 'confirmed')` filter)
- Added `waitlist_position` to the RSVP select
- Added batch `sessionConfirmedCountMap` query (mirrors the existing `eventRsvpCountMap` pattern)
- Updated `rsvpTypeMap` to store `{ rsvp_type, waitlist_position }` objects
- Updated `upcomingSessions` mapping to include `confirmed_count` and `waitlist_position`
- Updated `UpcomingSession` interface in `ClientDashboard.tsx` with new fields
- Also created all four Wave 0 test stubs (deviation — Plan 00 was not run by orchestrator)

### Task 2: ClientDashboard UI updates

- Added `CapacityBadge` component: green below 75%, orange 75-99%, red at/over capacity (D-01)
- Added `SessionCard` subcomponent to cleanly share card rendering between Today/This Week sections
- Waitlisted RSVPs show "Waitlisted — #N in line" instead of "Going" badge (D-02)
- CapacityBadge shown alongside status badge when `capacity` is not null
- Sessions split into "Today" and "This Week" sections using `isTodaySydney()` (D-11)
- `getTimezoneLabel()` called via `useEffect` to avoid hydration mismatch; appended to time display for non-Sydney users (D-04)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created Wave 0 test stubs inline**
- **Found during:** Task 1 (verify step)
- **Issue:** Plan 01 depends_on Plan 00, but Plan 00 SUMMARY and test files were missing — vitest verify step would have failed with "No test files found"
- **Fix:** Created all four test files (`capacity-display.test.ts`, `waitlist-display.test.ts`, `session-grouping.test.ts`, `timezone-label.test.ts`) at the start of Task 1 execution
- **Files modified:** `src/__tests__/capacity-display.test.ts`, `src/__tests__/waitlist-display.test.ts`, `src/__tests__/session-grouping.test.ts`, `src/__tests__/timezone-label.test.ts`
- **Commit:** 2772b99

**2. [Rule 1 - Design] Extracted SessionCard subcomponent**
- **Found during:** Task 2
- **Issue:** After splitting sessions into todaySessions/thisWeekSessions, the session card JSX would need to be duplicated in two map() calls
- **Fix:** Extracted a `SessionCard` component that takes `{ session, tzLabel }` props — eliminates duplication and keeps the diff clean
- **Files modified:** `src/components/dashboard/ClientDashboard.tsx`
- **Commit:** 07afcb1

## Commits

| Hash | Description |
|------|-------------|
| 2772b99 | feat(06-01): add timezone utility and update session query with capacity counts |
| 07afcb1 | feat(06-01): add CapacityBadge, waitlist inline, Today/This Week grouping to ClientDashboard |

## Known Stubs

None — all data is live from Supabase queries.

## Threat Flags

None — the confirmed count query follows the existing `eventRsvpCountMap` pattern. RLS scopes results to community. Aggregate counts (not per-user PII).

## Self-Check: PASSED

- [x] `src/lib/utils/timezone.ts` exists and exports `getTimezoneLabel` and `isTodaySydney`
- [x] `src/app/sessions/page.tsx` contains `waitlist_position` in RSVP select
- [x] `src/app/sessions/page.tsx` contains `sessionConfirmedCountMap`
- [x] `src/app/sessions/page.tsx` contains `confirmed_count:` in upcomingSessions map
- [x] `UpcomingSession` interface contains `confirmed_count: number` and `waitlist_position: number | null`
- [x] `ClientDashboard.tsx` contains `function CapacityBadge`
- [x] `ClientDashboard.tsx` contains `Waitlisted` text with `waitlist_position`
- [x] `ClientDashboard.tsx` contains `isTodaySydney` import and usage
- [x] `ClientDashboard.tsx` contains `todaySessions` and `thisWeekSessions`
- [x] `ClientDashboard.tsx` contains `getTimezoneLabel` import and `tzLabel` state
- [x] TypeScript compiles clean (`npx tsc --noEmit` — no output = no errors)
- [x] All 26 tests pass across 8 test files
