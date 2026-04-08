# Phase 5: Notifications - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 05-notifications
**Areas discussed:** Delivery mechanism, Realtime, Reminders, Navigation

---

## Delivery Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| In-app feed only | Bell icon in nav with unread badge + notification list page. No email/push for MVP. Supabase Realtime for instant delivery. | ✓ |
| In-app feed + email digest | Same bell/feed plus a daily email summary of unread notifications. | |
| Toast-only (no feed) | Just flash a toast when the user is online. No persistent feed or history. | |

**User's choice:** In-app feed only
**Notes:** Simplest MVP approach. Email/push can be added in a future phase.

---

## Realtime Delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Realtime via Supabase | Subscribe to postgres_changes on notifications table. Bell badge updates live. | ✓ |
| On page refresh only | Fetch unread count on each page load via server component. | |

**User's choice:** Realtime via Supabase
**Notes:** More engaging UX — notifications feel instant.

---

## Session Reminder Timing

| Option | Description | Selected |
|--------|-------------|----------|
| 24 hours before | One reminder the day before. Requires scheduled job. | ✓ |
| 24h + 1h before | Two reminders — day-before plus 1-hour warning. | |
| You decide | Claude picks the timing. | |

**User's choice:** 24 hours before
**Notes:** Single reminder keeps notification volume manageable.

---

## Navigation Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom nav tab | Add Notifications tab in bottom nav bar. Unread badge on icon. | ✓ |
| Top-right header icon | Fixed bell icon in top-right corner of screen. | |

**User's choice:** Bottom nav tab
**Notes:** Consistent with the app's mobile-first bottom nav pattern.

---

## Claude's Discretion

- Notification data model (table schema, fields)
- Read/unread tracking mechanism
- Mark-all-as-read UX
- Notification grouping or ordering strategy
- Deep-link navigation from notifications

## Deferred Ideas

None — discussion stayed within phase scope.
