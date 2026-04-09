---
phase: 07-member-management-invites
plan: 02
subsystem: member-management
tags: [open-signup, junction-table, welcome-page, client-onboarding]
dependency_graph:
  requires: [07-01]
  provides: [MGMT-04]
  affects: [src/lib/actions/members.ts, src/components/welcome/WelcomePage.tsx]
tech_stack:
  added: []
  patterns: [server-action, useEffect-auto-join, session-refresh-after-role-change]
key_files:
  created: []
  modified:
    - src/lib/actions/members.ts
    - src/components/welcome/WelcomePage.tsx
decisions:
  - "joinCommunityAsClient hardcodes role='client' — user cannot self-escalate (T-07-05)"
  - "processInviteSignup junction insert failure is non-fatal — membership succeeds, coach reassigns manually"
  - "WelcomePage handles 'Already a community member' gracefully by refreshing session instead of showing error"
metrics:
  duration_minutes: 20
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_modified: 2
requirements: [MGMT-04]
---

# Phase 07 Plan 02: Open Sign-Up Gap Closure Summary

**One-liner:** JWT-aware auto-join on /welcome page using joinCommunityAsClient server action and coach_client_assignments junction table for invite sign-ups.

## What Was Built

### Task 1: joinCommunityAsClient + processInviteSignup refactor (commit 49f6c69)

Added `joinCommunityAsClient` to `src/lib/actions/members.ts` — a server action for MGMT-04. When a user signs up without an invite token, they arrive at /welcome with `user_role='pending'` and no community_members row. This action:

1. Verifies the user is authenticated
2. Checks they are not already a community member (via `maybeSingle()`)
3. Fetches the single community (MVP single-tenant assumption)
4. Inserts a `community_members` row with `role: 'client'`
5. Returns `{ success: true }` or a descriptive error

Also updated `processInviteSignup` to:
- Remove the deprecated `coach_id` field from the `community_members` insert
- Select the new member's `id` from the insert response
- Insert into `coach_client_assignments` when `invite.role === 'client'` (backed by `users_insert_own_assignment` RLS policy)
- Log assignment failure without failing the overall sign-up

### Task 2: WelcomePage auto-join (commit 9454b23)

Updated `src/components/welcome/WelcomePage.tsx` to detect `role === 'pending'` and automatically call `joinCommunityAsClient`. The component:

1. Uses a second `useEffect` that fires when `role === 'pending'` and `joining === false`
2. Shows a `Loader2` spinner with "Joining community..." during the async operation
3. On success: calls `supabase.auth.refreshSession()` and re-reads the JWT to update `role` state (triggering redirect logic)
4. On "Already a community member": refreshes session to recover the correct role
5. On other errors: shows a toast via `sonner`

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 49f6c69 | feat(07-02): add joinCommunityAsClient action and update processInviteSignup for junction table |
| 2 | 9454b23 | feat(07-02): auto-join pending users as clients on welcome page |

## Known Stubs

None — both actions are fully wired. The `joinCommunityAsClient` reads from the real `communities` table and inserts into `community_members`.

## Threat Surface Scan

No new network endpoints introduced. The `joinCommunityAsClient` server action is callable from any authenticated client but is safe: it hardcodes `role: 'client'` (T-07-05 mitigation) and checks for existing membership (T-07-06 mitigation).

## Self-Check: PASSED

- `src/lib/actions/members.ts` modified and committed at 49f6c69
- `src/components/welcome/WelcomePage.tsx` modified and committed at 9454b23
- TypeScript compiles cleanly for both files
- All 12 acceptance criteria verified
