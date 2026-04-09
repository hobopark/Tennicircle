---
phase: 06-polish-launch-readiness
plan: 02
subsystem: rsvp-concurrency
tags: [rsvp, postgres, rpc, concurrency, atomic, security]
dependency_graph:
  requires: ["06-00"]
  provides: ["atomic-rsvp-function", "rsvp-concurrency-fix"]
  affects: ["src/lib/actions/rsvps.ts", "src/components/sessions/RsvpSessionButton.tsx"]
tech_stack:
  added: []
  patterns: ["SECURITY DEFINER RPC", "FOR UPDATE row lock", "single-RPC server action"]
key_files:
  created:
    - supabase/migrations/00007_atomic_rsvp_rpc.sql
  modified:
    - src/lib/actions/rsvps.ts
    - src/components/sessions/RsvpSessionButton.tsx
decisions:
  - "Use SECURITY DEFINER + SET search_path = public on atomic_rsvp to prevent search-path injection (T-06-04)"
  - "member_id resolved server-side from auth.getUser() — never from client input (T-06-05)"
  - "Upsert pattern: reactivate cancelled RSVP rather than inserting duplicate row"
metrics:
  duration_minutes: 12
  completed_date: "2026-04-09"
  tasks_completed: 1
  tasks_pending_human: 1
  files_changed: 3
---

# Phase 06 Plan 02: Atomic RSVP Race Condition Fix Summary

**One-liner:** Replaced 6-step TOCTOU RSVP logic with a single `atomic_rsvp()` Postgres function using `FOR UPDATE` row lock to prevent double-booking under concurrent access.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create atomic RSVP Postgres function and refactor rsvps.ts | dad7102 | supabase/migrations/00007_atomic_rsvp_rpc.sql, src/lib/actions/rsvps.ts, src/components/sessions/RsvpSessionButton.tsx |

## Task 2: CHECKPOINT — Human Action Required

**Status:** Blocked — awaiting manual schema push to Supabase.

**Why:** This project pushes schema manually via Supabase SQL Editor (not via CLI). The `atomic_rsvp` function must be registered in Supabase before the application can call it via `supabase.rpc('atomic_rsvp', ...)`.

**Steps for the user:**
1. Open Supabase Dashboard -> SQL Editor
2. Copy the contents of `supabase/migrations/00007_atomic_rsvp_rpc.sql`
3. Paste and run the SQL in the editor
4. Verify the function appears under Database -> Functions -> `atomic_rsvp`
5. Confirm with test query:
   ```sql
   select atomic_rsvp(
     '00000000-0000-0000-0000-000000000000'::uuid,
     '00000000-0000-0000-0000-000000000000'::uuid,
     '00000000-0000-0000-0000-000000000000'::uuid
   );
   -- Expected: {"error": "Session not found or cancelled", "success": false}
   ```

## What Was Built

### Migration: `supabase/migrations/00007_atomic_rsvp_rpc.sql`

Defines `public.atomic_rsvp(p_session_id, p_member_id, p_community_id)` returning `jsonb`:

- Acquires `FOR UPDATE` lock on the `sessions` row — serializes all concurrent RSVPs for the same session
- Validates session exists and is not cancelled
- Checks session_invitations for private sessions
- Checks for existing active RSVP (idempotency)
- Counts confirmed RSVPs under lock — no TOCTOU window
- If confirmed < capacity: inserts as `'confirmed'`
- If confirmed >= capacity: inserts as `'waitlisted'` with sequential position
- Upsert: reactivates a previously cancelled RSVP rather than inserting a duplicate
- `SECURITY DEFINER` + `SET search_path = public` prevents search-path injection

### Refactor: `src/lib/actions/rsvps.ts`

`rsvpSession()` now:
- Keeps the authentication block unchanged (member_id resolved server-side from `auth.getUser()`)
- Replaces 6 sequential round-trips with a single `supabase.rpc('atomic_rsvp', {...})` call
- Notification logic (NOTF-03) unchanged — fires after successful RPC result
- `cancelRsvp`, `promoteFromWaitlist`, `removeFromWaitlist` unchanged

### Update: `src/components/sessions/RsvpSessionButton.tsx`

Waitlist toast updated from:
> "Session is full. You're on the waitlist (position N)."

To (per D-06):
> "Session just filled — you're #N on the waitlist"

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The RPC call is fully wired. The only gap is the schema not yet pushed to Supabase (Task 2 checkpoint).

## Threat Surface Scan

No new network endpoints or auth paths introduced. The `atomic_rsvp` function is callable only via the authenticated Supabase client (RLS enforced at connection level). Security posture improved vs. the previous multi-round-trip approach.

| Flag | File | Description |
|------|------|-------------|
| (none) | — | No new trust boundaries introduced |

## Self-Check: PASSED

- [x] `supabase/migrations/00007_atomic_rsvp_rpc.sql` exists
- [x] Migration contains `create or replace function public.atomic_rsvp`
- [x] Migration contains `for update`
- [x] Migration contains `security definer`
- [x] Migration contains `set search_path = public`
- [x] `src/lib/actions/rsvps.ts` contains `supabase.rpc('atomic_rsvp'`
- [x] `src/lib/actions/rsvps.ts` does NOT contain old `select('capacity, cancelled_at` in rsvpSession
- [x] `src/components/sessions/RsvpSessionButton.tsx` contains `Session just filled`
- [x] `npx tsc --noEmit` passes with no errors
- [x] Commit dad7102 exists
