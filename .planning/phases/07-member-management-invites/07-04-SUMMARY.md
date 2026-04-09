---
phase: 07-member-management-invites
plan: 04
subsystem: database, ui, testing
tags: [supabase, rls, vitest, jwt]

requires:
  - phase: 07-01
    provides: coach_client_assignments junction table migration
  - phase: 07-02
    provides: open sign-up auto-join action
  - phase: 07-03
    provides: roster UI components
provides:
  - Live database with junction table and RLS policies
  - Verified working roster and sign-up flows
  - Test fixes for junction table mock chain
affects: [phase-08-community-selector]

tech-stack:
  added: []
  patterns: [server-side session refresh for stale JWT claims]

key-files:
  created: []
  modified:
    - src/__tests__/actions/members.test.ts
    - src/__tests__/waitlist-display.test.ts
    - src/components/auth/LoginForm.tsx
    - src/components/welcome/WelcomePage.tsx
    - src/app/coach/clients/RosterClientWrapper.tsx
    - src/app/coach/clients/page.tsx
    - src/app/profile/setup/page.tsx
    - supabase/migrations/00008_coach_client_assignments.sql

key-decisions:
  - "Client-side filtering for roster toggle instead of URL search params — instant switching"
  - "Set role to 'client' directly after auto-join instead of waiting for JWT refresh"
  - "Added authenticated_read_communities RLS policy for open sign-up flow"
  - "Server-side session refresh on profile setup page to handle stale JWT claims"
  - "Data migration SQL for existing coach_id assignments to junction table"

patterns-established:
  - "JWT claims lag pattern: after DB writes that affect custom claims, set state directly rather than waiting for JWT refresh"
  - "Client-side filtering for toggle/tab UIs to avoid server round-trips"

requirements-completed: [MGMT-01, MGMT-02, MGMT-03, MGMT-04, MGMT-05, MGMT-06, MGMT-07]

duration: 45min
completed: 2026-04-09
---

# Plan 07-04: DB Migration & E2E Verification Summary

**Applied junction table migration, fixed test mocks, resolved JWT claim lag on welcome/profile pages, and switched roster toggle to instant client-side filtering**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-04-09T17:55:00+09:00
- **Completed:** 2026-04-09T18:40:00+09:00
- **Tasks:** 2 (manual migration + E2E verification with fixes)
- **Files modified:** 8

## Accomplishments
- Migration applied to live Supabase database (coach_client_assignments + RLS policies)
- Existing coach_id assignments migrated to junction table
- Test mocks updated for .insert().select().single() chain and junction table assertions
- Roster toggle made instant via client-side state instead of URL-based server re-render
- Welcome page auto-join fixed: no more infinite retry loop, direct role set after join
- Profile setup page handles stale JWT claims via server-side session refresh

## Task Commits

1. **Task 1: Apply migration** - Manual step in Supabase SQL Editor
2. **Task 2: E2E verification** - Multiple fix commits during verification:
   - `281f476` (fix: test mocks for junction table)
   - `8f3c66d` (fix: LoginForm defaultValue warning)
   - `da990cb` (fix: client-side roster toggle)
   - `bf91eca` (fix: auto-join role set directly)
   - `93c9321` (fix: retry loop + communities RLS policy)
   - `ac8f1d7` (fix: profile setup session refresh)

## Deviations from Plan

### Auto-fixed Issues

**1. Test mocks outdated for junction table**
- **Issue:** processInviteSignup mocks didn't support .insert().select().single() chain
- **Fix:** Updated mock structure and assertions to match new junction table flow

**2. Roster toggle slow (server round-trip)**
- **Issue:** URL search params triggered full page re-render on toggle
- **Fix:** Moved filtering to client-side state in RosterClientWrapper

**3. Welcome page infinite retry + stuck spinner**
- **Issue:** JWT claims lag caused auto-join to fail repeatedly; no RLS policy for communities read
- **Fix:** Added joinFailed state, direct role set, and authenticated_read_communities policy

**4. Profile setup redirect loop**
- **Issue:** Stale JWT claims without community_id redirected back to /welcome
- **Fix:** Server-side session refresh before claims check

---

**Total deviations:** 4 auto-fixed
**Impact on plan:** All fixes necessary for correct E2E functionality. No scope creep.

## Issues Encountered
- Data migration needed for existing coach_id → junction table (SQL provided to user)
- LoginForm Base UI warning on failed login (dynamic defaultValue)

## User Setup Required
- Applied migration 00008_coach_client_assignments.sql via Supabase SQL Editor
- Applied authenticated_read_communities RLS policy
- Applied data migration for existing coach_id assignments

## Next Phase Readiness
- Phase 7 member management and invites complete
- Invite link clipboard/toast verification deferred to deployment (Phase 8)
- Loading skeletons added to Phase 8 success criteria

---
*Phase: 07-member-management-invites*
*Completed: 2026-04-09*
