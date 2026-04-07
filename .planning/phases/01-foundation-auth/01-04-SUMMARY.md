---
phase: 01-foundation-auth
plan: 04
subsystem: auth
tags: [supabase, role-based-routing, invite-links, member-management, nav, next-js, vitest]

# Dependency graph
requires:
  - phase: 01-foundation-auth/01-01
    provides: Supabase schema (communities, community_members, invite_links), RLS, Custom Access Token Hook
  - phase: 01-foundation-auth/01-02
    provides: shadcn components, TenniCircle design tokens, UserRole type, ROLE_HOME_ROUTES
  - phase: 01-foundation-auth/01-03
    provides: /auth page, Server Actions (login/signup), /auth/confirm route, invite token threading

provides:
  - /welcome page with TenniCircle branding per UI-SPEC D-11 (WelcomePage component)
  - /admin and /coach placeholder role home pages
  - Role-based proxy routing: D-12 (redirect to /auth) and D-13 (silent role redirect)
  - Invite link Server Actions: createInviteLink, revokeInviteLink (AUTH-05, D-06, D-07, D-08)
  - Member management Server Actions: updateMemberRole (AUTH-04), processInviteSignup, removeMember
  - Role-aware AppNav component (D-14)
  - Updated /auth/confirm route that processes invite tokens post-email-verification

affects:
  - All future phases (role-based routing is now active in middleware)
  - Phase 2 (CoachSchedule page is the placeholder that Phase 2 replaces)
  - Phase 4 (AdminDashboard page is the placeholder that Phase 4 replaces)
  - Phase 3 (profile setup link wired; /profile/setup route created in Phase 3)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Role-based route guard in middleware using app_metadata.user_role from JWT
    - Null-safe mock pattern in vitest: use 'key' in overrides instead of ?? for nullable values
    - Server Actions with admin role guard reading JWT claims via getUser().app_metadata
    - AppNav reads user role client-side via getUser() on mount; filters NAV_LINKS by role

key-files:
  created:
    - src/app/welcome/page.tsx
    - src/components/welcome/WelcomePage.tsx
    - src/app/admin/page.tsx
    - src/app/coach/page.tsx
    - src/components/nav/AppNav.tsx
    - src/lib/actions/members.ts
    - src/lib/actions/invites.ts
    - src/__tests__/proxy.test.ts
    - src/__tests__/actions/invites.test.ts
    - src/__tests__/actions/members.test.ts
  modified:
    - src/app/page.tsx
    - src/lib/supabase/middleware.ts
    - src/app/auth/confirm/route.ts

key-decisions:
  - "Role routing in middleware uses app_metadata.user_role (server-controlled JWT claim), not user-writable data — per T-01-04-06"
  - "Pending users always redirect to /welcome; role-mismatched users redirect silently to their role home (D-13)"
  - "coach_id is set to invite.created_by for client invites (D-07), null for coach invites"
  - "Null-safe vitest mock: 'key' in overrides pattern required when null is a valid override value"

requirements-completed: [AUTH-03, AUTH-04, AUTH-05, AUTH-06]

# Metrics
duration: 4min
completed: 2026-04-07
---

# Phase 01 Plan 04: Welcome Page, Role Routing, Invites, and Member Management Summary

**Welcome page with Trophy icon and profile CTA, role-based middleware routing (D-12/D-13), invite link CRUD (AUTH-05), member management actions (AUTH-04), and role-aware AppNav (D-14) — completing the Phase 1 auth flow**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-07T01:07:00Z
- **Completed:** 2026-04-07T01:11:17Z
- **Tasks completed:** 3 of 4 (Task 4 is a human-verify checkpoint)
- **Files created/modified:** 13

## Accomplishments

- WelcomePage with Trophy icon, "You're in!" heading, "Set up my profile" CTA linking to /profile/setup, and "I'll do this later" skip button (per UI-SPEC D-11)
- /welcome, /admin (placeholder), /coach (placeholder) route pages
- Root page.tsx replaced with auth-aware redirect (authenticated → /welcome, unauthenticated → /auth)
- Middleware updated with full role-based routing: pending→/welcome, coach access to /admin→/coach, etc. (D-12, D-13)
- 5 proxy tests covering all role-redirect scenarios
- updateMemberRole, processInviteSignup, removeMember Server Actions with admin-only guards (AUTH-04)
- createInviteLink (coaches create client invites; admins create coach/client invites) and revokeInviteLink (D-06, D-07, D-08)
- /auth/confirm route updated to call processInviteSignup when invite token present
- AppNav component: filters NAV_LINKS by role, admin-only Admin link, admin+coach Schedule link (D-14)
- AppNav rendered on /welcome, /admin, /coach pages
- 33 total tests passing (12 auth + 5 proxy + 7 invites + 9 members)

## Task Commits

1. **Task 1: Welcome page, role pages, and proxy role-based routing** - `1c992e9e` (feat)
2. **Task 2: Invite link system and member management server actions** - `8837b4d7` (feat)
3. **Task 3: Role-aware navigation component** - `b2937c81` (feat)
4. **Task 4: Human verification checkpoint** - PENDING (requires Supabase Dashboard setup + manual E2E test)

## Files Created/Modified

