# Architecture Research

**Domain:** Multi-tenant community management platform (tennis coaching)
**Researched:** 2026-04-06
**Confidence:** HIGH (patterns verified against Supabase official docs, Makerkit production patterns, Next.js docs)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Client                          │
├──────────────────────────┬──────────────────────────────────────┤
│   Next.js App Router     │         Supabase JS Client           │
│   Server Components      │   (browser instance — anon/user key) │
│   Server Actions         │                                      │
│   Route Handlers         │                                      │
└──────────────────────────┴──────────────────────────────────────┘
             │                              │
             │ Server-side calls            │ Client-side realtime / auth
             ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase Platform                        │
├────────────────┬────────────────┬───────────────────────────────┤
│  Auth (GoTrue) │  PostgREST API │  Realtime (Channels)          │
│  JWT + hooks   │  REST/GraphQL  │  postgres_changes events       │
├────────────────┴────────────────┴───────────────────────────────┤
│                    PostgreSQL (with RLS)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │communities│  │ sessions │  │ profiles │  │  notifications │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │memberships│  │ rsvps    │  │  events  │  │session_templates│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Cron (pg_cron)   │   Supabase Storage                 │
│  Recurring session gen     │   Profile photos, attachments       │
└────────────────────────────┴───────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Next.js Server Components | Data fetching, initial render, auth-gated page shells | `createServerClient()` from `@supabase/ssr` |
| Next.js Client Components | Interactive UI, realtime subscriptions, optimistic updates | `createBrowserClient()` from `@supabase/ssr` |
| Next.js Middleware | Route protection, token refresh, role-based redirects | `updateSession()` pattern from Supabase SSR guide |
| Next.js Route Handlers | Webhook endpoints, cron triggers from external sources | `/app/api/*/route.ts` |
| Supabase Auth | Email/password login, session management, JWT issuance | GoTrue + Custom Access Token Hook |
| Custom Access Token Hook | Embeds `community_id` and `role` into JWT at login time | Postgres function called by Auth hook |
| RLS Policies | Data isolation — community-scoped + coach-client scoped | SQL policies using `auth.uid()` and `auth.jwt()` claims |
| RLS Helper Functions | Reusable permission checks used by multiple policies | `security definer` Postgres functions |
| Supabase Cron (pg_cron) | Generate recurring sessions from templates on schedule | SQL function invoked by pg_cron job |
| Supabase Realtime | Push notifications to subscribed clients | Postgres changes on `notifications` table |
| Supabase Storage | Profile images, event attachments | Bucket-scoped storage with RLS |

## Recommended Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Auth routes (login, signup)
│   │   └── login/page.tsx
│   ├── (app)/                    # Authenticated app routes
│   │   ├── layout.tsx            # Auth check + user context provider
│   │   ├── dashboard/page.tsx    # Role-aware landing
│   │   ├── sessions/             # Session management
│   │   ├── events/               # Community events
│   │   ├── players/              # Coach's player management
│   │   └── admin/                # Admin-only routes
│   └── api/                      # Route Handlers (webhooks, etc.)
│       └── cron/route.ts         # External cron trigger fallback
├── components/                   # UI components
│   ├── ui/                       # Primitives (shadcn/ui)
│   └── [feature]/                # Feature-grouped components
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client (createBrowserClient)
│   │   ├── server.ts             # Server client (createServerClient)
│   │   └── middleware.ts         # Middleware client + updateSession
│   ├── auth/
│   │   ├── get-user.ts           # Canonical server-side user fetch
│   │   └── roles.ts              # Role checking utilities
│   └── utils/
│       └── dates.ts              # Recurring schedule helpers
├── hooks/                        # Client-side React hooks
│   ├── use-realtime-notifications.ts
│   └── use-session-rsvp.ts
├── types/
│   └── database.ts               # Supabase generated types
└── middleware.ts                 # Next.js middleware (route protection)
```

### Structure Rationale

- **`lib/supabase/`:** Separates browser and server Supabase clients — Next.js runs code in both environments and they require different instantiation. Mixing them is a common source of bugs.
- **`lib/auth/`:** Centralises the `get-user` call so server components never call `getSession()` (unsafe in server context — always use `getUser()`).
- **`(app)/` route group:** All authenticated pages share a layout that enforces auth and provides user context, without that layout polluting public pages.
- **`hooks/`:** Client-only stateful logic (realtime subscriptions, optimistic RSVP) isolated from server components.

## Architectural Patterns

### Pattern 1: Multi-Tenancy via Shared Schema with community_id Column

**What:** Every tenant-scoped table carries a `community_id` foreign key. RLS policies enforce that users can only access rows matching the `community_id` in their JWT claims.

**When to use:** Default for all features. Every table that holds community-specific data (sessions, events, memberships, profiles, notifications) gets this column.

**Trade-offs:** Simple to reason about, great query performance with indexed `community_id`. Does not provide the strict schema-level isolation of per-tenant schemas — acceptable for this use case and far simpler operationally.

**Example:**
```sql
-- Custom Access Token Hook: embed community_id and role into JWT
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql security definer as $$
declare
  claims jsonb;
  member_record record;
