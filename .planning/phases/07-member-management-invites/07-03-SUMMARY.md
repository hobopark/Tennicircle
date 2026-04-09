---
phase: 07-member-management-invites
plan: 03
subsystem: member-management-ui
tags: [roster, invite, member-card, role-management, client-assignment]
dependency_graph:
  requires: [07-01, 07-02]
  provides: [MGMT-01, MGMT-02, MGMT-03, MGMT-05, MGMT-07]
  affects: [src/components/members/, src/app/coach/clients/]
tech_stack:
  added: []
  patterns: [server-component-with-client-islands, url-based-toggle, dialog-confirmation, clipboard-api]
key_files:
  created:
    - src/components/members/InviteButton.tsx
    - src/components/members/MemberCard.tsx
    - src/components/members/RemoveMemberDialog.tsx
    - src/components/members/RosterToggle.tsx
    - src/app/coach/clients/RosterClientWrapper.tsx
  modified:
    - src/app/coach/clients/page.tsx
    - src/lib/actions/members.ts
decisions:
  - "Role selector (coach/client) shown only to admins in InviteButton per D-01; server action enforces regardless"
  - "RosterToggle navigates via router.push URL param (not useState) so server re-fetches filtered data"
  - "MemberCard actions hidden on own card via isSelf prop to prevent self-demotion (T-07-11)"
  - "hasProfile filter removed from roster page — pending members visible with dimmed opacity-60 (D-05/MGMT-07)"
metrics:
  duration_minutes: 35
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_modified: 7
requirements: [MGMT-01, MGMT-02, MGMT-03, MGMT-05, MGMT-07]
---

# Phase 07 Plan 03: Roster UI — Invite, Member Cards, Role Management Summary

**One-liner:** Complete roster UI with invite clipboard flow, role-badged member cards with inline admin/coach actions, orange-confirm remove dialog, and searchParam-driven My clients / All members toggle replacing the old clients-only filtered page.

## What Was Built

### Task 1: InviteButton, RemoveMemberDialog, RosterToggle (commit 56bd18f)

**InviteButton** (`src/components/members/InviteButton.tsx`):
- Admin sees a `<select>` with Client/Coach options; coach sees no selector (hardcoded client per D-01)
- Calls `createInviteLink(role)` server action, constructs `window.location.origin/auth?invite={token}` URL
- Copies to clipboard via `navigator.clipboard.writeText`; falls back to inline toast with URL if clipboard blocked
- `useTransition` for pending state; shows "Generating..." during server round-trip

**RemoveMemberDialog** (`src/components/members/RemoveMemberDialog.tsx`):
- Styled Dialog using base-ui Dialog primitive (not browser `confirm()`)
- Orange confirm button: `bg-orange-500 hover:bg-orange-600` (not destructive red per project memory)
- Calls `removeMember(memberId)`, toasts success, closes dialog, refreshes router

**RosterToggle** (`src/components/members/RosterToggle.tsx`):
- Segmented control (two buttons in a `bg-muted` container)
- Active tab shows `bg-card shadow-sm`; inactive shows `text-muted-foreground`
- Accepts `value` and `onChange` props — stateless, driven by parent

Also restored `assignClient` and `removeClientAssignment` to `members.ts` (Rule 3 deviation — see below).

### Task 2: MemberCard + roster page rewrite (commit 7b17ee8)

**MemberCard** (`src/components/members/MemberCard.tsx`):
- Shows avatar (photo or InitialsAvatar), name, role badge with role-specific colors (admin=amber, coach=blue, client=emerald)
- Pending members: `opacity-60` dimming + "Profile pending" badge instead of metadata
- Expand chevron reveals inline action buttons for coaches and admins
- Coach actions on client cards: "Assign to me" / "Remove from my clients" (toggle based on `isAssignedToMe`)
- Admin actions: "Promote to Coach", "Grant Admin", "Demote to Client", orange "Remove" (triggers RemoveMemberDialog)
- `isSelf=false` always passed from page (self excluded from member list by query)

**RosterClientWrapper** (`src/app/coach/clients/RosterClientWrapper.tsx`):
- Thin `'use client'` wrapper around RosterToggle
- On toggle: calls `router.push('/coach/clients?view={value}')` to navigate with URL param
- Server page reads `searchParams` and re-fetches filtered data

**Roster page rewrite** (`src/app/coach/clients/page.tsx`):
- Removed `.in('role', ['client', 'member'])` filter — now fetches ALL community members
- Removed `.filter(p => p.hasProfile)` — all members shown regardless of profile state
- Queries `coach_client_assignments` to build `myClientIds` set (for toggle filter) and `clientCoachMap` (for coach name display on cards)
- `viewMode` read from `await searchParams` per Next.js 16 async API
- InviteButton rendered in page header for all coaches and admins
- Title changed from "Players" to "Members"
- Empty states differentiated: "No clients assigned" (my-clients) vs "No members yet" (all-members)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored assignClient and removeClientAssignment to members.ts**
- **Found during:** Task 1 setup — `MemberCard` imports these but they were absent
- **Issue:** The 07-02 commit (`ce38554`) rewrote `members.ts` and accidentally dropped the two functions that 07-01 added (`assignClient`, `removeClientAssignment`). The 07-01 SUMMARY confirmed they were created at commit `b3099a0`, but 07-02 replaced the entire file content without carrying them forward.
- **Fix:** Re-added both functions with identical logic to what was in 07-01: role guard (coach/admin only), self-lookup of `community_members.id`, insert/delete into `coach_client_assignments`, duplicate key handling for `assignClient`
- **Files modified:** `src/lib/actions/members.ts`
- **Commit:** 56bd18f (bundled with Task 1)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 56bd18f | feat(07-03): create InviteButton, RemoveMemberDialog, and RosterToggle components |
| 2 | 7b17ee8 | feat(07-03): create MemberCard and rework roster page to be role-adaptive |

## Known Stubs

None — all components are fully wired to real server actions and the page fetches live Supabase data.

## Threat Surface Scan

All threats in the plan's threat model are addressed:
- T-07-08: `updateMemberRole` server action enforces admin-only; UI hides buttons via `viewerRole === 'admin'` conditional
- T-07-09: `createInviteLink` enforces `role === 'coach' && userRole !== 'admin'` guard; UI shows select only to admins
- T-07-10: Accepted — all community members visible to coaches/admins by design; RLS scopes to own community
- T-07-11: `isSelf=false` always passed (self excluded from query with `.neq('id', selfMember?.id)`); no self-demotion possible

No new unplanned trust boundaries introduced.

## Self-Check: PASSED

- src/components/members/InviteButton.tsx: FOUND
- src/components/members/RemoveMemberDialog.tsx: FOUND
- src/components/members/RosterToggle.tsx: FOUND
- src/components/members/MemberCard.tsx: FOUND
- src/app/coach/clients/RosterClientWrapper.tsx: FOUND
- src/app/coach/clients/page.tsx: MODIFIED (no hasProfile filter, no role filter, has coach_client_assignments, has InviteButton, title is "Members")
- Commits 56bd18f and 7b17ee8: FOUND
- TypeScript: only pre-existing error in src/__tests__/waitlist-display.test.ts (out of scope); no errors in new files
