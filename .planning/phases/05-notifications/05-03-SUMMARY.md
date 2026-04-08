---
phase: 05-notifications
plan: 03
subsystem: notifications
tags: [ui, realtime, feed, navigation, supabase-realtime, framer-motion]
dependency_graph:
  requires:
    - src/lib/types/notifications.ts
    - src/lib/actions/notifications.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
  provides:
    - src/app/notifications/page.tsx
    - src/app/notifications/loading.tsx
    - src/components/notifications/NotificationFeed.tsx
    - src/components/notifications/NotificationRow.tsx
  affects:
    - src/components/nav/AppNav.tsx
tech_stack:
  added: []
  patterns:
    - Server component initial fetch + client Realtime subscription hybrid
    - Optimistic UI for mark-as-read (local state before server action)
    - framer-motion stagger entrance animation (max 5 items)
    - Absolute-positioned badge on nav icon with live count
    - Supabase postgres_changes subscription scoped to member_id
key_files:
  created:
    - src/app/notifications/page.tsx
    - src/app/notifications/loading.tsx
    - src/components/notifications/NotificationFeed.tsx
    - src/components/notifications/NotificationRow.tsx
  modified:
    - src/components/nav/AppNav.tsx
decisions:
  - Empty state heading lives in NotificationFeed (not page.tsx) because Mark All button depends on client unreadCount state
  - resolveDeepLink uses metadata cast to Record<string,string> to handle discriminated union without exhaustive type narrowing
  - Realtime INSERT callback increments unreadCount; UPDATE event re-fetches exact count to avoid drift
  - Notifications tab added between Events and Profile in NAV_TABS order
  - useEffect in AppNav converted from pure .then() chain to async callback to support member_id fetch after role set
metrics:
  duration_minutes: 15
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 4
  files_modified: 1
---

# Phase 05 Plan 03: Notification Feed UI and Bell Badge Summary

**One-liner:** Notification feed page with Supabase Realtime live updates, framer-motion stagger entrance, optimistic mark-as-read, and a live unread badge on the AppNav bell tab for all roles.

## What Was Built

### Task 1: Notification feed page and components (D-01, D-02)

`src/app/notifications/page.tsx` — Server component with `export const dynamic = 'force-dynamic'`. Fetches the authenticated user's `community_members.id`, then retrieves up to 50 notifications ordered by `created_at desc`. Passes `initialNotifications` and `memberId` to `<NotificationFeed />`.

`src/app/notifications/loading.tsx` — Skeleton fallback with 3 rows matching notification row dimensions. Uses `aria-label="Loading notifications"` per UI-SPEC copywriting contract.

`src/components/notifications/NotificationFeed.tsx` — Client component (`'use client'`):
- Local state: `notifications` (initialized from server fetch), `unreadCount` (computed from `read_at === null` count)
- Supabase Realtime `postgres_changes` INSERT subscription filtered to `member_id=eq.${memberId}` — prepends new rows and increments `unreadCount`
- `handleRowTap`: optimistic read state + `setUnreadCount(prev => Math.max(0, prev - 1))` before fire-and-forget `markNotificationRead()`
- `handleMarkAllRead`: optimistic bulk read state + `setUnreadCount(0)` then `markAllNotificationsRead()`
- `resolveDeepLink`: routes each type to correct path (session_id, /events, resource_type/resource_id)
- framer-motion stagger on first 5 items; empty state with Bell icon + copywriting from UI-SPEC

`src/components/notifications/NotificationRow.tsx` — Presentational button element:
- Unread: `bg-card border-l-2 border-primary` + `font-semibold` title
- Read: `bg-muted/40` + `font-normal` title
- `active:scale-[0.98]` press animation
- `CalendarDays`, `Megaphone`, `CheckCircle2` icons with `aria-label` on container and `aria-hidden` on icon
- `formatRelativeTime` inline helper (Just now / Xm ago / Xh ago / Xd ago / en-AU date)

### Task 2: Bell icon with unread badge to AppNav (D-06)

`src/components/nav/AppNav.tsx` — Modified:
- Added `Bell` to lucide-react imports
- Added `unreadCount` and `memberId` state variables
- Extended existing `useEffect` to fetch `community_members.id` and initial unread count after role is set
- Added second `useEffect` subscribing to `nav-notifications` Realtime channel — INSERT increments count, UPDATE re-fetches exact count
- Added Notifications tab (all roles) in NAV_TABS between Events and Profile
- Badge renders inside notification tab icon: `absolute -top-1 -right-1 w-5 h-5 rounded-full`, capped at "9+"

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired. The feed reads from the `notifications` table (created in Plan 01); the Realtime subscription receives live inserts from Plans 02 and 04 trigger points.

## Threat Flags

No new security surface beyond the plan's threat model.

- T-05-08 (Information Disclosure): Realtime subscription filtered with `member_id=eq.${memberId}` — scoped to own member only. RLS SELECT policy enforces at DB level.
- T-05-09 (Tampering): `markNotificationRead` and `markAllNotificationsRead` both double-scope updates to the authenticated member's rows; no client-supplied `member_id` accepted.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/app/notifications/page.tsx | FOUND |
| src/app/notifications/loading.tsx | FOUND |
| src/components/notifications/NotificationFeed.tsx | FOUND |
| src/components/notifications/NotificationRow.tsx | FOUND |
| src/components/nav/AppNav.tsx (modified) | FOUND |
| Commit 55eaf68 (Task 1 feed components) | FOUND |
| Commit 19e191b (Task 2 AppNav bell badge) | FOUND |
| npx tsc --noEmit | PASSED |