begin
  select community_id, role into member_record
  from public.memberships
  where user_id = (event->>'user_id')::uuid
  limit 1;

  claims := event->'claims';
  claims := jsonb_set(claims, '{community_id}', to_jsonb(member_record.community_id));
  claims := jsonb_set(claims, '{user_role}', to_jsonb(member_record.role));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- RLS policy on sessions table
create policy "community_isolation" on public.sessions
  for all using (
    community_id = (select auth.jwt() ->> 'community_id')::uuid
  );
```

### Pattern 2: Coach-Client Relationship Scoping via Memberships Join

**What:** Clients can only see sessions where their assigned coach is the session coach. Enforced in RLS via a `coach_clients` junction table (or `memberships` with coach/client relationship).

**When to use:** The sessions table SELECT policy for Client-role users. Events use a simpler community-only policy since they are open to all members.

**Trade-offs:** Requires a join in the RLS policy. Using a `security definer` helper function with `(select auth.uid())` caching is critical for performance — do not write a bare correlated subquery.

**Example:**
```sql
-- Helper function (security definer caches auth.uid() call)
create or replace function public.is_assigned_coach_client(session_row_coach_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.coach_clients
    where coach_id = session_row_coach_id
      and client_id = (select auth.uid())
  );
$$;

-- Sessions SELECT policy for clients
create policy "clients_see_own_coach_sessions" on public.sessions
  for select using (
    community_id = (select auth.jwt() ->> 'community_id')::uuid
    and (
      -- coaches see their own sessions
      coach_id = (select auth.uid())
      -- clients see sessions from coaches they're assigned to
      or public.is_assigned_coach_client(coach_id)
      -- admins bypass (handled by separate admin policy or role check)
      or (select auth.jwt() ->> 'user_role') = 'admin'
    )
  );
```

### Pattern 3: Recurring Session Generation via pg_cron

**What:** A `session_templates` table stores recurrence rules (e.g., "every Tuesday 6pm at Moore Park, starting 2026-05-01"). A Postgres function generates individual session rows for the upcoming window. pg_cron triggers this function nightly or weekly.

**When to use:** Whenever a coach defines a recurring series. Generation creates concrete session rows that can be individually edited after the fact.

**Trade-offs:** Concrete rows (not virtual computed sessions) keep queries simple and allow per-session overrides. The trade-off is that templates and generated sessions can drift — a `template_id` FK on sessions tracks lineage. Template changes do not retroactively alter already-generated sessions (coach must confirm propagation — keep this simple for MVP).

**Example:**
```sql
-- session_templates table columns (key fields)
-- id, community_id, coach_id, title, venue, capacity,
-- rrule (text — e.g. "FREQ=WEEKLY;BYDAY=TU;BYHOUR=18"),
-- starts_at date, ends_at date (nullable), is_active bool

-- pg_cron job: generate 4 weeks ahead, run weekly Sunday midnight
select cron.schedule(
  'generate-upcoming-sessions',
  '0 0 * * 0',
  $$ select public.generate_sessions_from_templates(
    generate_until := now() + interval '4 weeks'
  ) $$
);
```

### Pattern 4: Server Component Data Fetching with Client Realtime Layer

**What:** Server Components fetch initial data (sessions list, notifications count) on the server using the server Supabase client. Client Components subscribe to Supabase Realtime for live updates (new notifications, RSVP count changes).

**When to use:** Default pattern. Avoids loading spinners on initial page load while keeping live updates cheap — only the delta (new notification INSERT, RSVP count change) goes over the websocket.

**Trade-offs:** Slightly more complex component boundary — the Server Component renders initial state, and a hydrated Client Component takes over for realtime. This is the canonical Next.js + Supabase App Router pattern.

**Example:**
```typescript
// Server Component: fetch once
export default async function NotificationBell() {
  const supabase = createServerClient();
  const { data: user } = await supabase.auth.getUser();
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('dismissed', false)
    .order('created_at', { ascending: false })
    .limit(20);

  // Hand off to client component for realtime updates
  return <NotificationBellClient initialData={notifications} userId={user.id} />;
}
```

## Data Flow

### Authentication & Tenant Resolution Flow

```
User submits login form (client)
    ↓
Supabase Auth (GoTrue) validates credentials
    ↓
