---
phase: 01-foundation-auth
plan: 01
subsystem: foundation
tags: [supabase, vitest, rls, auth, jwt, schema, proxy]
dependency_graph:
  requires: []
  provides:
    - supabase-client-factories
    - foundation-database-schema
    - rls-policies
    - custom-access-token-hook
    - nextjs-proxy
    - vitest-config
  affects:
    - all subsequent plans in phase 01
tech_stack:
  added:
    - zod
    - vitest
    - "@vitejs/plugin-react"
    - "@testing-library/react"
    - "@testing-library/dom"
    - vite-tsconfig-paths
    - jsdom
  patterns:
    - Separate browser/server Supabase client factories (no singleton)
    - JWT Custom Access Token Hook for role/community_id injection
    - Next.js 16 proxy.ts convention (not middleware.ts)
    - RLS with community_id scoping via auth.jwt() claims
key_files:
  created:
    - supabase/migrations/00001_foundation_schema.sql
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/middleware.ts
    - src/proxy.ts
    - vitest.config.mts
  modified:
    - package.json
decisions:
  - "Next.js 16 uses proxy.ts with export function proxy — middleware.ts is deprecated"
  - "Server client is read-only (no setAll) — proxy handles token refresh writes"
  - "getUser() used in proxy (not getSession()) — validates JWT signature server-side (T-01-01)"
  - "community_id scoped to first community_members row via LIMIT 1 — single-community per user for MVP"
metrics:
  duration_seconds: 115
  completed_date: "2026-04-07"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 1
---

# Phase 01 Plan 01: Foundation Schema, Supabase Clients, and Proxy Summary

**One-liner:** Multi-tenant RLS schema with Custom Access Token Hook, separate browser/server/proxy Supabase client factories, and Next.js 16 proxy.ts for JWT-validated session refresh.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install dependencies, configure Vitest, create database migration | eed54f56 | package.json, vitest.config.mts, supabase/migrations/00001_foundation_schema.sql |
| 2 | Create Supabase client factories and proxy.ts | 10645e25 | src/lib/supabase/client.ts, src/lib/supabase/server.ts, src/lib/supabase/middleware.ts, src/proxy.ts |

## What Was Built

### Database Schema (supabase/migrations/00001_foundation_schema.sql)

Three tables with full RLS:

- **communities** — top-level multi-tenant boundary (id, name, slug, created_at)
- **community_members** — join table with role constraint (admin/coach/client), self-referential coach_id for hierarchy
- **invite_links** — 256-bit entropy tokens (gen_random_bytes(32)) with revocation support

RLS policies on all three tables use `auth.jwt() ->> 'community_id'` for community scoping. The Custom Access Token Hook function (`public.custom_access_token_hook`) injects `user_role` and `community_id` into every JWT at token issuance time, using the first matching `community_members` row (single-community per user for MVP).

Permission grants for `supabase_auth_admin` allow the hook to run. A helper `get_user_role()` function is included for convenience.

### Supabase Client Factories

- **client.ts** — browser-only factory using `createBrowserClient` from @supabase/ssr
- **server.ts** — async server factory using `createServerClient` with read-only cookie access (no `setAll`) — safe for Server Components
- **middleware.ts** — proxy factory with both `getAll` and `setAll` for full cookie read/write during session refresh; contains route protection logic

### Next.js 16 Proxy (src/proxy.ts)

Uses the new `export function proxy` convention (middleware.ts is deprecated in Next.js 16). Validates JWTs via `supabase.auth.getUser()` (not `getSession()`) per T-01-01 threat mitigation. Includes:

- Unauthenticated redirect to `/auth` with `?redirectTo=` param
- Authenticated user redirect away from `/auth` to `/welcome`
- Email verification check (T-01-06)

### Test Infrastructure

Vitest 4.x configured with jsdom environment, React plugin, and tsconfig path aliases. Ready for test files in subsequent plans.

## Verification Results

- `npx vitest run` exits without config errors (no test files yet — expected)
- `npx tsc --noEmit` passes with zero errors
- SQL migration contains all required tables, RLS (3x `enable row level security`), hook, and grants
- No `src/middleware.ts` exists — only `src/proxy.ts`
- Server client has no `setAll` (read-only confirmed)
- Proxy client has both `getAll` and `setAll`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. This plan creates infrastructure (schema, clients, proxy) with no UI rendering or data display stubs.

## Threat Flags

No new security surface introduced beyond what is documented in the plan's threat model. The `src/proxy.ts` file covers the Browser -> Proxy boundary (T-01-01, T-01-06) as designed.

## Notes for Subsequent Plans

- The Custom Access Token Hook must be registered in Supabase Dashboard > Authentication > Hooks after applying the migration (manual step planned for Plan 04 checkpoint)
- The `/welcome` route referenced in proxy redirect logic does not exist yet — Plans 02/03 will create it
- Role-based route protection in proxy.ts is noted as "expanded in Plan 04" — placeholder comment left in code

## Self-Check: PASSED

Files verified to exist:
- supabase/migrations/00001_foundation_schema.sql: FOUND
- src/lib/supabase/client.ts: FOUND
- src/lib/supabase/server.ts: FOUND
- src/lib/supabase/middleware.ts: FOUND
- src/proxy.ts: FOUND
- vitest.config.mts: FOUND

Commits verified:
- eed54f56: FOUND
- 10645e25: FOUND
