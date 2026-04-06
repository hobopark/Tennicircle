# Project Research Summary

**Project:** TenniCircle
**Domain:** Multi-tenant tennis community and coaching management platform (SaaS)
**Researched:** 2026-04-06
**Confidence:** HIGH

## Executive Summary

TenniCircle sits in a market gap between court-booking tools (CourtReserve, Omnify) and player-development tools (Tennis Locker). Existing platforms are either optimised for facility scheduling or for tracking player progress — none are built for the coach-community organiser who runs both coaching sessions and community events under one roof. The recommended approach is a Next.js 16 App Router monolith backed by Supabase (Auth + Postgres + Realtime + Storage), deployed to Vercel. This stack provides everything needed for MVP: multi-tenant data isolation via RLS, real-time notification delivery, and a React Native-compatible auth architecture for future mobile expansion.

The platform's core architectural constraint is multi-tenancy. Every table requires a `community_id` column, every query requires an RLS policy, and the community context must be embedded in the JWT at login via a Custom Access Token Hook — not derived from client-supplied parameters. This is non-negotiable infrastructure that must be in place before any feature work begins. The second architectural complexity is recurring session scheduling: the template-plus-override pattern (not pre-generation of all instances) must be designed at the schema level before any session UI is built. Both of these are migration-level decisions that cannot be retrofitted cheaply.

The primary risks are all concentrated in the foundation: cross-user session leaks from module-scope Supabase clients, silent data exposure from tables missing RLS, RSVP race conditions from application-layer capacity checks, and stale JWT role claims after role changes. Every one of these pitfalls has a straightforward prevention strategy, but every one of them must be addressed in Phase 1. The good news is that once the foundation is right, the subsequent feature phases are relatively standard CRUD work with well-documented patterns.

## Key Findings

### Recommended Stack

The stack is a tight, well-integrated set of modern libraries. Next.js 16 with the App Router provides both the server-rendering performance needed for data-heavy coach dashboards and the client interactivity needed for real-time RSVP flows. Supabase is the single managed backend service, handling auth, Postgres, Realtime websockets, pg_cron for recurring session generation, and file storage — reducing operational surface area significantly. Tailwind CSS 4 with shadcn/ui provides components that are copied into the project (no bundle bloat from unused components). TanStack Query handles server state and optimistic updates in client components; Zustand handles ephemeral UI state only. FullCalendar provides the coach schedule view with drag-and-drop and recurring event support.

**Critical version note:** `@hookform/resolvers` v5 is required for Zod v4 — resolvers v4 is incompatible. All FullCalendar packages must be the same minor version. Use `@supabase/ssr` (not the deprecated `@supabase/auth-helpers`) for server-side auth in Next.js.

**Core technologies:**
- Next.js 16.2.2 + React 19: Full-stack framework — App Router RSC for data-heavy pages, client components for interactive UI
- Supabase (cloud): Auth + Postgres + Realtime + Storage — managed backend with RLS and generous free tier; React Native compatible
- Tailwind CSS 4.2.2 + shadcn/ui: Styling + components — no tailwind.config required; components copied into project, no bundle bloat
- TypeScript 5.x: Type safety — Supabase generates typed schema; Zod infers types automatically
- TanStack Query 5.96.2: Server state — optimistic updates, cache invalidation, background refetch for RSVP and notifications
- Zustand 5.0.12: UI state — modal state, notification badge counts; 3KB, minimal boilerplate
- react-hook-form 7.72.1 + Zod 4.3.6: Forms and validation — single schema used for client and server validation
- date-fns 4.1.0 + FullCalendar 6.1.20: Date handling + calendar — tree-shakeable; richest feature set for coach schedule view
- Supabase pg_cron: Recurring session generation — batch generation inside DB, zero network latency

### Expected Features

Based on competitor analysis (CourtReserve, Tennis Locker, Omnify), the following feature breakdown applies:

**Must have (table stakes):**
- Roles and auth (Admin, Coach, Member) with coach-scoped client visibility
- Recurring session templates that generate individual session instances with per-instance overrides
- RSVP with capacity limits and waitlist with manual promotion
- Player profiles (name, contact, dual skill level, playing style, goals)
- Session attendance and lesson history per player
- Coach dashboard (schedule view + per-session attendance list + player roster)
- Community events (tournaments, social events, open sessions) — three distinct types
- Announcements (coach/admin posts, all members see)
- In-app notification feed (session reminders, waitlist updates, announcements)
- Multi-tenancy data model (community_id scoping from day one)