Custom Access Token Hook fires (Postgres function)
    → Queries memberships table for user's community_id and role
    → Embeds community_id + user_role into JWT claims
    ↓
JWT issued to client (stored in localStorage / cookie)
    ↓
Next.js Middleware reads JWT on each request
    → Refreshes token if expired (updateSession)
    → Redirects unauthenticated users to /login
    ↓
Server Components / Route Handlers call supabase.auth.getUser()
    → Returns user with JWT claims (community_id, user_role)
    ↓
All DB queries filtered automatically by RLS policies
    (community_id isolation + coach-client scoping)
```

### Session Booking (RSVP) Flow

```
Client clicks "Join Session" button
    ↓
Client Component calls Supabase JS directly (client-side insert)
    OR Server Action (for progressive enhancement)
    ↓
INSERT into rsvps table
    → RLS policy validates: user belongs to community, session capacity not exceeded
    → capacity check: enforce via DB trigger or application-level check before insert
    ↓
On success: optimistic UI update in Client Component
    ↓
Coach's session view updates via Realtime subscription
    (postgres_changes on rsvps table, filtered by session_id)
```

### Recurring Session Generation Flow

```
pg_cron fires weekly (Sunday midnight)
    ↓
generate_sessions_from_templates() Postgres function
    → Queries active session_templates
    → For each template, computes upcoming occurrence dates (rrule logic)
    → Inserts session rows for dates not yet generated
    → Sets template_id FK on each generated session
    ↓
Sessions appear in coach dashboard on next load
    (no realtime needed — weekly batch is sufficient for MVP)
```

### Notification Delivery Flow

```
Server-side event occurs (session created, waitlist promoted, announcement posted)
    ↓
INSERT into notifications table (scoped to user_id + community_id)
    ↓
Supabase Realtime detects INSERT via postgres_changes
    ↓
Client's useRealtimeNotifications hook receives event
    (filtered server-side: account_id = eq.{userId})
    ↓
Notification badge count increments in UI
```

### Key Data Flows Summary

1. **Community isolation:** `community_id` in JWT → RLS policy WHERE clause → all queries auto-filtered at DB level
2. **Role routing:** `user_role` in JWT → Next.js middleware reads claim → redirects to role-appropriate dashboard
3. **Coach-client scoping:** `coach_clients` junction table → RLS helper function → sessions only visible to assigned clients
4. **Realtime:** DB INSERT → Supabase Realtime → websocket → Client Component state update

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-500 users (MVP) | Monolith is correct. Single Supabase project, Vercel hobby/pro, no caching layer needed. |
| 500-10k users | Add index on `(community_id, coach_id)` on sessions. Add index on `(coach_id, client_id)` on coach_clients. Consider connection pooling (PgBouncer via Supabase). |
| 10k+ users | Multiple communities become the norm. Consider per-community caching with Redis for hot schedule data. Evaluate Supabase Pro for dedicated resources. |

### Scaling Priorities

1. **First bottleneck:** RLS policy performance. Missing indexes on `community_id`, `user_id`, `coach_id` columns cause full table scans. Fix: add indexes before launch, not after.
2. **Second bottleneck:** Realtime connection limits. Supabase free tier limits concurrent realtime connections. Fix: batch notifications rather than subscribing to multiple channels per user; upgrade plan at 500+ concurrent users.

## Anti-Patterns

### Anti-Pattern 1: Calling `getSession()` in Server Code

**What people do:** Use `supabase.auth.getSession()` in Server Components or middleware to check auth state.
**Why it's wrong:** `getSession()` reads from the cookie without re-validating against the auth server. A maliciously crafted cookie can pass this check. Supabase explicitly warns against this.
**Do this instead:** Always call `supabase.auth.getUser()` in server-side code. It validates the JWT against Supabase Auth on every call.

### Anti-Pattern 2: Bare `auth.uid()` in RLS Policies Without SELECT Wrapper

**What people do:** Write `auth.uid() = user_id` directly in policy expressions.
**Why it's wrong:** PostgreSQL re-evaluates `auth.uid()` for every row scanned. On tables with thousands of rows, this is a significant performance penalty.
**Do this instead:** Wrap in a SELECT to cache the result: `(select auth.uid()) = user_id`. This is a one-line change with measurable performance impact.

### Anti-Pattern 3: Application-Layer Multi-Tenancy Only

**What people do:** Filter by `community_id` in application queries but skip RLS, trusting the app to always add the filter.
**Why it's wrong:** Any bug, missing WHERE clause, or direct DB access leaks cross-tenant data. One missed filter = data breach.
**Do this instead:** RLS policies as the authoritative enforcement layer. Application-level filters are a performance hint (help query planner use indexes) but not the security boundary.

### Anti-Pattern 4: Mixing Server and Browser Supabase Clients

**What people do:** Import a single `supabase` singleton from a shared module in both server components and client components.
**Why it's wrong:** The browser client uses localStorage/in-memory session storage. On the server this doesn't exist — the call silently returns no session.
**Do this instead:** Maintain separate `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server) with different `createBrowserClient` / `createServerClient` calls from `@supabase/ssr`.

