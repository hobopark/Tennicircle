---
phase: 05-notifications
plan: 02
subsystem: notifications
tags: [server-actions, cron, service-role, rls, notifications, vercel]
dependency_graph:
  requires:
    - supabase/migrations/00006_notifications_schema.sql
    - src/lib/types/notifications.ts
    - src/lib/supabase/server.ts
    - src/lib/actions/announcements.ts
    - src/lib/actions/rsvps.ts
    - src/lib/actions/events.ts
  provides:
    - src/lib/supabase/service.ts (createServiceClient)
    - src/lib/utils/dates.ts (formatDateTime)
    - src/app/api/cron/session-reminders/route.ts (GET handler)
    - vercel.json (cron schedule)
    - notification inserts in announcements, rsvps, events actions
  affects:
    - Plan 03 (notification feed UI — reads from populated notifications table)
    - Plan 04 (bell badge — unread count depends on rows existing)
tech_stack:
  added: []
  patterns:
    - service_role client for RLS-bypassing notification inserts
    - fire-and-forget .then(() => {}) pattern for non-blocking side-effects
    - Vercel Cron with CRON_SECRET Bearer auth guard
    - plain .insert() (not .upsert()) for cron idempotency via DB unique index
    - 24h–25h look-ahead window for Hobby plan timing imprecision
key_files:
  created:
    - src/lib/supabase/service.ts
    - src/lib/utils/dates.ts
    - src/app/api/cron/session-reminders/route.ts
    - vercel.json
  modified:
    - src/lib/actions/announcements.ts
    - src/lib/actions/rsvps.ts
    - src/lib/actions/events.ts
decisions:
  - service_role client isolated to service.ts — single audit point for SUPABASE_SERVICE_ROLE_KEY usage
  - fire-and-forget inserts (.then(() => {})) keep parent server actions non-blocking; notification failures are silently swallowed per D-04/D-05 design
  - plain .insert() chosen over .upsert() because onConflict cannot target partial expression indexes (notifications_session_reminder_unique); 23505 code caught and logged
  - cancelEventRsvp extended with auto-promotion logic (was missing from original) to support waitlist_promoted notification
metrics:
  duration_minutes: 8
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 4
---

# Phase 05 Plan 02: Notification Triggers and Cron Endpoint Summary

**One-liner:** Service-role notification inserts wired into announcement, RSVP, and waitlist-promotion actions plus a Vercel Cron endpoint for 24h session reminders with idempotency via DB unique index.

## What Was Built

### Task 1: Service Client and Action Notification Inserts

`src/lib/supabase/service.ts` — Shared `createServiceClient()` using `SUPABASE_SERVICE_ROLE_KEY`. Bypasses RLS INSERT restriction (T-05-03). Single import point for auditing service-role usage.

`src/lib/utils/dates.ts` — `formatDateTime(isoString)` utility producing locale-formatted strings like "Wed, 4 Jun · 6:00 pm" for notification body copy.

`src/lib/actions/announcements.ts` — After successful announcement insert, queries all community members excluding the poster (`.neq('id', member.id)`), then fan-outs `notification_type: 'announcement'` rows via service client. Fire-and-forget.

`src/lib/actions/rsvps.ts` — Two notification points added:
- `rsvpSession`: inserts `notification_type: 'rsvp_confirmed'` for the member when `rsvpType === 'confirmed'`
- `promoteFromWaitlist`: inserts `notification_type: 'waitlist_promoted'` for the promoted member after the update succeeds

`src/lib/actions/events.ts` — Three notification points added:
- `rsvpEvent`: event select extended to include `title, starts_at`; inserts `rsvp_confirmed` notification when confirmed
- `cancelEventRsvp`: extended with auto-promotion logic (query next waitlisted member, promote, notify with `waitlist_promoted`); uses `getJWTClaims` for community_id

### Task 2: Vercel Cron Endpoint

`src/app/api/cron/session-reminders/route.ts` — GET handler:
- `Authorization: Bearer $CRON_SECRET` check on first line (T-05-04), returns 401 on failure
- Queries sessions in a 24h–25h look-ahead window (accommodates Hobby plan timing imprecision)
- Joins `session_rsvps!inner` to get confirmed, non-cancelled attendees
- Builds notification rows with `notification_type: 'session_reminder'` and metadata `{ session_id, scheduled_at }`
- Plain `.insert()` — 23505 unique constraint violation (idempotent re-run) logged and swallowed; other errors logged to console
- Returns diagnostic JSON: `{ sessionsFound, notificationsQueued, inserted, window }`

`vercel.json` — Cron schedule `0 20 * * *` = 8:00 PM UTC = 6:00 AM AEST next day.

## Deviations from Plan

### Auto-added: `src/lib/utils/dates.ts`

**Rule 3 - Blocking Issue**

- **Found during:** Task 1
- **Issue:** Plan's `read_first` list referenced `src/lib/utils/dates.ts` with `formatDateTime()` but the file did not exist in the repo. Notification body copy in all three action files requires this utility.
- **Fix:** Created `src/lib/utils/dates.ts` with `formatDateTime()` producing locale-formatted date+time strings.
- **Files modified:** `src/lib/utils/dates.ts` (created)
- **Commit:** 4eabb26

### Auto-extended: `cancelEventRsvp` waitlist promotion logic

**Rule 2 - Missing Critical Functionality**

- **Found during:** Task 1
- **Issue:** Original `cancelEventRsvp` only cancelled the RSVP and returned — no waitlist promotion existed (unlike `cancelRsvp` in rsvps.ts which also lacked auto-promotion but the plan's NOTF-03 trigger for events required it). The plan explicitly says to add `waitlist_promoted` notification inside `if (nextWaitlisted)` but the block itself was absent.
- **Fix:** Added auto-promotion: query next waitlisted member by position, promote to confirmed, then insert `waitlist_promoted` notification.
- **Files modified:** `src/lib/actions/events.ts`
- **Commit:** 4eabb26

## Known Stubs

None — all notification inserts are fully wired with real data from DB queries. No placeholder values.

## Threat Flags

No new security surface beyond the plan's threat model. T-05-04 (CRON_SECRET guard) and T-05-05 (service_role key isolation) are fully implemented.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/lib/supabase/service.ts | FOUND |
| src/lib/utils/dates.ts | FOUND |
| src/app/api/cron/session-reminders/route.ts | FOUND |
| vercel.json | FOUND |
| announcements.ts imports createServiceClient | FOUND |
| rsvps.ts imports createServiceClient | FOUND |
| events.ts imports createServiceClient | FOUND |
| Commit 4eabb26 (Task 1) | FOUND |
| Commit fd7fbff (Task 2) | FOUND |
| npx tsc --noEmit passes | PASSED |
