---
phase: 02-session-management
plan: 01
subsystem: session-data-layer
tags: [database, migrations, types, validation, routing]
dependency_graph:
  requires: [01-foundation-auth]
  provides: [session-schema, session-types, session-validations, route-config]
  affects: [middleware-routing, nav-visibility, all-session-ui-plans]
tech_stack:
  added: []
  patterns:
    - Supabase RLS with sub-selected auth.jwt() calls for query caching
    - Postgres BEFORE INSERT trigger for concurrent-safe capacity enforcement
    - pg_cron nightly session generation with ON CONFLICT DO NOTHING idempotency
    - Zod 4 top-level API (z.coerce, z.string().regex, z.string().date) for form validation
key_files:
  created:
    - supabase/migrations/00002_session_schema.sql
    - src/lib/types/sessions.ts
    - src/lib/validations/sessions.ts
  modified:
    - src/lib/types/auth.ts
    - src/components/nav/AppNav.tsx
decisions:
  - "pg_cron wrapped in exception handler so migration runs on instances without extension"
  - "session_coaches has no community_id column — community scoping done via sessions JOIN for SELECT, template ownership for write policies"
  - "ROLE_ALLOWED_ROUTES added to auth.ts (was missing from Phase 1 auth types)"
  - "AppNav /welcome Home link removed — clients now land on /sessions per D-07"
metrics:
  duration_minutes: 2
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_changed: 5
---

# Phase 2 Plan 01: Session Schema, Types, and Route Config Summary

Session management database foundation with RLS-enforced community scoping, concurrent-safe capacity trigger, idempotent session generation function, TypeScript interfaces mirroring the schema, Zod 4 validation schemas, and client routing updated to /sessions.

## What Was Built

### Task 1: Database Migration (27cc64f6)

`supabase/migrations/00002_session_schema.sql` creates the full session data model:

- **4 tables:** `session_templates`, `sessions`, `session_rsvps`, `session_coaches` — all with RLS enabled and `community_id` FK to communities
- **RLS policies:** 4 policies per table (SELECT/INSERT/UPDATE/DELETE) using sub-selected `(select auth.jwt())` calls for per-query caching
- **sessions SELECT policy:** Role-stratified — admin sees all, coach sees own template sessions + co-coached sessions, client sees sessions via coach_id path through community_members
- **Capacity trigger:** `check_session_capacity` BEFORE INSERT on session_rsvps counts active confirmed RSVPs and raises exception at capacity (T-02-02)
- **Session generation:** `generate_sessions_from_templates` iterates active templates, generates weekly occurrences up to 8 weeks out with `ON CONFLICT DO NOTHING` for idempotency (SESS-02)
- **pg_cron:** Nightly schedule at 02:00 UTC, wrapped in exception handler for portability when pg_cron is unavailable
- **9 indexes:** All FK columns and high-cardinality query columns indexed for RLS performance

### Task 2: TypeScript Types, Validations, Route Config (4bacf291)

- **`src/lib/types/sessions.ts`:** 7 exported interfaces — `SessionTemplate`, `Session`, `SessionRsvp`, `SessionCoach`, `SessionWithDetails`, `SessionActionResult`, `RsvpActionResult` — mirroring database columns exactly
- **`src/lib/validations/sessions.ts`:** 3 Zod 4 schemas — `SessionTemplateSchema` (template creation), `EditSessionSchema` (per-session overrides), `CancelSessionSchema` (cancellation with reason) — with inferred input types exported
- **`src/lib/types/auth.ts`:** `ROLE_HOME_ROUTES` client already at `/sessions`; added `ROLE_ALLOWED_ROUTES` constant with `/sessions` in admin and coach arrays
- **`src/components/nav/AppNav.tsx`:** NAV_LINKS updated — Sessions link `{ href: '/sessions', roles: ['client', 'admin'] }` added, `/welcome` Home link removed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added ROLE_ALLOWED_ROUTES to auth.ts**
- **Found during:** Task 2
- **Issue:** The plan's `files_modified` list included `src/lib/types/auth.ts` and the interfaces section showed `ROLE_ALLOWED_ROUTES` as existing, but the actual file only had `ROLE_HOME_ROUTES` — `ROLE_ALLOWED_ROUTES` was missing entirely
- **Fix:** Added `ROLE_ALLOWED_ROUTES` constant with all three role arrays (admin/coach/client) including `/sessions`
- **Files modified:** `src/lib/types/auth.ts`
- **Commit:** 4bacf291

## Known Stubs

None — this plan is schema + types only. No UI components or data-fetching code.

## Threat Flags

None — no new network endpoints introduced. All new surface is Postgres-internal (trigger, function, RLS policies). The threat model in the plan covers all security-relevant paths (T-02-01 through T-02-06).

## Self-Check: PASSED

All created files verified present on disk. Both task commits (27cc64f6, 4bacf291) verified in git log.
