---
phase: 05-notifications
plan: 01
subsystem: notifications
tags: [database, rls, types, server-actions, security]
dependency_graph:
  requires: [supabase/migrations/00005_events_schema.sql, src/lib/supabase/server.ts]
  provides: [notifications table schema, NotificationType, NotificationRow, markAllNotificationsRead, markNotificationRead]
  affects: [src/lib/actions/announcements.ts, src/lib/actions/rsvps.ts, src/lib/actions/events.ts]
tech_stack:
  added: []
  patterns: [service_role-only INSERT, member-scoped RLS SELECT/UPDATE, JSONB metadata, unique index for cron idempotency, Realtime publication]
key_files:
  created:
    - supabase/migrations/00006_notifications_schema.sql
    - src/lib/types/notifications.ts
    - src/lib/actions/notifications.ts
  modified: []
decisions:
  - INSERT policy restricted to service_role only — no authenticated-user INSERT prevents horizontal privilege escalation (T-05-03)
  - JSONB metadata column for type-specific payload — avoids nullable FK sprawl for 4 notification types
  - unique index on (member_id, notification_type, metadata->>'session_id') for cron idempotency
  - mark-as-read actions use regular user-scoped client (not service_role) — RLS UPDATE policy handles member-scoping
metrics:
  duration_minutes: 12
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 3
---

# Phase 05 Plan 01: Notifications Schema and Types Summary

**One-liner:** Notifications table with service_role-only INSERT RLS, JSONB metadata for 4 types, TypeScript discriminated union types, and member-scoped mark-as-read server actions.

## What Was Built

### Task 1: Notifications Table Migration
`supabase/migrations/00006_notifications_schema.sql` — Complete DDL for the `notifications` table:
- Single table scoped to `community_id` and `member_id` with a `notification_type` check constraint (4 types)
- JSONB `metadata` column carries type-specific payload (session_id, announcement_id, resource_id)
- `read_at timestamptz` tracks unread state (null = unread)
- RLS: member-scoped SELECT and UPDATE, service_role-only INSERT
- Unique index `notifications_session_reminder_unique` on `(member_id, notification_type, metadata->>'session_id')` for cron idempotency
- Performance indexes: `idx_notifications_member_created`, `idx_notifications_community`, `idx_notifications_unread`
- `alter publication supabase_realtime add table public.notifications` enables live feed updates (Plan 02)

### Task 2: TypeScript Types and Server Actions
`src/lib/types/notifications.ts` — Exports:
- `NotificationType` — union of 4 literal string types matching DB check constraint
- `NotificationMetadata` — discriminated union of 3 metadata shapes (session_reminder, announcement, rsvp_confirmed/waitlist_promoted)
- `NotificationRow` — database row interface
- `NotificationActionResult` — `{ success: boolean; error?: string }` matching project pattern

`src/lib/actions/notifications.ts` — Exports:
- `markAllNotificationsRead()` — marks all `read_at is null` rows for the authenticated member; auth → member lookup → bulk update → revalidatePath
- `markNotificationRead(notificationId)` — marks single notification read; double-scopes the update query with both `id` and `member_id` to prevent horizontal privilege escalation

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan is data foundation only (no UI components). Types and actions are fully wired. Downstream plans (02, 03, 04) consume these exports.

## Threat Flags

No new security surface beyond the plan's threat model. The `notifications` table is the intended new surface; all three threat mitigations (T-05-01, T-05-02, T-05-03) are implemented as specified.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| supabase/migrations/00006_notifications_schema.sql | FOUND |
| src/lib/types/notifications.ts | FOUND |
| src/lib/actions/notifications.ts | FOUND |
| Commit 7173b61 (Task 1 migration) | FOUND |
| Commit 658a240 (Task 2 types + actions) | FOUND |