**Should have (competitive differentiators):**
- Coach progress notes per session — differentiates from court-booking tools; text note from coach visible to player
- Dual skill level (self-assessed NTRP/UTR + coach-assessed) — Tennis Locker does this; CourtReserve does not
- Playing style and goals fields on profile — enables better coach-to-player matching
- Multi-coach co-coaching on a single session — missing from all competitors
- Community events as first-class objects with distinct UX per type — competitors flatten everything to one booking type

**Defer (v2+):**
- Email/SMS notifications — in-app is sufficient to validate the concept
- Payment processing — adds regulatory and support complexity; Jaden collects outside the app today
- Automated tournament bracket generation — manual draw is sufficient; automation has edge cases that erode trust
- AI coaching analysis — video infrastructure required; coach progress notes deliver 80% of value at 1% cost
- Progress analytics dashboards — needs historical data to be meaningful
- Native mobile apps — mobile-responsive web covers MVP; React Native compatible architecture ensures future path

### Architecture Approach

The recommended architecture is a monolith for MVP: Next.js handles all pages and server actions, Supabase provides all backend services, and Vercel deploys both with zero configuration. The critical structural decision is the boundary between server and client code: Server Components fetch initial data (fast, no loading spinners), Client Components hold Supabase Realtime subscriptions and TanStack Query for live updates. Separate `lib/supabase/client.ts` and `lib/supabase/server.ts` files (never a shared singleton) enforce the correct Supabase client instantiation pattern. Auth logic must avoid `next/headers` imports in shared utilities to preserve the React Native migration path.

**Major components:**
1. Next.js App Router (`(app)/` route group) — authenticated page shells with role-aware routing; auth enforced in shared layout
2. Supabase Auth + Custom Access Token Hook — embeds `community_id` and `user_role` into JWT at login; all RLS policies read from JWT claims
3. RLS Policy Layer — community isolation (`community_id` in JWT) and coach-client scoping (`coach_clients` junction table + security definer helper) enforced at DB layer, not application layer
4. Supabase pg_cron + `session_templates` table — weekly batch generation of concrete session rows; template + exception model for per-instance overrides
5. Supabase Realtime + TanStack Query — DB INSERT on `notifications` table triggers websocket push to subscribed clients; badge and toast updates without polling
6. Next.js Middleware — token refresh via `updateSession()`; role-based redirects reading JWT claims; no data queries

### Critical Pitfalls

1. **Module-scope Supabase client causes cross-user session leaks** — always initialise `createServerClient` inside the request handler, never at module scope; Vercel warm-reuse will share the session across users otherwise
2. **RLS missing on new tables silently exposes all rows** — every migration must include `ENABLE ROW LEVEL SECURITY` and stub policies on the same table it creates; test from a real authenticated client session, not the SQL editor (which bypasses RLS as postgres superuser)
3. **INSERT/UPDATE policies without `WITH CHECK` allow ownership hijacking** — `USING` gates reads, `WITH CHECK` gates the post-write state; every write policy needs both clauses with `auth.uid() = user_id` and community scoping
4. **RSVP race condition — two users grab the last spot** — enforce capacity at DB layer using a `SELECT ... FOR UPDATE` stored procedure called via `supabase.rpc()`; application-layer check-then-insert is not atomic
5. **Recurring session generation breaks at DST boundaries** — store recurrence as IANA timezone name + local wall-clock time (not UTC offset); expand instances using `date-fns-tz`; naive UTC + constant-interval arithmetic breaks when DST transitions occur in March/October (Australia)
6. **JWT role claims are stale after role change** — store roles in the `memberships` table and join in RLS policies; do not put revocable roles in JWT claims; role changes must take effect immediately without requiring logout
7. **Naive recurring instance schema (pre-generating all rows)** — use template + exceptions model; generate concrete rows via pg_cron for a rolling 4-week horizon only; pre-generating a year of sessions makes template edits a bulk-update nightmare

## Implications for Roadmap

Based on the dependency graph from ARCHITECTURE.md and the pitfall-to-phase mapping from PITFALLS.md, the following phase structure is recommended. Every subsequent phase depends on the foundation being correct — skipping or shortcutting Phase 1 creates compounding technical debt.

### Phase 1: Foundation and Auth

**Rationale:** RLS, JWT claims, and the Supabase client patterns must exist before any data feature. Every other phase depends on community isolation being in place. This phase also decides the template/instance data model — a schema decision that cannot be retrofitted without a rewrite-level migration.
**Delivers:** Working auth (email/password, role redirect), community-scoped database schema, RLS policies on all tables, Custom Access Token Hook with `community_id` and `user_role` in JWT, separate browser/server Supabase client setup, middleware token refresh, `session_templates` + `sessions` schema (template + exception model), `coach_clients` junction table, `memberships` table with role hierarchy.
**Addresses:** Roles and auth (table stakes), multi-tenancy data model (strategic differentiator), React Native-compatible auth patterns
**Avoids:** Module-scope client session leak (Pitfall 1), RLS missing on tables (Pitfall 2), INSERT/UPDATE without WITH CHECK (Pitfall 3), JWT role claim staleness (Pitfall 4), naive recurring session schema (Pitfall 9)

