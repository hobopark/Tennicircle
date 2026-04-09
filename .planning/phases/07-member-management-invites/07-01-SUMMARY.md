---
phase: 07-member-management-invites
plan: 01
subsystem: member-management
tags: [junction-table, rls, server-actions, types]
dependency_graph:
  requires: [07-00]
  provides: [coach_client_assignments table DDL, CoachClientAssignment type, assignClient action, removeClientAssignment action]
  affects: [07-02, 07-03]
tech_stack:
  added: []
  patterns: [junction-table-rls, server-action-role-guard, coach-self-lookup]
key_files:
  created:
    - supabase/migrations/00008_coach_client_assignments.sql
  modified:
    - src/lib/types/auth.ts
    - src/lib/actions/members.ts
decisions:
  - coach_id column on community_members deprecated (not dropped) for backward compatibility — new code reads from coach_client_assignments
  - users_insert_own_membership policy added to community_members to enable open sign-up flow (MGMT-04)
  - duplicate key error on assignClient handled at application layer (checks 'duplicate' and 'unique' in error message)
metrics:
  duration_minutes: 8
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 7 Plan 01: Coach Client Assignments Junction Table and Server Actions Summary

**One-liner:** Junction table `coach_client_assignments` with 4 RLS policies enables multi-coach-per-client model (D-10); `assignClient` and `removeClientAssignment` server actions with role guards wrap the table for UI consumption.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create junction table migration and CoachClientAssignment type | 3cde743 | supabase/migrations/00008_coach_client_assignments.sql, src/lib/types/auth.ts |
| 2 | Implement assignClient and removeClientAssignment server actions | b3099a0 | src/lib/actions/members.ts |

## What Was Built

### Migration: `supabase/migrations/00008_coach_client_assignments.sql`

New junction table replacing the single `community_members.coach_id` FK with a many-to-many relationship:

- `coach_client_assignments` table with `community_id`, `coach_member_id`, `client_member_id`, `assigned_at`, and a unique constraint on `(coach_member_id, client_member_id)`
- 4 RLS policies on `coach_client_assignments`:
  1. `assignments_read_own_community` — all community members can read
  2. `coaches_create_own_assignments` — coach/admin can insert (coach_member_id enforced via auth.uid() subquery)
  3. `users_insert_own_assignment` — clients can self-insert for invite sign-up flow
  4. `coaches_delete_own_assignments` — coach/admin can delete own assignments
- 1 additional RLS policy on `community_members`:
  - `users_insert_own_membership` — users can self-insert their own membership row (open sign-up MGMT-04)
- `community_members.coach_id` column deprecated via SQL comment (not dropped)

### Type: `src/lib/types/auth.ts`

Added `CoachClientAssignment` interface after `InviteLink`:

```typescript
export interface CoachClientAssignment {
  id: string
  community_id: string
  coach_member_id: string
  client_member_id: string
  assigned_at: string
}
```

### Actions: `src/lib/actions/members.ts`

Two new exported server actions:

- **`assignClient(clientMemberId)`** — coach/admin only; self-looks up own `community_members.id`, inserts into `coach_client_assignments`; handles duplicate key gracefully
- **`removeClientAssignment(clientMemberId)`** — coach/admin only; deletes the row matching own `coach_member_id` + `client_member_id`; existing `removeMember` and other actions unchanged

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

All security surfaces covered by plan's threat model:
- T-07-01: Role guard on `assignClient` (coach/admin check) + RLS `coaches_create_own_assignments`
- T-07-02: `removeClientAssignment` filters by both `coach_member_id` (self) and `client_member_id` + RLS delete policy
- T-07-03: RLS insert policy uses `auth.uid()` subquery to enforce `coach_member_id` ownership
- T-07-04: Accepted — all community members can read assignments (by design)
- T-07-13: `users_insert_own_membership` restricts to `user_id = auth.uid()`
- T-07-14: `users_insert_own_assignment` restricts to own `client_member_id` via subquery

No new unplanned trust boundaries introduced.

## Known Stubs

None — this plan is a data/action layer; no UI components with placeholder data.

## Self-Check: PASSED

- supabase/migrations/00008_coach_client_assignments.sql: FOUND
- src/lib/types/auth.ts contains CoachClientAssignment: FOUND
- src/lib/actions/members.ts contains assignClient: FOUND
- src/lib/actions/members.ts contains removeClientAssignment: FOUND
- Commits 3cde743 and b3099a0: FOUND
- TypeScript compilation: PASSED (npx tsc --noEmit exits 0)
