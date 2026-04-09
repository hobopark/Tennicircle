---
phase: 06-polish-launch-readiness
plan: 03
subsystem: ui-polish
tags: [calendar, nav, profile, ux, localStorage, dialog]
dependency_graph:
  requires: []
  provides:
    - calendar-frozen-panes
    - calendar-view-persistence
    - logout-dialog-confirmation
    - profile-edit-cancel
  affects:
    - src/components/calendar/WeekCalendarGrid.tsx
    - src/components/nav/AppNav.tsx
    - src/components/profile/ProfileSetupWizard.tsx
tech_stack:
  added: []
  patterns:
    - CSS sticky positioning for frozen grid panes
    - localStorage for UI preference persistence
    - "@base-ui/react Dialog via ui/dialog.tsx wrappers"
    - Roland Garros orange for destructive action confirmation
key_files:
  created: []
  modified:
    - src/components/calendar/WeekCalendarGrid.tsx
    - src/components/nav/AppNav.tsx
    - src/components/profile/ProfileSetupWizard.tsx
decisions:
  - localStorage key standardised to tc-calendar-view (was tennis-schedule-view)
  - DialogClose render prop pattern used for Cancel button (base-ui API)
  - Cancel link placed top-right of wizard (justify-end) to not compete with step indicator
metrics:
  duration_minutes: 25
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_modified: 3
---

# Phase 6 Plan 03: Calendar Frozen Panes, Logout Dialog, and Profile Cancel Summary

**One-liner:** CSS sticky frozen panes on WeekCalendarGrid with tc-calendar-view localStorage persistence, @base-ui/react Dialog confirmation before logout with Roland Garros orange confirm, and Cancel link escape on ProfileSetupWizard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add frozen panes and view preference persistence to WeekCalendarGrid | 05d55bd | src/components/calendar/WeekCalendarGrid.tsx |
| 2 | Add logout Dialog confirmation and profile edit cancel button | 2c8b246 | src/components/nav/AppNav.tsx, src/components/profile/ProfileSetupWizard.tsx |

## What Was Built

### Task 1: Calendar Frozen Panes + View Persistence

- **Corner cell** (`gridColumn:1, gridRow:1`): Added `sticky top-0 left-0 z-20` — anchors the intersection cell when scrolling both axes.
- **Time label cells** (`gridColumn:1, gridRow:N>=2`): Added `sticky left-0 z-[8] bg-background` — the 72px time column stays visible on horizontal scroll.
- **Day header cells** already had `sticky top-0 z-10` — no change needed.
- **localStorage key** updated from `tennis-schedule-view` to `tc-calendar-view` (standardised prefix). The `useEffect` initialises from saved value; `handleViewChange` saves on every toggle.
- Outer `overflow-x-auto` wrapper left intact — no `overflow-y` constraint added (this is required for vertical stickiness to work).

### Task 2: Logout Dialog + Profile Cancel

**AppNav.tsx:**
- Added `showLogout` state (`useState(false)`).
- Logout button `onClick` changed from `handleLogout` to `() => setShowLogout(true)`.
- Added `Dialog` (from `@/components/ui/dialog`) wrapping a `DialogContent` with title "Log out?", description, and footer with Cancel (`DialogClose` render prop) + confirm button (`bg-orange-500`).
- No `window.confirm()` or `alert()` used.

**ProfileSetupWizard.tsx:**
- Added `import Link from 'next/link'`.
- Added Cancel link (`href="/profile"`) above the step indicator, right-aligned. Returns user to `/profile` view without state cleanup (wizard is re-entrant).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] localStorage key mismatch**
- **Found during:** Task 1
- **Issue:** Existing code used `tennis-schedule-view` as the localStorage key; plan specified `tc-calendar-view`. Standardising to the `tc-` prefix prevents collisions and matches the project's naming convention.
- **Fix:** Updated `getItem`/`setItem` calls to use `tc-calendar-view` key.
- **Files modified:** src/components/calendar/WeekCalendarGrid.tsx
- **Commit:** 05d55bd

**2. [Rule 2 - API adaptation] DialogClose render prop for Cancel button**
- **Found during:** Task 2
- **Issue:** Plan showed `<DialogClose asChild><Button>Cancel</Button></DialogClose>` but `@base-ui/react` uses a `render` prop instead of `asChild`. The `DialogClose` wrapper in `ui/dialog.tsx` uses `DialogPrimitive.Close` which accepts `render={<Button />}`.
- **Fix:** Used `<DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>` to match the actual @base-ui/react API.
- **Files modified:** src/components/nav/AppNav.tsx
- **Commit:** 2c8b246

## Known Stubs

None — all functionality is fully wired.

## Threat Flags

None — changes are display-only UI preferences and a dialog confirmation. No new network endpoints or auth paths introduced.

## Self-Check: PASSED

- [x] src/components/calendar/WeekCalendarGrid.tsx — modified, contains `sticky left-0`, `tc-calendar-view`, `z-20`
- [x] src/components/nav/AppNav.tsx — modified, contains `showLogout`, `DialogContent`, `Log out?`, `bg-orange-500`
- [x] src/components/profile/ProfileSetupWizard.tsx — modified, contains `href="/profile"` Cancel link
- [x] Commit 05d55bd exists
- [x] Commit 2c8b246 exists
- [x] TypeScript compiles without errors (`npx tsc --noEmit` passes)
