---
phase: "08"
plan: "03"
subsystem: routing
tags: [middleware, community-selector, app-router, multi-tenancy]
dependency_graph:
  requires: [08-01, 08-02]
  provides: [community-scoped-routes, proxy-decision-tree, community-layout]
  affects: [all-community-pages, AppNav, profile-page]
tech_stack:
  added: []
  patterns: [D-14-proxy-decision-tree, useMaybeCommunity-dual-mode-nav, defense-in-depth-T-08-09]
key_files:
  created:
    - src/app/c/[slug]/layout.tsx
    - src/app/c/[slug]/admin/page.tsx
    - src/app/c/[slug]/coach/page.tsx
    - src/app/c/[slug]/coach/schedule/page.tsx
    - src/app/c/[slug]/coach/clients/page.tsx
    - src/app/c/[slug]/coach/clients/[memberId]/page.tsx
    - src/app/c/[slug]/coach/sessions/new/page.tsx
    - src/app/c/[slug]/coach/sessions/[sessionId]/page.tsx
    - src/app/c/[slug]/coach/sessions/[sessionId]/edit/page.tsx
    - src/app/c/[slug]/events/page.tsx
    - src/app/c/[slug]/events/[eventId]/page.tsx
    - src/app/c/[slug]/events/[eventId]/edit/page.tsx
    - src/app/c/[slug]/sessions/page.tsx
    - src/app/c/[slug]/sessions/all/page.tsx
    - src/app/c/[slug]/sessions/calendar/page.tsx
    - src/app/c/[slug]/sessions/[sessionId]/page.tsx
    - src/app/c/[slug]/members/[memberId]/page.tsx
    - src/app/c/[slug]/notifications/page.tsx
    - src/app/c/[slug]/coach/loading.tsx
    - src/app/c/[slug]/coach/error.tsx
    - src/app/c/[slug]/coach/schedule/loading.tsx
    - src/app/c/[slug]/coach/clients/loading.tsx
    - src/app/c/[slug]/coach/clients/[memberId]/loading.tsx
    - src/app/c/[slug]/coach/sessions/[sessionId]/loading.tsx
    - src/app/c/[slug]/events/loading.tsx
    - src/app/c/[slug]/events/error.tsx
    - src/app/c/[slug]/events/[eventId]/loading.tsx
    - src/app/c/[slug]/events/[eventId]/edit/loading.tsx
    - src/app/c/[slug]/sessions/loading.tsx
    - src/app/c/[slug]/sessions/error.tsx
  modified:
    - src/lib/supabase/middleware.ts
    - src/components/nav/AppNav.tsx
    - src/app/profile/page.tsx
  deleted:
    - src/app/coach/ (entire directory)
    - src/app/sessions/ (entire directory)
    - src/app/events/ (entire directory)
    - src/app/admin/ (entire directory)
    - src/app/notifications/ (entire directory)
    - src/app/welcome/ (entire directory)
    - src/app/profile/[memberId]/ (moved to /c/[slug]/members/[memberId]/)
decisions:
  - D-14 8-step proxy decision tree implemented in middleware.ts
  - Dual-mode AppNav via useMaybeCommunity() — minimal tabs on global routes, role-based tabs in community context
  - Defense in depth: proxy checks membership AND /c/[slug]/layout.tsx re-verifies (T-08-09)
  - Profile page (/profile) kept at global path, queries first membership for role (D-04)
  - Member profiles moved from /profile/[memberId] to /c/[slug]/members/[memberId] (D-04)
metrics:
  duration: "~90 minutes (across two sessions)"
  completed: "2026-04-10"
  tasks_completed: 2
  files_created: 30
  files_modified: 3
  files_deleted: 29
---

# Phase 08 Plan 03: Community-Scoped Route Migration Summary

**One-liner:** D-14 proxy decision tree + all community pages migrated under `/c/[slug]/` with layout-level CommunityProvider and dual-mode AppNav.

## What Was Built

### Task 1: Middleware Rewrite + Community Layout

Rewrote `src/lib/supabase/middleware.ts` with the D-14 8-step proxy decision tree:

