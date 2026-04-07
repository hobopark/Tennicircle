---
phase: 02-session-management
plan: 02
subsystem: rsvp-server-actions
tags: [server-actions, rsvp, waitlist, session-cancellation, auth]
dependency_graph:
  requires: [02-01]
  provides: [rsvp-actions, session-cancel-action]
  affects: [04-rsvp-ui, 05-coach-dashboard]
tech_stack:
  added: []
  patterns:
    - Server Actions with 'use server' directive and getUser() auth pattern
    - Capacity-aware RSVP with DB trigger as final guard against overbooking (T-02-10)
    - FIFO waitlist resequencing via created_at ordering after cancellation/promotion
    - Role check via user.app_metadata.user_role for coach-scoped mutations
key_files:
  created:
    - src/lib/actions/rsvps.ts
    - src/lib/actions/sessions.ts
  modified: []
decisions:
  - "resequenceWaitlist is a private helper (not exported) — only called internally after cancellation or promotion"
  - "promoteFromWaitlist checks capacity before promoting — not just DB trigger — for better UX error messages"
  - "cancelRsvp fetches rsvp_type before cancelling so it knows whether waitlist resequencing is needed"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_changed: 2
---

# Phase 2 Plan 02: RSVP and Session Cancellation Server Actions Summary

Capacity-aware RSVP system with confirmed/waitlisted determination, FIFO waitlist resequencing after cancellations or promotions, coach-role-gated promotion and removal actions, and session cancellation with validated reason — all using getUser() for server-side JWT validation.

## What Was Built

### Task 1: RSVP Server Actions (4ea2fff9)

`src/lib/actions/rsvps.ts` — four exported server actions:

- **`rsvpSession(sessionId)`:** Fetches member from community_members (not client input — T-02-09 spoofing mitigation), checks session is not cancelled, counts active confirmed RSVPs, inserts as 'confirmed' if under capacity or 'waitlisted' with sequential position if at capacity. DB trigger `check_session_capacity` is the final overbooking guard (T-02-10).

- **`cancelRsvp(sessionId)`:** Fetches the active RSVP by member_id to confirm ownership (T-02-08 tampering mitigation), sets `cancelled_at`, then resequences waitlist if the cancelled RSVP was waitlisted.

- **`promoteFromWaitlist(rsvpId)`:** Coach/admin-only (T-02-07). Verifies RSVP is waitlisted and not cancelled, checks confirmed count vs capacity, updates to 'confirmed' with null waitlist_position, then resequences remaining waitlist.

- **`removeFromWaitlist(rsvpId)`:** Coach/admin-only. Verifies RSVP is waitlisted and not cancelled, sets `cancelled_at`, then resequences remaining waitlist.

- **`resequenceWaitlist` (private helper):** Selects all non-cancelled waitlisted RSVPs for a session ordered by `created_at` (FIFO), then updates each `waitlist_position` to its 1-based index.

All four functions call `revalidatePath('/sessions')` and `revalidatePath('/coach')`.

### Task 2: Session Cancellation Action (2f55cc17)

`src/lib/actions/sessions.ts` — one exported server action:

- **`cancelSession(sessionId, formData)`:** Validates `cancellation_reason` from FormData using `CancelSessionSchema.safeParse()`, returns `fieldErrors` on validation failure, checks user is coach or admin, sets `cancelled_at` and `cancellation_reason` on the sessions row, revalidates both paths.

- Placeholder comments for `createSessionTemplate` and `editSession` (added in Plan 03).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — these are pure server-side action files with no UI rendering. All four RSVP actions and the cancel action are fully implemented with complete business logic.

## Threat Flags

No new network endpoints introduced. All surface was already in the threat model:
- T-02-07: promoteFromWaitlist role check implemented
- T-02-08: cancelRsvp member_id ownership filter implemented
- T-02-09: rsvpSession derives member_id from getUser() lookup (not client input)
- T-02-10: DB trigger is final guard; application check is UX-only

## Self-Check: PASSED

- `src/lib/actions/rsvps.ts` exists and exports all 4 functions
- `src/lib/actions/sessions.ts` exists and exports cancelSession
- Commits 4ea2fff9 and 2f55cc17 verified in git log
- `npx tsc --noEmit` passes with no errors
