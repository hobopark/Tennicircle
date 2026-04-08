---
phase: 04-coach-dashboard-community-events
plan: 02
subsystem: ui
tags: [supabase, server-actions, react, events, announcements, rsvp, storage]

# Dependency graph
requires:
  - phase: 04-01
    provides: types/events.ts, validations/events.ts, DB schema (events, event_rsvps, announcements tables)

provides:
  - createEvent server action (is_official from JWT, not formData)
  - rsvpEvent server action (capacity enforcement + waitlist)
  - cancelEventRsvp server action
  - deleteEvent server action (creator/admin auth check)
  - createAnnouncement server action (coach/admin role guard)
  - EventCard component (type badges, spots pill, RSVP status)
  - AnnouncementCard component
  - CreateEventDialog component (multi-step with type selector)
  - EventRsvpButton component (with cancel confirmation dialog)
  - DrawImageUpload component (Supabase event-draws bucket)

affects: [04-03, 04-04, events-page, coach-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server action pattern extended to events/announcements (createClient -> getUser -> getJWTClaims -> member lookup -> DB op -> revalidatePath)
    - is_official computed server-side from JWT role claim — never trusted from form input
    - useActionState with typed initial state (EventActionResult, AnnouncementActionResult)
    - DrawImageUpload follows AvatarUpload pattern (browser client, Supabase Storage, upsert)

key-files:
  created:
    - src/lib/actions/events.ts
    - src/lib/actions/announcements.ts
    - src/components/events/EventCard.tsx
    - src/components/events/AnnouncementCard.tsx
    - src/components/events/CreateEventDialog.tsx
    - src/components/events/EventRsvpButton.tsx
    - src/components/events/DrawImageUpload.tsx
  modified: []

key-decisions:
  - "is_official derived from claims.user_role in server action — formData.get('is_official') never called (T-04-02)"
  - "DrawImageUpload uses event-draws Supabase Storage bucket — path: communityId/eventId/draw-timestamp"
  - "CreateEventDialog uses typed initial state (EventActionResult) to satisfy TypeScript for useActionState"
  - "Pre-existing /auth Suspense boundary build failure is not caused by this plan — confirmed by stash test"

patterns-established:
  - "Event server actions: auth -> claims -> member -> validate -> DB -> revalidatePath('/events')"
  - "Client-side file upload: validate type + size -> Supabase storage.upload -> getPublicUrl -> callback"
  - "Multi-step dialog: step state + useEffect to reset on open/close + useActionState for form submission"

requirements-completed:
  - EVNT-01
  - EVNT-02
  - EVNT-03
  - EVNT-04
  - EVNT-05

# Metrics
duration: 20min
completed: 2026-04-08
---

# Phase 4 Plan 02: Events Action Layer & UI Components Summary

**5 server actions and 5 client components for event RSVP, creation, and announcement posting — is_official enforced via JWT role claim, capacity/waitlist logic, and AceHub-spec type badge color map**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-08T03:56:00Z
- **Completed:** 2026-04-08T04:16:52Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 5 server actions: createEvent, rsvpEvent, cancelEventRsvp, deleteEvent (events.ts) and createAnnouncement (announcements.ts) — all following established rsvps.ts pattern
- T-04-02 security: is_official computed server-side from JWT role — `formData.get('is_official')` never called
- T-04-05/06/08 security: role check before announcement, member_id from auth.uid lookup, creator/admin check before delete
- 5 'use client' UI components: EventCard, AnnouncementCard, CreateEventDialog (2-step), EventRsvpButton (with cancel dialog), DrawImageUpload

## Task Commits

1. **Task 1: Server actions for events and announcements** - `76e7788` (feat)
2. **Task 2: Event UI components** - `b8eaf0e` (feat)

## Files Created/Modified

- `src/lib/actions/events.ts` — createEvent, rsvpEvent, cancelEventRsvp, deleteEvent server actions
- `src/lib/actions/announcements.ts` — createAnnouncement server action with coach/admin role guard
- `src/components/events/EventCard.tsx` — type badge color map (tournament/social/open_session), spots pill, RSVP status badge
- `src/components/events/AnnouncementCard.tsx` — ANNOUNCEMENT badge, line-clamp-3 body, optional edit button
- `src/components/events/CreateEventDialog.tsx` — 2-step dialog: type selector (Trophy/PartyPopper/Zap icons) + adaptive form; useActionState for events and announcements
- `src/components/events/EventRsvpButton.tsx` — Join/cancel flow with useTransition, cancel confirmation Dialog, Sonner toasts
- `src/components/events/DrawImageUpload.tsx` — Supabase event-draws bucket, 5MB client-side validation, preview thumbnail

## Decisions Made

- Used typed initial state `const initialEventState: EventActionResult = { success: false }` to satisfy TypeScript for `useActionState` — required because `{ success: false }` alone doesn't have `fieldErrors` property
- CreateEventDialog takes `communityId` prop (optional) for DrawImageUpload; only shown for tournament type
- VenueAutocomplete not used in CreateEventDialog (it queries session_templates — not appropriate for events); plain Input used instead for venue

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Typed useActionState initial state for TypeScript**
- **Found during:** Task 2 (CreateEventDialog)
- **Issue:** TypeScript error: Property 'fieldErrors' does not exist on type `{ success: boolean }` — initial state was untyped
- **Fix:** Added `EventActionResult` and `AnnouncementActionResult` type annotations to initial state constants
- **Files modified:** src/components/events/CreateEventDialog.tsx
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** b8eaf0e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript bug)
**Impact on plan:** Necessary for type safety. No scope creep.

## Issues Encountered

- Pre-existing `/auth` Suspense boundary build error (`useSearchParams()` should be wrapped in Suspense) in the worktree. Confirmed pre-existing by stashing changes and running the build — same failure. Not caused by this plan. Logged as out-of-scope.
- TypeScript type error on `useActionState` initial state — fixed inline (see Deviations).

## User Setup Required

None — no new external service configuration required. `event-draws` Supabase Storage bucket must be created by an admin, which is part of the DB migration plan (04-01 scope).

## Next Phase Readiness

- All 5 server actions ready for use by events page (plan 04-03/04-04)
- All 5 UI components exportable — EventCard and AnnouncementCard are display-ready; CreateEventDialog is wired to actions
- EventRsvpButton can be dropped into any event list page
- DrawImageUpload is self-contained with storage upload

---
*Phase: 04-coach-dashboard-community-events*
*Completed: 2026-04-08*

## Self-Check: PASSED

- FOUND: src/lib/actions/events.ts
- FOUND: src/lib/actions/announcements.ts
- FOUND: src/components/events/EventCard.tsx
- FOUND: src/components/events/AnnouncementCard.tsx
- FOUND: src/components/events/CreateEventDialog.tsx
- FOUND: src/components/events/EventRsvpButton.tsx
- FOUND: src/components/events/DrawImageUpload.tsx
- FOUND: .planning/phases/04-coach-dashboard-community-events/04-02-SUMMARY.md
- FOUND commit 76e7788 (Task 1)
- FOUND commit b8eaf0e (Task 2)