### Anti-Pattern 5: Generating Recurring Sessions Lazily at Query Time

**What people do:** Store only the recurrence rule and compute upcoming sessions on every query with a Postgres function or application logic.
**Why it's wrong:** Complex to query, difficult to allow per-session overrides (time changes, capacity changes), and hard to paginate.
**Do this instead:** Generate concrete session rows ahead of time (via pg_cron). Rows are editable individually. Template-to-session FK preserves lineage. Simple queries, simple UI.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `@supabase/ssr` client-side and server-side instances | Cookie-based for web; client-side flows kept compatible for future React Native |
| Supabase Realtime | `supabase.channel().on('postgres_changes', ...)` in Client Components | Use RLS on realtime channels; filter by user_id to prevent cross-user leakage |
| Supabase Cron (pg_cron) | SQL job registered via `cron.schedule()` | Runs inside DB, zero network latency; backup: expose `/api/cron` Route Handler for external trigger |
| Supabase Storage | Bucket per resource type (avatars, event-images) | Enforce storage RLS policies mirroring DB community_id scoping |
| Vercel | Static + SSR deployment; cron fallback via Vercel Cron if needed | Keep Supabase pg_cron as primary; Vercel Cron as belt-and-suspenders for critical jobs |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Server Components ↔ Supabase DB | Direct via server Supabase client | Never expose service-role key to client |
| Client Components ↔ Supabase DB | Direct via browser Supabase client (anon key + RLS) | RLS is the security boundary, not the anon key |
| Client Components ↔ Server Actions | React Server Actions (POST) | Use for mutations that need server-side validation beyond RLS |
| Middleware ↔ Auth | Cookie-based session via `updateSession()` | Middleware refreshes tokens; does not perform data queries |
| pg_cron ↔ Session Templates | Postgres function call inside DB | No HTTP round-trip; template generation is pure SQL |
| Notifications ↔ Client | Supabase Realtime `postgres_changes` on notifications table | Scoped per `user_id`; RLS enforced on realtime channel |

## Suggested Build Order (Dependency Graph)

The architecture has clear dependency layers. Build bottom-up:

```
1. Foundation
   ├── Database schema (communities, profiles, memberships)
   ├── RLS policies (community isolation first)
   ├── Custom Access Token Hook (community_id + role in JWT)
   └── Auth flows (login/signup with role redirect)

2. Core Data Layer
   ├── Coach-client relationship (coach_clients table + RLS helper)
   ├── Session templates schema
   └── Sessions schema (with template_id FK)

3. Session Features
   ├── Recurring session generation (Postgres function + pg_cron job)
   ├── Session CRUD (coach-scoped)
   └── RSVP system (with capacity enforcement)

4. Community Events
   ├── Events schema (community-scoped, all-member access)
   └── Event RSVP

5. Profiles & Player Management
   ├── Player profiles
   ├── Session attendance history
   └── Coach progress notes

6. Notifications & Realtime
   ├── Notifications table + RLS
   ├── Realtime subscription hook
   └── Notification triggers (DB triggers or application-level on key mutations)

7. Dashboards & Polish
   ├── Coach dashboard (schedule + attendance view)
   ├── Admin views
   └── Announcements
```

**Build order rationale:**
- RLS and JWT claims must exist before any data feature — every query depends on them
- Coach-client relationship scoping must be in place before sessions are exposed to clients
- Session templates must exist before the RSVP/booking UI — users need sessions to book
- Events are community-scoped (simpler RLS), so they can be built in parallel with sessions after auth is solid
- Notifications depend on sessions and events existing (triggers need source data)
- Dashboards are composition of already-built data, built last

## Sources

- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH confidence
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — HIGH confidence
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — HIGH confidence
- [Supabase Cron / pg_cron Docs](https://supabase.com/docs/guides/cron) — HIGH confidence
- [Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — HIGH confidence
- [Supabase RLS Best Practices (Makerkit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — HIGH confidence (production-tested patterns)
- [Real-time Notifications with Supabase + Next.js (Makerkit)](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs) — HIGH confidence
- [Multi-Tenant Applications with RLS on Supabase (AntStack)](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) — MEDIUM confidence
- [Realtime Authorization | Supabase Docs](https://supabase.com/docs/guides/realtime/authorization) — HIGH confidence

---
*Architecture research for: TenniCircle — multi-tenant tennis community management platform*
*Researched: 2026-04-06*
