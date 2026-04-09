---
phase: 06-polish-launch-readiness
plan: 04
subsystem: testing/security
tags: [rls, security, audit, vitest, launch-readiness]
dependency_graph:
  requires: [supabase/migrations/*.sql]
  provides: [src/__tests__/rls/rls-audit.test.ts]
  affects: [ci/test-suite]
tech_stack:
  added: []
  patterns: [static-sql-parsing, offline-audit-test]
key_files:
  created:
    - src/__tests__/rls/rls-audit.test.ts
  modified: []
decisions:
  - Static file-based regex parse — no live DB connection needed; runs offline in CI
  - Each table gets its own describe block for clear failure attribution
  - D-08 launch blocker referenced in all failure messages
metrics:
  duration_minutes: 5
  completed_date: "2026-04-09"
  tasks_completed: 1
  files_changed: 1
---

# Phase 06 Plan 04: RLS Audit Test Summary

**One-liner:** Static Vitest test that parses all migration SQL files and asserts every table has ENABLE ROW LEVEL SECURITY plus at least one CREATE POLICY — 31 tests, all green, fully offline.

## Objective

Create an automated RLS audit test suite that verifies every table in the Supabase migrations has row-level security enabled with correct policies. Any gap is a launch blocker (D-08).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create static RLS audit test | b604d1c | src/__tests__/rls/rls-audit.test.ts |

## What Was Built

`src/__tests__/rls/rls-audit.test.ts` — a Vitest test file that:

1. Reads all `supabase/migrations/*.sql` files from disk using `fs.readdirSync` + `fs.readFileSync`
2. Concatenates all SQL into a single string for analysis
3. Extracts all table names from `CREATE TABLE public.{name}` statements via regex
4. For each discovered table, asserts:
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is present
   - At least one `CREATE POLICY ... ON ... {table}` exists
5. Failure messages explicitly reference "LAUNCH BLOCKER per D-08"

**Test results:** 31 tests, all passing
- 1 count assertion (>=10 tables found — found 15)
- 15 tables x 2 checks (RLS enabled + policy present)

**Tables covered:**
- communities, community_members, invite_links (migration 00001)
- session_templates, sessions, session_rsvps, session_coaches (migration 00002)
- session_invitations (migration 00003)
- player_profiles, coach_assessments, progress_notes (migration 00004)
- events, event_rsvps, announcements (migration 00005)
- notifications (migration 00006)

## Decisions Made

- **Static analysis only:** No live DB connection — runs fully offline, deterministic in CI
- **Broad regex patterns:** Catches different SQL formatting styles (upper/lower case, with/without `public.` prefix)
- **Per-table describe blocks:** Each table is its own `describe` so Vitest reports exactly which table failed
- **`// @vitest-environment node`:** Required for `fs` module access in the test

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — this plan adds a test file only (no new network endpoints, auth paths, or schema changes).

## Self-Check: PASSED

- src/__tests__/rls/rls-audit.test.ts: FOUND
- Commit b604d1c: confirmed in git log
- All 31 tests green: confirmed via `npx vitest run src/__tests__/rls/rls-audit.test.ts --reporter=verbose`
