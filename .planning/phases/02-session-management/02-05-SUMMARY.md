---
phase: 02-session-management
plan: 05
subsystem: client-sessions-ui
tags: [sessions, rsvp, client-view, dialogs, waitlist]
dependency_graph:
  requires: [02-00, 02-02]
  provides: [client-sessions-page, rsvp-flow, waitlist-flow, cancel-flow]
  affects: [/sessions route]
tech_stack:
  added: []
  patterns:
    - "@base-ui/react Dialog controlled via open/onOpenChange"
    - "Intl.DateTimeFormat for locale-aware date/time (no date-fns installed)"
    - "useTransition for server action pending state in dialogs"
    - "RLS-scoped Supabase query for session listing"
key_files:
  created:
    - src/app/sessions/page.tsx
    - src/app/sessions/loading.tsx
    - src/components/sessions/SessionCard.tsx
    - src/components/sessions/SessionCardSkeleton.tsx
    - src/components/sessions/RsvpButton.tsx
    - src/components/sessions/RsvpDialog.tsx
    - src/components/sessions/CancelRsvpDialog.tsx
  modified: []
decisions:
  - "Used Intl.DateTimeFormat instead of date-fns (not installed) for date/time formatting"
  - "SessionCard renders RsvpButton inline — dialogs are siblings inside the button component to keep open state co-located"
  - "RsvpButton uses useState (not useTransition) for dialog visibility; dialogs manage their own useTransition for server action calls"
  - "Mobile bottom-sheet dialog: fixed bottom-0 with rounded-t-2xl, sm: breakpoint switches to centered modal"
metrics:
  duration: 15
  completed_date: "2026-04-07"
  tasks: 2
  files: 7
---

# Phase 02 Plan 05: Client Sessions Page and RSVP Flow Summary

Client-facing sessions page with card layout, five-state RSVP button, confirmation dialog, waitlist handling, and cancel-with-courtesy-reminder dialog using @base-ui/react Dialog primitives.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Client sessions page and session card component | 9585b47d |
| 2 | RSVP button, confirmation dialog, and cancel dialog | 11e57884 |

## What Was Built

### Task 1: Sessions Page + Session Card

**`src/app/sessions/page.tsx`** — Server Component. Fetches upcoming sessions via Supabase with RLS scoping (clients only see sessions from their assigned coach). Enriches sessions with: coach display name (resolved from template -> community_members -> email prefix), confirmed/waitlist counts, user's own RSVP record, and attendee name list (up to 5 confirmed RSVPs). Shows "Your Sessions" heading (28px display font) or "No sessions yet" empty state.

**`src/components/sessions/SessionCard.tsx`** — `'use client'` component. Renders all 6 content rows per UI-SPEC: date+time row (CalendarDays + Clock icons), venue row (MapPin icon with optional court number), coach name, spots remaining (accent color `#C4D82E` when ≤ 3), attendee avatar preview (up to 4 circles with initials, "+N more" overflow label), and action row with RsvpButton. Cancelled session variant applies `opacity-60` class, strikethrough on date/time row, and shows "Cancelled: {reason}" instead of action button.

**`src/components/sessions/SessionCardSkeleton.tsx`** — Pure render skeleton with `animate-pulse` blocks matching card layout.

**`src/app/sessions/loading.tsx`** — Renders 4 SessionCardSkeletons with title placeholder.

### Task 2: RSVP Button + Dialogs

**`src/components/sessions/RsvpButton.tsx`** — `'use client'` component with 5 distinct states:
1. Available: "Join session" primary fill — opens RsvpDialog
2. Full: "Join waitlist" secondary outline — opens RsvpDialog with isWaitlist=true
3. Confirmed: "You're in" ghost success green + CheckCircle icon — opens CancelRsvpDialog
4. Waitlisted: "{N}th on waitlist" secondary outline (ordinal helper) — opens CancelRsvpDialog
5. Loading: Spinner, min-w-[140px] to prevent layout shift

**`src/components/sessions/RsvpDialog.tsx`** — `'use client'` component. Heading "Join this session?" (20px display font). Shows sessionLabel as body copy and optional waitlist note. Calls `rsvpSession(sessionId)` on confirm — toasts "You're in!" for confirmed, "Added to waitlist — {N} in line" for waitlisted, error message for failures.

**`src/components/sessions/CancelRsvpDialog.tsx`** — `'use client'` component. Heading "Cancel your spot?", body with courtesy reminder "Heads up — if you're a regular, let your coach know you won't be there." Buttons: "Keep my spot" (ghost) and "Yes, cancel" (destructive). Calls `cancelRsvp(sessionId)` on confirm, toasts "RSVP cancelled" on success.

Both dialogs use `@base-ui/react Dialog` with mobile bottom-sheet pattern (fixed bottom-0, rounded top corners) switching to centered modal at sm: breakpoint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used Intl.DateTimeFormat instead of date-fns**
- **Found during:** Task 1
- **Issue:** Plan specified `date-fns` `format()` but `date-fns` is not installed in the project
- **Fix:** Used `Intl.DateTimeFormat` with `en-AU` locale for equivalent formatting (e.g. "Tuesday, 8 Apr" / "6:00 pm")
- **Files modified:** `src/components/sessions/SessionCard.tsx`
- **Commit:** 9585b47d

**2. [Rule 2 - Missing critical functionality] Added null check for unauthenticated user in sessions page**
- **Found during:** Task 1
- **Issue:** Plan's server component assumed `user` would always be present after RLS, but middleware may allow the request through in some edge cases
- **Fix:** Added early return with "Not signed in" message if `user` is null
- **Files modified:** `src/app/sessions/page.tsx`
- **Commit:** 9585b47d

## Known Stubs

**Coach name resolution** (`src/app/sessions/page.tsx`, enrichedSessions map):
- Coach display name falls back to email prefix (`user_id.split('@')[0]`) when no `display_name` column exists on `community_members`.
- This is intentional for Phase 2 MVP. If a `display_name` column is added to `community_members`, the resolution in page.tsx should swap `mp.user_id.split('@')[0]` for `mp.display_name`.
- The attendee name resolution already handles `display_name` via `mp.display_name ?? mp.user_id?.split('@')[0]`.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. All data access goes through existing Supabase RLS. Server actions `rsvpSession` and `cancelRsvp` were implemented in Plan 02-02 — this plan only adds the UI layer that calls them. T-02-16 mitigation confirmed: `member_id` is derived server-side from `getUser()` in the RSVP action, not from any client prop.

## Self-Check: PASSED

Files created:
- FOUND: src/app/sessions/page.tsx
- FOUND: src/app/sessions/loading.tsx
- FOUND: src/components/sessions/SessionCard.tsx
- FOUND: src/components/sessions/SessionCardSkeleton.tsx
- FOUND: src/components/sessions/RsvpButton.tsx
- FOUND: src/components/sessions/RsvpDialog.tsx
- FOUND: src/components/sessions/CancelRsvpDialog.tsx

Commits:
- FOUND: 9585b47d
- FOUND: 11e57884

TypeScript: `npx tsc --noEmit` passes (no output = no errors)
