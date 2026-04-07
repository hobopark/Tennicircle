---
phase: 02-session-management
plan: "04"
subsystem: coach-ui
tags: [calendar, session-detail, waitlist, cancel, coach]
dependency_graph:
  requires: [02-02, 02-03]
  provides: [coach-weekly-calendar, session-detail-page, waitlist-management, session-cancellation]
  affects: [coach-schedule, session-rsvps]
tech_stack:
  added: []
  patterns:
    - CSS Grid calendar with computed gridRow positioning from scheduled_at timestamp
    - Two-query merge strategy for coach session ownership (template-owned + co-coached)
    - base-ui/react Dialog for cancel session modal
    - useTransition for async server action pending state on promote/remove buttons
key_files:
  created:
    - src/components/calendar/WeekCalendarGrid.tsx
    - src/components/sessions/WaitlistPanel.tsx
    - src/components/sessions/CancelSessionDialog.tsx
    - src/components/sessions/SessionDetailPanel.tsx
    - src/app/coach/sessions/[sessionId]/page.tsx
  modified:
    - src/app/coach/page.tsx
decisions:
  - "CSS Grid over FullCalendar library — zero bundle cost, full control over session block positioning"
  - "Two-query strategy for coach session fetch — Supabase JS SDK does not support nested .or() sub-selects; merge + deduplicate in JS"
  - "display_name column fallback to user_id for member names — community_members may or may not have display_name depending on DB state"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-07T05:23:39Z"
  tasks_completed: 2
  files_changed: 6
---

# Phase 02 Plan 04: Coach UI — Calendar and Session Detail Summary

Coach-facing weekly calendar grid (CSS Grid, 32 half-hour rows 06:00–22:00) at `/coach` and session detail page at `/coach/sessions/[id]` with attendee list, waitlist promotion, and session cancellation with required reason.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build coach weekly calendar grid and schedule page | de1af97e | WeekCalendarGrid.tsx, coach/page.tsx |
| 2 | Build session detail page with attendee management | cfb07a44 | WaitlistPanel.tsx, CancelSessionDialog.tsx, SessionDetailPanel.tsx, [sessionId]/page.tsx |

## What Was Built

**WeekCalendarGrid** (`src/components/calendar/WeekCalendarGrid.tsx`):
- `'use client'` component accepting `sessions: Session[]`
- CSS Grid: `grid-template-columns: 60px repeat(7, 1fr)`, `grid-template-rows: 40px repeat(32, 48px)`
- Session block `gridRow` computed from `scheduled_at`: `row = 2 + (hour - 6) * 2 + (minutes >= 30 ? 1 : 0)`
- Cancelled sessions render with `bg-muted` + `line-through` title
- Each block wrapped in `<Link href="/coach/sessions/${id}">` for navigation
- Prev/Next week + Today navigation buttons
- Empty state: "Your schedule is clear" + "Create session" link to `/coach/sessions/new`
- Loading skeleton via optional `loading` prop

**Coach schedule page** (`src/app/coach/page.tsx`):
- Server Component fetching sessions via two-query strategy:
  1. Sessions from templates owned by this coach (via `session_templates.coach_id`)
  2. Sessions where coach appears in `session_coaches`
  - Results merged and deduplicated by session ID in JS
- Renders `WeekCalendarGrid` + "Create session" link button

**WaitlistPanel** (`src/components/sessions/WaitlistPanel.tsx`):
- `'use client'` component with position badge (coral `bg-secondary/10 text-secondary`)
- Each row: position badge + member name + Promote button + Remove button
- `useTransition` for pending state on both actions
- Calls `promoteFromWaitlist(rsvp.id)` and `removeFromWaitlist(rsvp.id)` server actions
- Toast feedback on success/error

**CancelSessionDialog** (`src/components/sessions/CancelSessionDialog.tsx`):
- `'use client'` using `@base-ui/react/dialog` Dialog primitive
- Required text input with validation: submit disabled and error shown when reason is empty
- Calls `cancelSession(sessionId, formData)` with `cancellation_reason`
- Toast "Session cancelled" on success; inline server error on failure

**SessionDetailPanel** (`src/components/sessions/SessionDetailPanel.tsx`):
- `'use client'` with session header (date, time, venue, court, coaches)
- Edit link + Cancel session button hidden when `cancelled_at` is set
- Cancelled sessions show "Cancelled: {reason}" banner in destructive color
- Confirmed attendees section with capacity count
- `WaitlistPanel` component for waitlisted RSVPs

**Session detail page** (`src/app/coach/sessions/[sessionId]/page.tsx`):
- Server Component, `await params` for `sessionId`
- `notFound()` called when session not found
- Fetches session, RSVPs with community_members join, coaches with community_members join
- Resolves member display names from `community_members.display_name` with user_id fallback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Button `asChild` prop not supported**
- **Found during:** Task 2 TypeScript check
- **Issue:** `Button` component from `@base-ui/react/button` does not expose `asChild` prop; the wrapper doesn't forward it
- **Fix:** Replaced `<Button asChild>` wrapping `<Link>` with a raw `<Link>` styled to match ghost/sm button classes
- **Files modified:** `src/components/sessions/SessionDetailPanel.tsx`
- **Commit:** cfb07a44 (fix applied before commit)

## Known Stubs

`community_members.display_name` — The session detail page queries `display_name` from `community_members`. If this column doesn't exist in the DB schema (it was not added in plans 02-00 through 02-03), member names will fall back to `user_id` UUIDs. A future plan should ensure `display_name` is present or wire it from auth.users metadata. This is a data stub, not a code stub.

## Threat Surface

Threat model mitigations from plan:

- **T-02-13 (Information Disclosure):** Session detail page uses `createClient()` (authenticated Supabase client) — RLS on `sessions` and `session_rsvps` tables scopes queries to the coach's community.
- **T-02-14 (Elevation of Privilege):** `promoteFromWaitlist` and `removeFromWaitlist` server actions (in `rsvps.ts`) check `user_role === 'coach' || 'admin'` before any DB writes. Coach-only actions are protected at the action layer.

## Self-Check: PASSED

All created files exist on disk. Both task commits verified in git log.
