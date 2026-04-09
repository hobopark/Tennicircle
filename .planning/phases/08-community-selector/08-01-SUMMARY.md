---
phase: 08-community-selector
plan: 01
subsystem: auth-rls-foundation
tags: [rls, auth, community, sql-migration, typescript]
dependency_graph:
  requires: []
  provides: [rls-membership-based, join-requests-table, community-context, getUserRole, createServiceClient, community-actions]
  affects: [all-subsequent-08-plans, supabase-rls, proxy-rewrite]
tech_stack:
  added: [CommunityProvider context, createServiceClient, getUserRole helper]
  patterns: [membership-based RLS, EXISTS subquery pattern, service role for cross-boundary writes]
key_files:
  created:
    - supabase/migrations/00009_phase8_community_selector.sql
    - src/lib/context/community.tsx
    - src/lib/actions/communities.ts
    - src/lib/actions/communities.test.ts
    - src/lib/supabase/middleware.test.ts
  modified:
    - src/lib/types/auth.ts
    - src/lib/supabase/server.ts
decisions:
  - "JWTCustomClaims kept as deprecated interface for backward compat during Plan 02 migration"
  - "admins_manage_members FOR ALL policy split into INSERT/UPDATE/DELETE for correctness"
  - "player_profiles has two SELECT policies: read_own (proxy) + read_community (roster)"
  - "rejectJoinRequest notification only sent if member row exists (future: user-targeted notifs)"
metrics:
  duration_minutes: 35
  completed_date: "2026-04-10"
  tasks_completed: 2
  files_changed: 7
---

# Phase 08 Plan 01: Foundation Layer (RLS Rewrite + Types + Context + Actions) Summary

**One-liner:** Full RLS migration from JWT claims to membership EXISTS checks, join_requests table, CommunityProvider context, and community server actions with global-profile auto-copy on approval.

## What Was Built

### Task 1: SQL Migration (00009_phase8_community_selector.sql)

Complete Supabase migration ready for manual push via SQL Editor:

- **communities.description column** — nullable text column added (D-43)
- **player_profiles.community_id nullable** — drops NOT NULL constraint so global profiles (community_id=NULL) can be created before community selection (D-15)
- **join_requests table** — new table with RLS: users read own, staff read community, self-insert with pending status, staff can update (approve/reject). Unique index on pending-per-user-per-community.
- **Notification CHECK extended** — adds `join_approved` and `join_rejected` to the allowed types
- **Notifications RLS multi-community fix** — replaces LIMIT 1 with IN subquery so multi-community users get all their notifications
- **15 tables RLS rewritten** — 52 DROP POLICY + 59 CREATE POLICY statements. Every policy uses `EXISTS (SELECT 1 FROM public.community_members WHERE user_id = auth.uid() AND community_id = table.community_id)` pattern. Zero `auth.jwt()` references.
- **Custom Access Token Hook dropped** — `DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb)` and the get_user_role() helper (D-10)

Tables covered: communities, community_members, invite_links, session_templates, sessions, session_rsvps, session_coaches, session_invitations, player_profiles, coach_assessments, progress_notes, events, event_rsvps, announcements, coach_client_assignments, storage.objects (avatars)

### Task 2: TypeScript Foundation

**src/lib/types/auth.ts:**
- Removed `JWTCustomClaims` (marked deprecated, kept as interface stub for backward compat during Plan 02)
- Added `JoinRequest` interface matching join_requests table
- Added `description: string | null` to `Community` interface
- Added `getRoleHomeRoute(slug, role)` function for `/c/[slug]/...` routing (D-16)
- Added `AUTHENTICATED_PUBLIC_ROUTES = ['/communities', '/profile', '/profile/setup']`
- Added `ROLE_ALLOWED_ROUTE_PATTERNS` with path suffixes for proxy role checks

**src/lib/supabase/server.ts:**
- Removed `getJWTClaims()` — all callers will be updated in Plan 02
- Added `getUserRole(supabase, communityId)` — queries community_members for role + memberId (D-12)
- Added `createServiceClient()` — service_role client for notification inserts and profile copies

**src/lib/context/community.tsx (new):**
- `CommunityProviderWrapper` — wraps community-scoped pages with context value
- `useCommunity()` — throws if used outside provider (enforces contract)
- `useMaybeCommunity()` — safe variant returning null on global routes (AppNav use)

**src/lib/actions/communities.ts (new):**
All 8 community server actions: `getUserCommunities`, `getCommunityBySlug`, `createCommunity` (with slug collision handling), `requestToJoin`, `cancelJoinRequest`, `approveJoinRequest` (with global-profile auto-copy), `rejectJoinRequest`, `getPendingRequests`, `getBrowseCommunities`.

**Test stubs:**
- `src/lib/actions/communities.test.ts` — 8 .todo stubs
- `src/lib/supabase/middleware.test.ts` — 8 .todo stubs for proxy decision tree

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type error in getUserCommunities Supabase join**
- **Found during:** Task 2 verification (npx tsc --noEmit)
- **Issue:** Supabase SDK typed `row.communities` as an array from join query; TS strict mode rejected the cast to a single object
- **Fix:** Added `as unknown as {...}` double cast to satisfy TypeScript without changing runtime behavior
- **Files modified:** src/lib/actions/communities.ts
- **Commit:** ed1efe5

**2. [Rule 2 - Missing critical functionality] Split admins_manage_members FOR ALL into separate INSERT/UPDATE/DELETE**
- **Found during:** Task 1 SQL writing
- **Issue:** The original `FOR ALL` policy pattern is ambiguous and doesn't separately enforce `WITH CHECK` for INSERT. Splitting into three policies is more explicit and correct.
- **Files modified:** supabase/migrations/00009_phase8_community_selector.sql

### Expected TypeScript Errors (not deviations)

26 TS errors remain from files importing the now-removed `getJWTClaims`. Per plan: "may have errors from other files importing getJWTClaims — expected, fixed in Plan 02."

## Known Stubs

- `src/lib/actions/communities.test.ts` — 8 `.todo` stubs (all community action tests)
- `src/lib/supabase/middleware.test.ts` — 8 `.todo` stubs (proxy decision tree tests)

These are intentional Wave 0 stubs — the plan explicitly calls them out. Implementation in subsequent plans.

## Threat Surface Scan

All mitigations from the plan's threat register are implemented:

| Threat | Mitigation Status |
|--------|------------------|
| T-08-01: join_requests INSERT elevation | RLS: `user_id = auth.uid() AND status = 'pending'` |
| T-08-02: approveJoinRequest elevation | Server action checks caller is admin/coach via DB query |
| T-08-03: RLS policy migration | All 15 tables audited, zero auth.jwt() references |
| T-08-04: communityId spoofing | getUserRole validates caller membership before any action |
| T-08-05: Hook removal | DROP FUNCTION in migration; dashboard binding documented as manual step |

## Self-Check: PASSED

All files present and all commits verified:
- supabase/migrations/00009_phase8_community_selector.sql — FOUND
- src/lib/types/auth.ts — FOUND
- src/lib/supabase/server.ts — FOUND
- src/lib/context/community.tsx — FOUND
- src/lib/actions/communities.ts — FOUND
- src/lib/actions/communities.test.ts — FOUND
- src/lib/supabase/middleware.test.ts — FOUND
- Commit 616f9cc — FOUND
- Commit c70ba18 — FOUND
- Commit ed1efe5 — FOUND