**Created:**
- `src/app/welcome/page.tsx` — Route entry importing WelcomePage
- `src/components/welcome/WelcomePage.tsx` — "You're in!" card with Trophy icon, profile CTA, skip link, AppNav
- `src/app/admin/page.tsx` — AdminDashboard placeholder with AppNav
- `src/app/coach/page.tsx` — CoachSchedule placeholder with AppNav
- `src/components/nav/AppNav.tsx` — Role-aware nav with NAV_LINKS filtered by app_metadata.user_role
- `src/lib/actions/members.ts` — updateMemberRole, processInviteSignup, removeMember (all admin-guarded)
- `src/lib/actions/invites.ts` — createInviteLink (role-gated), revokeInviteLink
- `src/__tests__/proxy.test.ts` — 5 tests for middleware role-redirect scenarios
- `src/__tests__/actions/invites.test.ts` — 7 tests for invite link creation and revocation
- `src/__tests__/actions/members.test.ts` — 9 tests for member role updates and invite signup processing

**Modified:**
- `src/app/page.tsx` — Replaced Next.js boilerplate with auth-aware redirect (→/welcome or →/auth)
- `src/lib/supabase/middleware.ts` — Added role-based routing (D-13): pending→/welcome, role mismatch→role home
- `src/app/auth/confirm/route.ts` — Added processInviteSignup call when invite token in URL

## Decisions Made

- **Role routing reads app_metadata:** Role is read from `user.app_metadata?.user_role` (set by server-controlled Custom Access Token Hook), not from user-writable profile data — enforces T-01-04-06
- **Pending users always land on /welcome:** Any authenticated user without a community membership is treated as pending and redirected to /welcome regardless of requested path
- **coach_id assignment:** For client invites, `coach_id` is set to `invite.created_by` (the inviting coach's member ID) — this is the D-07 coach-client relationship, not required for app access
- **Null-safe vitest pattern:** Using `'key' in overrides` instead of `overrides.key ?? default` for mock helpers where `null` is a valid override (null ?? default evaluates to default, breaking null user tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed null-user mock false positive in test helpers**
- **Found during:** Task 2 — members.test.ts and invites.test.ts
- **Issue:** Mock helper used `overrides.user ?? defaultUser`, but `null ?? defaultUser` evaluates to `defaultUser` because `null` is nullish — making "unauthenticated" tests incorrectly pass
- **Fix:** Changed to `'user' in overrides ? overrides.user : defaultUser` to distinguish explicit `null` from absent key
- **Files modified:** `src/__tests__/actions/members.test.ts`, `src/__tests__/actions/invites.test.ts`
- **Commit:** included in `8837b4d7`

**2. [Rule 1 - Bug] Fixed malformed JSX fragment in WelcomePage**
- **Found during:** Task 3 — after adding AppNav import+usage
- **Issue:** Partial edit left unclosed fragment and misindented div
- **Fix:** Full rewrite to correct JSX structure with properly closed `<>...</>` fragment
- **Files modified:** `src/components/welcome/WelcomePage.tsx`
- **Commit:** included in `b2937c81`

## Human Verification Required (Task 4)

Task 4 is a `checkpoint:human-verify` requiring:

1. Supabase Dashboard setup: run `supabase/migrations/00001_foundation_schema.sql`, register Custom Access Token Hook, add redirect URL `http://localhost:3000/auth/confirm`
2. Add `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.local`
3. Run `npm run dev` and manually verify: sign-up flow → email verification → /welcome page → role-based routing → navigation visibility

## Known Stubs

- `/profile/setup` link in WelcomePage — route does not exist (Phase 3 will implement it). The link is intentionally wired per the plan spec; clicking it will 404 until Phase 3.
- `/admin` and `/coach` pages — placeholder content ("Coming in Phase 4" / "Coming in Phase 2"). Intentional; these are replaced by feature pages in later phases.

## Threat Surface

No new threat surface beyond what the plan's threat model covers. All mitigations from the threat register are implemented:
- T-01-04-01: updateMemberRole checks `user_role === 'admin'` from getUser() JWT
- T-01-04-02: createInviteLink gates coach invites to admin only; client invites to admin+coach
- T-01-04-03: processInviteSignup looks up invite by token, filters revoked_at IS NULL
- T-01-04-05: refreshSession() note documented in updateMemberRole — caller responsibility
- T-01-04-06: Proxy reads role from app_metadata (server-controlled hook, not user-writable)

## Self-Check

### Files exist:
- `src/app/welcome/page.tsx` — FOUND
- `src/components/welcome/WelcomePage.tsx` — FOUND
- `src/components/nav/AppNav.tsx` — FOUND
- `src/lib/actions/members.ts` — FOUND
- `src/lib/actions/invites.ts` — FOUND
- `src/__tests__/proxy.test.ts` — FOUND
- `src/__tests__/actions/invites.test.ts` — FOUND
- `src/__tests__/actions/members.test.ts` — FOUND

### Commits exist:
- `1c992e9e` feat(01-04): welcome page, role pages, and role-based proxy routing — FOUND
- `8837b4d7` feat(01-04): invite link system and member management server actions — FOUND
- `b2937c81` feat(01-04): role-aware navigation component per D-14 — FOUND

### Tests: 33/33 passing

## Self-Check: PASSED

---
*Phase: 01-foundation-auth*
*Completed: 2026-04-07*