### Phase 2: Session Management

**Rationale:** Sessions are the core product loop — coaches schedule, members RSVP. Can't build the dashboard or notifications without sessions existing. The recurring generation logic and RSVP race condition fix both land here.
**Delivers:** Recurring session generation (pg_cron + `generate_sessions_from_templates()` Postgres function), session CRUD (coach-scoped), RSVP with capacity enforcement (atomic stored procedure via `supabase.rpc()`), waitlist with manual promotion, per-session overrides after generation, DST-aware recurrence using `date-fns-tz`.
**Addresses:** Recurring session templates, RSVP with capacity, waitlist with manual promotion
**Avoids:** RSVP race condition (Pitfall 5), DST boundary breakage (Pitfall 6), coach-client visibility enforced only in app code (Pitfall 8)

### Phase 3: Player Profiles and Management

**Rationale:** Profiles depend on auth and sessions being in place. Attendance history requires sessions. Progress notes require both profiles and sessions. Coach-scoped visibility in the dashboard requires the `coach_clients` relationship (established in Phase 1).
**Delivers:** Player profile pages (name, contact, dual skill level, playing style, goals), session attendance history per player, lesson history, coach progress notes per session, coach player roster view.
**Addresses:** Player profiles, attendance history, coach progress notes (differentiator), dual skill level (differentiator)

### Phase 4: Coach Dashboard and Community Events

**Rationale:** Dashboard is composition of already-built data (sessions + profiles + attendance). Community events follow a similar RSVP pattern to coaching sessions — reuse the RSVP component rather than building a second system. Can be built in parallel with Phase 3 after Phase 2 completes.
**Delivers:** Coach dashboard (FullCalendar weekly/day schedule view + per-session attendance list), admin views, community events (three types: tournaments with manual draw, social events, open sessions), event RSVP (reused component), announcements (admin/coach broadcast).
**Addresses:** Coach dashboard (table stakes), community events (table stakes), announcements (table stakes)
**Uses:** FullCalendar with `dynamic(() => import(...), { ssr: false })` wrapper, TanStack Query for session cache invalidation

### Phase 5: Notifications and Realtime

**Rationale:** Notifications depend on sessions and events existing to generate triggers. Realtime is the final layer on top of an already-working data model. Can be partially parallelised with Phase 4 — the `notifications` table schema can be created in Phase 1 with triggers wired up here.
**Delivers:** In-app notification feed, Supabase Realtime subscription hook (`useRealtimeNotifications`), notification triggers on session creation, waitlist promotion, and announcements, notification badge with unread count, sonner toast for high-priority events.
**Addresses:** In-app notifications (table stakes)
**Avoids:** Broad realtime subscriptions (scope narrowly by `user_id` to avoid free-tier connection limits)

### Phase 6: Polish and Launch Readiness

**Rationale:** UX refinements and cross-cutting concerns that touch all previous phases. Includes the checklist items from PITFALLS.md's "Looks Done But Isn't" section.
**Delivers:** Mobile-responsive calendar defaults (week view on mobile), capacity state visible on session cards, waitlist position display, unambiguous RSVP confirmation copy, "edit this session vs. all future" prompt, timezone display on all session details, CI check for RLS on all tables, concurrent request testing on Vercel.
**Addresses:** All UX pitfalls from PITFALLS.md

### Phase Ordering Rationale

- The foundation-first ordering is mandated by the dependency graph: RLS policies and JWT claims must exist before any query can be tenant-scoped. Building any feature before this is done means rewriting every query and policy after the fact.
- The template + exception data model decision is placed in Phase 1 even though session features don't ship until Phase 2 — this is a schema-level decision where the recovery cost of getting it wrong is HIGH (full migration to remodel the schema).
- Community events are grouped with the coach dashboard (Phase 4) rather than with sessions (Phase 2) because they use a simpler RLS pattern (community-wide, not coach-client-scoped) and the RSVP component can be cleanly reused after it's been built and tested in Phase 2.
- Notifications are last because they are pure additions — they improve awareness of events that already work without them. Building them first provides no core value and adds realtime complexity before the data model is stable.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1:** The Custom Access Token Hook implementation is well-documented but the interaction between multi-community membership (a user belonging to multiple communities) and the JWT claim embedding needs explicit design before coding. The current research assumes single-community membership per user; multi-community adds complexity to the hook logic.
- **Phase 2:** pg_cron availability on Supabase free tier should be verified before committing to it as the primary recurring session generation mechanism. Supabase Cron is documented but plan-level availability may change.
- **Phase 2:** The `date-fns-tz` approach for IANA timezone-aware recurrence expansion needs a concrete implementation spike — the library interactions with rrule parsing are not fully detailed in the research.

