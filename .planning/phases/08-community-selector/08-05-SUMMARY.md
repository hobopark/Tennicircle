---
phase: 08-community-selector
plan: 05
subsystem: community-join-approval
tags: [join-requests, approval-flow, loading-skeletons, nav-badge, ui]
dependency_graph:
  requires: [08-01, 08-02, 08-03, 08-04]
  provides: [join-request-approval-ui, loading-skeletons]
  affects: [coach-clients-page, app-nav]
tech_stack:
  added: []
  patterns: [optimistic-ui, useTransition, orange-theme-dialogs]
key_files:
  created:
    - src/components/communities/PendingRequestsSection.tsx
    - src/components/communities/RejectRequestDialog.tsx
    - src/app/c/[slug]/coach/clients/RosterClientWrapper.tsx
    - src/app/c/[slug]/sessions/calendar/loading.tsx
    - src/app/c/[slug]/notifications/loading.tsx
    - src/app/c/[slug]/admin/loading.tsx
  modified:
    - src/app/c/[slug]/coach/clients/page.tsx
    - src/components/nav/AppNav.tsx
decisions:
  - "Optimistic row removal on approve: filter visibleRequests state immediately on success"
  - "RejectRequestDialog uses plain button with bg-orange-500 class (not Button variant=destructive) to comply with no-red rule"
  - "AppNav fetches pending count client-side via useEffect to avoid layout prop drilling"
metrics:
  duration_minutes: 35
  completed_at: "2026-04-09T17:06:36Z"
  tasks_completed: 1
  tasks_total: 2
  files_created: 6
  files_modified: 2
---

# Phase 8 Plan 05: Join Request Approval UI + Loading Skeletons Summary

**One-liner:** Join request approval flow with orange-themed reject dialog, optimistic roster updates, pending count badge on Clients nav tab, and 12 loading skeletons across all community routes.

## What Was Built

### Task 1: Pending requests section, reject dialog, roster integration, nav badge, and loading skeletons

**A. RejectRequestDialog** (`src/components/communities/RejectRequestDialog.tsx`)
- `'use client'` component using Base UI Dialog via shadcn wrapper
- Orange confirm button (`bg-orange-500 hover:bg-orange-600 text-white`) — no red per project convention
- `useTransition` for loading state during server action call
- Toast feedback: neutral "Request rejected." on success, error toast on failure

**B. PendingRequestsSection** (`src/components/communities/PendingRequestsSection.tsx`)
- Shows all pending requests with avatar (real photo or `InitialsAvatar`), name, formatted join date (Australia/Sydney timezone)
- Orange header card (`border-orange-200 bg-orange-50`) with count badge (`bg-orange-100 text-orange-700`)
- Per-row: "Approve Member" primary button + "Reject" outline button with orange hover
- Optimistic UI: removes approved rows from `visibleRequests` state immediately on success
- Calls `approveJoinRequest()` / opens `RejectRequestDialog` for reject

**C. RosterClientWrapper** (`src/app/c/[slug]/coach/clients/RosterClientWrapper.tsx`)
- `'use client'` gate component: reads `role` from `useCommunity()`, renders `PendingRequestsSection` only for admin/coach

**D. clients/page.tsx updates**
- Calls `getPendingRequests(community.id)` server-side after auth/role check
- Passes `pendingRequests` and `communitySlug` to `RosterClientWrapper` above roster list

**E. AppNav pending count badge**
- `useEffect` fetches `getPendingRequests()` for admin/coach roles on community change
- Orange badge (`bg-orange-500`) on Clients tab icon when `pendingCount > 0`
- `aria-label` for accessibility

**F. Loading skeletons** (3 new files, all use `Skeleton` component):
- `src/app/c/[slug]/sessions/calendar/loading.tsx` — header + week grid + rows
- `src/app/c/[slug]/notifications/loading.tsx` — header + 4 notification rows
- `src/app/c/[slug]/admin/loading.tsx` — header + 2 admin panels
- Total loading.tsx files under `/c/[slug]/`: **12**

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is wired to real server actions.

## Pending Human Action (Task 2 — Checkpoint)

Task 2 is a `checkpoint:human-action` that requires manual steps in Supabase Dashboard:

1. **Push SQL migration** — copy `supabase/migrations/00009_phase8_community_selector.sql` into Supabase SQL Editor and run
2. **Remove Custom Access Token Hook** — Supabase Dashboard → Authentication → Hooks → disable the Custom Access Token hook
3. **Add SUPABASE_SERVICE_ROLE_KEY** — Supabase Dashboard → Settings → API → copy service_role key → add to `.env.local` and Vercel env vars

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | f0b08e9 | feat(08-05): join request approval UI, nav badge, and loading skeletons |

## Self-Check

- [x] `src/components/communities/PendingRequestsSection.tsx` exists with `approveJoinRequest` and `InitialsAvatar`
- [x] `src/components/communities/RejectRequestDialog.tsx` exists with `bg-orange-500`, no `bg-red`/`bg-destructive`
- [x] `src/app/c/[slug]/coach/clients/page.tsx` contains `getPendingRequests`
- [x] `src/components/nav/AppNav.tsx` contains `pendingCount`
- [x] 12 loading.tsx files exist under `src/app/c/[slug]/`
- [x] Commit f0b08e9 exists

## Self-Check: PASSED
