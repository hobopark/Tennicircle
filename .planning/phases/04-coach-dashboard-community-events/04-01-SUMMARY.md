---
phase: "04-coach-dashboard-community-events"
plan: "01"
subsystem: "events-foundation"
tags: ["database", "schema", "rls", "typescript", "zod", "shadcn"]
dependency_graph:
  requires: []
  provides: ["events-schema", "events-types", "events-validations", "shadcn-dialog", "shadcn-select", "shadcn-skeleton"]
  affects: ["04-02", "04-03", "04-04", "04-05", "04-06"]
tech_stack:
  added: ["shadcn/dialog", "shadcn/select", "shadcn/skeleton"]
  patterns: ["community-scoped RLS via JWT claims", "Zod 4 { error: } syntax", "z.coerce.number() for form fields"]
key_files:
  created:
    - "supabase/migrations/00005_events_schema.sql"
    - "src/lib/types/events.ts"
    - "src/lib/validations/events.ts"
    - "src/components/ui/dialog.tsx"
    - "src/components/ui/select.tsx"
    - "src/components/ui/skeleton.tsx"
  modified: []
decisions:
  - "starts_at split into starts_at_date + starts_at_time separate form fields — combined in server action to timestamptz"
  - "event_rsvps INSERT RLS uses auth.uid() lookup to prevent spoofed member_id (T-04-05)"
  - "is_official=true restricted to coach/admin at RLS level not application level (T-04-02)"
metrics:
  duration_minutes: 12
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 6
  files_modified: 0
---

# Phase 04 Plan 01: Events Foundation — Schema, Types, Validations, Components Summary

**One-liner:** Supabase events schema with community-scoped RLS (JWT claims), TypeScript mirror types, Zod 4 validations, and shadcn Dialog/Select/Skeleton installs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Database migration — events, event_rsvps, announcements + RLS + storage | dcbe616 | supabase/migrations/00005_events_schema.sql |
| 2 | TypeScript types, Zod validations, shadcn component installs | 3b06d6b | src/lib/types/events.ts, src/lib/validations/events.ts, 3 shadcn UI files |

## What Was Built

### Task 1: Database Migration

Created `supabase/migrations/00005_events_schema.sql` with:

- **events table**: community_id, created_by, event_type (tournament/social/open_session), title, venue, starts_at, capacity, is_official, draw_image_url, cancelled_at
- **event_rsvps table**: event_id, member_id, rsvp_type (confirmed/waitlisted), waitlist_position, cancelled_at; unique constraint on (event_id, member_id)
- **announcements table**: community_id, created_by, title, body, created_at, updated_at
- RLS enabled on all 3 tables with community-scoped policies using `((select auth.jwt()) ->> 'community_id')::uuid` pattern
- All STRIDE threats mitigated: T-04-01 through T-04-05
- event-draws storage bucket (public) for tournament draw images
- Performance indexes: idx_events_community_starts, idx_event_rsvps_event, idx_event_rsvps_member, idx_announcements_community

### Task 2: TypeScript + Zod + shadcn

- **src/lib/types/events.ts**: Event, EventWithCreator, EventWithRsvpStatus, EventRsvp, EventRsvpWithMember, Announcement, AnnouncementWithAuthor, EventActionResult, EventRsvpActionResult, AnnouncementActionResult, EVENT_TYPE_LABELS
- **src/lib/validations/events.ts**: CreateEventSchema (Zod 4, starts_at as two fields), CreateAnnouncementSchema (title 80 chars, body 400 chars)
- **shadcn components installed**: dialog.tsx, select.tsx, skeleton.tsx

## Decisions Made

1. **starts_at split into two fields**: `starts_at_date` and `starts_at_time` in Zod schema — server action combines them into a single `timestamptz`. Matches existing form patterns and avoids datetime-local browser inconsistencies.

2. **is_official restricted at RLS level**: The `is_official = false OR user_role in ('admin', 'coach')` check is in the INSERT policy — cannot be bypassed at application level (T-04-02).

3. **event_rsvps member_id verified via auth.uid() lookup**: INSERT policy subquery prevents any user from RSVPing as a different member (T-04-05).

## Deviations from Plan

None — plan executed exactly as written. The `npx next build` verify step revealed a pre-existing Suspense boundary failure in `/auth` (predates this plan). TypeScript compilation (`tsc --noEmit`) passes cleanly. See deferred-items.md.

## Known Stubs

None. This plan produces schema and type definitions only — no UI rendering or data-fetching stubs.

## Threat Flags

No new threat surface beyond what was enumerated in the plan's threat model. All T-04-01 through T-04-05 mitigations are implemented.

## Self-Check: PASSED

Files exist:
- supabase/migrations/00005_events_schema.sql: FOUND
- src/lib/types/events.ts: FOUND
- src/lib/validations/events.ts: FOUND
- src/components/ui/dialog.tsx: FOUND
- src/components/ui/select.tsx: FOUND
- src/components/ui/skeleton.tsx: FOUND

Commits exist:
- dcbe616: FOUND (feat(04-01): add events schema migration with RLS and storage bucket)
- 3b06d6b: FOUND (feat(04-01): add events TypeScript types, Zod validations, and shadcn components)