Phases with standard patterns (research-phase can be skipped):

- **Phase 3:** Player profiles and attendance history are straightforward CRUD with well-established patterns. No novel architectural decisions.
- **Phase 4:** FullCalendar integration pattern is fully documented in STACK.md. Community events follow the same RSVP component pattern as sessions. Announcements are simple one-to-many inserts.
- **Phase 5:** Supabase Realtime notification pattern is fully documented with code examples in ARCHITECTURE.md.
- **Phase 6:** UX polish is implementation work, not architectural research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified directly against npm registry; all integration patterns verified against official docs |
| Features | MEDIUM | Competitor analysis via web research; no direct user interviews with Jaden or end users; MVP definition is well-reasoned but not validated |
| Architecture | HIGH | Patterns verified against Supabase official docs and Makerkit production deployments; build order matches the dependency graph |
| Pitfalls | HIGH | Primary pitfalls verified against official Supabase docs and multiple community production sources; DST pitfall confirmed against authoritative timezone literature |

**Overall confidence:** HIGH

### Gaps to Address

- **Multi-community membership:** Research assumes users belong to one community. If Jaden's use case involves a user joining multiple communities, the Custom Access Token Hook logic, RLS policies, and role-routing middleware all need explicit design for the multi-membership case. Clarify with Jaden before finalising Phase 1.
- **pg_cron plan availability:** Supabase Cron (pg_cron) availability on the free tier should be confirmed before Phase 2 planning. If unavailable, the fallback is a Vercel Cron job calling a `/api/cron` Route Handler — functionally equivalent but adds a network hop.
- **RSVP rrule library:** Research recommends storing recurrence as an rrule string plus IANA timezone, but doesn't specify a JavaScript rrule parsing library for the frontend. `rrule.js` is the standard choice but needs a brief spike to confirm compatibility with Next.js 16 + date-fns 4.
- **User interview validation:** The feature priorities are based on competitor analysis, not direct user research. The "manual waitlist promotion" decision (vs. auto-promote) is defensible but should be validated with Jaden before Phase 2 ships.
- **Notification trigger mechanism:** Research describes inserting into a `notifications` table to trigger Realtime, but doesn't specify whether triggers should be Postgres DB triggers (runs inside the transaction) or application-level inserts in Server Actions. DB triggers are more reliable but harder to debug; this decision should be made explicit in Phase 5 planning.

## Sources

### Primary (HIGH confidence)
- npm registry — version verification for all packages (Next.js 16.2.2, Supabase 2.101.1, @supabase/ssr 0.10.0, Tailwind 4.2.2, Zod 4.3.6, RHF 7.72.1, TanStack Query 5.96.2, Zustand 5.0.12, date-fns 4.1.0, FullCalendar 6.1.20, sonner 2.0.7)
- [Supabase RLS official docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS patterns, USING/WITH CHECK, performance
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — JWT custom claims for multi-tenancy
- [Supabase SSR Next.js guide](https://supabase.com/docs/guides/auth/server-side/nextjs) — createBrowserClient / createServerClient patterns
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization) — RLS enforcement on postgres_changes
- [Supabase Cron / pg_cron Docs](https://supabase.com/docs/guides/cron) — recurring session generation
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — role hierarchy
- [Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — middleware patterns
- [TanStack Query v5 SSR docs](https://tanstack.com/query/v5/docs/react/guides/ssr) — App Router hydration patterns
- [shadcn/ui Next.js installation](https://ui.shadcn.com/docs/installation/next) — Tailwind v4 + App Router setup
- [FullCalendar React docs](https://fullcalendar.io/docs/react) — Next.js integration pattern

### Secondary (MEDIUM confidence)
- [makerkit.dev: Supabase RLS best practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — production multi-tenant patterns
- [makerkit.dev: Real-time Notifications with Supabase + Next.js](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs) — notification architecture pattern
- [antstack.com: Multi-tenant applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) — multi-tenancy patterns
- Competitor feature analysis: WodGuru, Activity Messenger, JoinIt, Tennis Locker, Omnify, CourtReserve, Anolla, ZipDo (feature landscape and competitive positioning)

### Tertiary (LOW confidence, needs validation)
- User feature priorities are inferred from competitor analysis — not validated with Jaden or end users
- "Manual waitlist promotion" preference is a design opinion, not a user-validated decision

---
*Research completed: 2026-04-06*
*Ready for roadmap: yes*