1. Auth check — unauthenticated users go to `/auth`
2. Email verification skip — `/auth/verify-email` passes through
3. `/auth/*` routes pass (login/signup pages)
4. Profile check — users without profile record redirect to `/profile/setup`
5. `/communities` passes (always allowed for authenticated users with profile)
6. Old flat routes (`/coach`, `/sessions`, `/admin`, `/events`, `/notifications`, `/welcome`) — redirect to `/c/{slug}/...` if single community, else to `/communities`
7. `/c/[slug]/*` — verify membership; non-members redirect to `/communities` (D-50); verify role has access to sub-path
8. `/profile/*` passes (global profile route)

Created `src/app/c/[slug]/layout.tsx` — queries community membership via Supabase, redirects non-members to `/communities`, wraps children in `CommunityProviderWrapper` to provide community context to all nested pages (defense in depth per T-08-09).

**Commit:** `1b87241`

### Task 2: Route Migration + AppNav Update + Profile Fix

Moved all 30 community-scoped page/loading/error files from flat routes into `/c/[slug]/` directory tree. Key changes per file:
- All pages use `await params` (Next.js 16)
- All pages use `getUserRole(supabase, communityId)` instead of `getJWTClaims()`
- All links updated to slug-based hrefs (`/c/${slug}/...`)
- `getLessonHistory(communityId, memberId, limit, offset)` called with correct argument order

Rewrote `AppNav` to use `useMaybeCommunity()` — returns null on global routes, providing safe dual-mode rendering: role-based community tabs when in community context, minimal Communities+Profile tabs on global routes.

Updated `src/app/profile/page.tsx` to remove `getJWTClaims` — now uses `supabase.auth.getUser()` + direct `community_members` query.

Deleted old flat route directories: `coach/`, `sessions/`, `events/`, `admin/`, `notifications/`, `welcome/`, `profile/[memberId]/`.

Fixed two TypeScript errors in `middleware.ts` at lines 98 and 119 — Supabase `!inner` join result typed as array needs `as unknown as { slug: string }` double cast.

**Commit:** `7b49db0`

## Decisions Made

1. **Dual-mode AppNav via `useMaybeCommunity()`**: Using the safe hook (returns null) rather than the throwing hook allows a single AppNav component to serve both community and global routes without crashing.

2. **Defense in depth (T-08-09)**: Proxy verifies membership AND layout re-verifies independently. If proxy is bypassed (e.g., during development), the layout still redirects unauthorized users.

3. **Profile stays global (D-04)**: `/profile` remains at root, not under `/c/[slug]/`. It queries the user's first community membership to get role, but is not community-scoped.

4. **Old flat routes become redirects (D-06)**: `/coach`, `/sessions`, etc. redirect to `/c/{slug}/...` for single-community users, enabling backward compatibility during transition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript double-cast for Supabase `!inner` join results**
- **Found during:** Task 1 (TypeScript check after Task 2)
- **Issue:** Supabase types `communities!inner(...)` as an array but at runtime it's a single object. `as { slug: string }` fails TS strict mode; needs `as unknown as { slug: string }`.
- **Fix:** Changed both occurrences in middleware.ts (lines 98, 119) to use `as unknown as { slug: string }`.
- **Files modified:** `src/lib/supabase/middleware.ts`
- **Commit:** `7b49db0`

**2. [Rule 3 - Blocking] Planning files accidentally deleted in Task 1 commit**
- **Found during:** Post-commit verification
- **Issue:** `git reset --soft` had staged 49 planning and migration file deletions. Task 1 commit included these deletions.
- **Fix:** `git checkout e8b9ad4 -- .planning/ supabase/migrations/` restored all files; separate fixup commit `88d636f` preserved them.
- **Files modified:** `.planning/**/*`, `supabase/migrations/**/*`
- **Commit:** `88d636f`

## Known Stubs

None — all pages wire real data from Supabase queries. The admin page placeholder ("Admin Dashboard / Coming in Phase 4") is intentional from Phase 4.

## Threat Flags

None. No new network endpoints, auth paths, or file access patterns beyond what the plan's threat model covers. The `/c/[slug]/members/[memberId]/` route was already accounted for in T-08-09.

## Self-Check: PASSED

All key files exist, all commits verified, all old flat route directories deleted as intended.
