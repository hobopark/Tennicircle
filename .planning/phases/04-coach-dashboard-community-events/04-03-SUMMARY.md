---
phase: 04-coach-dashboard-community-events
plan: 03
subsystem: coach-dashboard
tags: [calendar, day-view, attendance, player-roster, framer-motion]
dependency_graph:
  requires: [04-01]
  provides: [day-week-schedule-toggle, attendee-preview, player-attendance-dates]
  affects: [WeekCalendarGrid, coach-schedule-page, player-roster-page]
tech_stack:
  added: []
  patterns:
    - framer-motion stagger animation (motion.div with delay: index * 0.05)
    - localStorage view preference with useEffect hydration-safe pattern
    - Two-step attendance query (session_rsvps -> sessions merge in JS)
    - attendeeData prop pattern (Record<sessionId, {confirmedCount, capacity, attendeePreview}>)
key_files:
  created:
    - src/app/coach/clients/loading.tsx
  modified:
    - src/components/calendar/WeekCalendarGrid.tsx
    - src/app/coach/page.tsx
    - src/app/coach/clients/page.tsx
    - src/app/auth/page.tsx
decisions:
  - Use default 'week' view and read localStorage in useEffect to avoid SSR hydration mismatch
  - Two-step RSVP attendance query (established codebase pattern from coach/page.tsx) rather than inner join
  - attendeeData fetched server-side and passed as prop to keep WeekCalendarGrid a pure Client Component
metrics:
  duration_minutes: 35
  completed_date: "2026-04-08T04:20:41Z"
  tasks_completed: 2
  files_modified: 5
---

# Phase 4 Plan 3: Coach Schedule Day/Week Toggle and Player Roster Attendance Summary

Enhanced the coach dashboard with a day/week schedule toggle (localStorage-persistent), day view showing session cards with framer-motion stagger animations and attendee avatar strips, and a player roster page that displays first lesson and last session dates per player.

## Tasks Completed

### Task 1: Coach schedule day/week toggle with day view and inline attendance preview

**Commits:** `73e510f`

Extended `WeekCalendarGrid.tsx` with:
- Day/Week toggle pill (`bg-muted rounded-full` container, `bg-accent text-accent-foreground` active segment) stored in `tennis-schedule-view` localStorage key
- `useEffect` reads saved preference after mount (avoids SSR hydration mismatch; defaults to `'week'`)
- Day view: date navigation row (`ChevronLeft`/`ChevronRight` with `aria-label`), session cards (`bg-card rounded-3xl border border-border/50`), `CalendarX` empty state
- Session cards show time, title, venue (`MapPin`), attendee count badge, avatar strip (`flex -space-x-1`, max 5 + overflow pill)
- framer-motion `motion.div` with `initial={{ opacity: 0, y: -10 }}`, stagger via `delay: index * 0.05`
- `attendeeData` prop (`Record<string, SessionAttendeeData>`) flowing enriched data from server into grid
- Week view gains `confirmedCount/capacity` badge on session blocks

Updated `coach/page.tsx`:
- Added Query 3: `session_rsvps` fetch with `community_members` join for attendee names/avatars
- Built `attendeeDataMap` keyed by session ID, passed as `attendeeData` to `WeekCalendarGrid`
- Updated header to `px-5 pt-14 pb-24`, `mb-4`, `font-heading font-bold text-2xl`

### Task 2: Player roster with attendance dates

**Commits:** `57fae72`

Enhanced `coach/clients/page.tsx`:
- Two-step attendance fetch: `session_rsvps` (confirmed, not cancelled) → `sessions` (scheduled_at) merged in JS
- Computes `firstLesson` (min scheduled_at) and `lastSession` (max scheduled_at) per member
- Player rows show `Last session: {date}` and `First lesson: {date}` in `text-[10px] text-muted-foreground`
- Falls back to `"No sessions yet"` italic for players with no attendance
- Heading updated to `Players ({count})` with `font-heading font-bold text-2xl`
- Empty state: `Users` icon + "No players yet" heading + body text
- `ChevronRight` navigation affordance on each row
- Container: `px-5 pt-14 pb-24`

Created `coach/clients/loading.tsx`: 5-row pulse skeleton (`bg-muted animate-pulse rounded-2xl h-[72px]`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing /auth Suspense boundary missing**
- **Found during:** Task 1 build verification
- **Issue:** `useSearchParams()` in `AuthPage` was not wrapped in a Suspense boundary, causing build failure (`Error occurred prerendering page "/auth"`)
- **Fix:** Wrapped `<AuthPage />` in `<Suspense>` in `src/app/auth/page.tsx`
- **Files modified:** `src/app/auth/page.tsx`
- **Commit:** `73e510f`

**2. [Rule 3 - Blocking] Worktree isolation — writes target worktree path**
- **Found during:** Task 1 initial implementation
- **Issue:** Files written to main repo path (`/Tennicircle/src/...`) were not visible in the worktree at `/Tennicircle/.claude/worktrees/agent-afd6887d/src/...`; git stash during pre-existing bug diagnosis reverted worktree files
- **Fix:** Re-wrote all files explicitly to worktree-absolute paths; confirmed `git status` shows changes in worktree

## Known Stubs

None — all data paths are wired to live Supabase queries. Attendee preview and attendance dates will show real data when RSVPs exist.

## Threat Flags

None — no new network endpoints or auth paths introduced. All queries are community-scoped via existing RLS; coach seeing player attendance is the intended use case (T-04-10 accepted in threat model).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/components/calendar/WeekCalendarGrid.tsx | FOUND |
| src/app/coach/page.tsx | FOUND |
| src/app/coach/clients/page.tsx | FOUND |
| src/app/coach/clients/loading.tsx | FOUND |
| Commit 73e510f | FOUND |
| Commit 57fae72 | FOUND |
