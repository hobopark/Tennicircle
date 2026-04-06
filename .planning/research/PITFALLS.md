# Pitfalls Research

**Domain:** Tennis community management and booking platform (Next.js App Router + Supabase)
**Researched:** 2026-04-06
**Confidence:** HIGH (primary pitfalls verified against official Supabase docs and multiple community sources)

---

## Critical Pitfalls

### Pitfall 1: Supabase Module-Scope Client Causes Cross-User Session Leaks

**What goes wrong:**
A Supabase client created at module scope — or stored in a shared variable outside the request handler — gets reused across requests from different users on Vercel. User A's session token bleeds into User B's request. One user sees another user's data.

**Why it happens:**
Vercel's Fluid compute model keeps server instances warm and reuses them across requests. Developers follow old patterns from Express or Pages Router where a single client instance works fine, not realizing serverless warm-reuse changes the contract.

**How to avoid:**
Always initialize the Supabase server client inside the request handler, Route Handler, or Server Action — never at module level. Use `createServerClient` from `@supabase/ssr` per the official Supabase Next.js guide, passing cookies from the incoming request each time.

```ts
// WRONG — module scope
const supabase = createServerClient(...)

// CORRECT — inside handler
export async function GET(request: Request) {
  const supabase = createServerClient(url, key, { cookies: ... })
}
```

**Warning signs:**
- Users intermittently see data that doesn't belong to them
- Auth state appears correct in dev but flickers in production
- Logs show the same user session being used for multiple distinct users

**Phase to address:** Foundation / Auth phase — this is the first thing to get right before writing any data access logic.

---

### Pitfall 2: RLS Policies Missing on New Tables (Silent Full Exposure)

**What goes wrong:**
Every new table created in Supabase has RLS disabled by default. If a developer forgets `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, the anon API key gives any unauthenticated caller full read/write access to all rows in that table. There is no warning, no error — it just silently serves all data.

**Why it happens:**
Supabase's dashboard hides this well. Tables created via the SQL editor have no RLS UI prompt. Developers test via the SQL editor (which runs as the `postgres` superuser and bypasses all RLS anyway), see expected results, and ship — never realising the table is open.

**How to avoid:**
Include `ENABLE ROW LEVEL SECURITY` and all required policies in every migration file. Never create a table without its policies in the same migration. Add a CI check that queries `pg_tables` and `pg_policies` to assert no production tables lack RLS. Test RLS behavior using a real client-side Supabase call with a non-superuser session, not the SQL editor.

**Warning signs:**
- A table has rows but zero entries in `pg_policies` for it
- The SQL editor test passes but the client-side call returns nothing (RLS enabled, no policy)
- The client-side call returns everything (RLS disabled)

**Phase to address:** Foundation / Database schema phase — establish a migration template that always enables RLS and stub policies before any other tables are built.

---

### Pitfall 3: RLS INSERT/UPDATE Without `WITH CHECK` Allows Ownership Hijacking

**What goes wrong:**
An `INSERT` policy without `WITH CHECK` lets an authenticated user insert rows with any `user_id` or `community_id` they choose — including someone else's. An `UPDATE` policy without `WITH CHECK` lets a user change the `user_id` on a row to point at another user, effectively stealing it.

**Why it happens:**
Developers write `USING` clauses (which gate reads) and assume that covers writes. The `WITH CHECK` clause is a separate, distinct guard that applies on the post-write state of the row.

**How to avoid:**
Every `INSERT` and `UPDATE` policy needs both a `USING` clause (if applicable) and a `WITH CHECK` clause. The check should assert `auth.uid() = user_id` and `community_id = [expected community]`. Code-review policy definitions as rigorously as application code.

**Warning signs:**
- A user can see rows they did not create
- Inserting a row with a foreign `user_id` succeeds without error
- A user's data disappears after another user "edits" it

**Phase to address:** Foundation / Auth phase — alongside the RLS scaffolding. Every table policy needs both halves from day one.

---

### Pitfall 4: JWT Role Claims Are Stale After Role Change

**What goes wrong:**
When an admin changes a user's role (e.g., promoting a client to coach, or revoking coach access), the user's active JWT still carries the old role claim. RLS policies that check JWT claims (`auth.jwt() ->> 'role'`) continue to grant the old permissions until the user's token expires and they re-authenticate. Depending on token lifetime, this can be hours.

**Why it happens:**
JWTs are stateless. Once issued, Supabase cannot revoke or mutate them — the claim is baked in until expiry. Developers design RBAC around JWT claims for performance, not realising role changes don't take effect immediately.

**How to avoid:**
Do not put role information in JWT claims for roles that need to be revocable in real time. Instead, store roles in a `community_members` table with `(community_id, user_id, role)` and have RLS policies join against that table using `auth.uid()`. Slightly more expensive per query, but role changes take effect on the next request. Reserve JWT claims for immutable, non-security-critical metadata.

**Warning signs:**
- An admin removes a coach but that coach can still access coach-only routes for up to an hour
- Role changes require a "please log out and back in" workaround
- RBAC logic is split between JWT claims and a database table, leading to inconsistency

**Phase to address:** Foundation / Auth phase — decide upfront whether roles live in the JWT or the database. This decision is hard to reverse later.

---

### Pitfall 5: RSVP Race Condition — Two Users Grab the Last Spot

**What goes wrong:**
Two users simultaneously hit "RSVP" for a session with one remaining slot. Both read `current_count = 9` against a `capacity = 10`. Both pass the "is there space?" check. Both insert a booking row. The session now has 11 attendees against a capacity of 10.

**Why it happens:**
The application-layer check-then-insert pattern is not atomic. A read followed by a write in separate statements is vulnerable to concurrent interleaving at default transaction isolation levels.

**How to avoid:**
Implement capacity enforcement at the database layer using one of two approaches:

**Option A — Atomic stored procedure (recommended for Supabase):**
Write a Postgres function that, within a single transaction, locks the session row with `SELECT ... FOR UPDATE`, checks the count, and either inserts the booking or returns an "at capacity" error. Call this via `supabase.rpc('claim_session_spot', { session_id })` from the client.

**Option B — Check constraint + trigger:**
Add a trigger on the `bookings` table that re-counts attendees after each insert and raises an exception if the count exceeds capacity. The trigger fires inside the inserting transaction, rolling it back atomically if capacity is exceeded.

Regardless of approach, the waitlist path (adding to waitlist instead of booking) must be part of the same atomic operation so a user is never added to a full session without landing on the waitlist.

**Warning signs:**
- `SELECT COUNT(*) FROM bookings WHERE session_id = X` returns a number greater than the session's capacity
- A session shows "full" but then accepts a new RSVP
- Users report being booked into sessions they were told were full

**Phase to address:** Session booking phase — before any RSVP UI goes live.

---

### Pitfall 6: Recurring Session Generation Breaks at DST Boundaries

**What goes wrong:**
A coach creates a "Every Tuesday 6:00 PM" recurring session. The app generates instances naively from a wall-clock time without timezone awareness. When Daylight Saving Time ends in April (Australia), the generated Tuesday sessions shift by an hour — suddenly appearing at 5:00 PM or 7:00 PM depending on implementation. The coach and players see different times.

**Why it happens:**
Storing `next_occurrence = UTC timestamp` and adding `7 * 24 * 60 * 60 seconds` (one week) to generate the next instance looks correct but ignores that UTC+11 becomes UTC+10 after DST ends. The constant-interval approach breaks the "same local time every week" invariant.

**How to avoid:**
Store the recurrence rule as a timezone-aware local time: `{ day_of_week: "TUE", time: "18:00", timezone: "Australia/Sydney" }`. Generate instances by resolving each occurrence date in the named IANA timezone (never abbreviations like AEST, which are ambiguous). Use a library like `date-fns-tz` or `Luxon` for this. Re-generate or validate instances at least once after each DST transition.

**Warning signs:**
- Session times shift by one hour in March or October
- The UTC timestamp for a recurring session is the same number of seconds ahead of the previous one rather than being the same local wall-clock time
- Users in Sydney and users who set their browser to UTC see different displayed times for the same session

**Phase to address:** Recurring sessions phase — before the recurrence generation logic is written, not after.

---

### Pitfall 7: Next.js App Router Patterns That Break in React Native

**What goes wrong:**
Code authored for Next.js App Router leaks framework-specific dependencies: `cookies()` from `next/headers`, `redirect()` from `next/navigation`, server component data-fetching patterns, or middleware-based session refresh. When a React Native frontend is added later, none of this code can be shared. The "API-first" intent of the architecture gets undermined, resulting in either a duplicate data layer or a painful refactor.

**Why it happens:**
App Router makes server-side data access so convenient that it becomes the default. Auth flows that rely on `cookies()` for session refresh work perfectly in Next.js but have no equivalent in React Native, where `AsyncStorage` and explicit token management are used instead.

**How to avoid:**
Enforce a strict separation between the Next.js presentation layer and the data layer from day one:

- All data access goes through Supabase JS client calls (not server-only helpers), so the same calls work in React Native.
- Auth flows must work via the Supabase JS client's token management (`supabase.auth.signInWithPassword`, `supabase.auth.getSession`) — not via Next.js middleware-managed cookies.
- For Next.js specifically, use middleware only to refresh tokens and redirect unauthenticated users; keep the actual auth logic in the shared client.
- Never import from `next/headers`, `next/navigation`, or `next/server` in files that are intended to be shared with React Native.

**Warning signs:**
- Auth logic lives inside `middleware.ts` or Server Components rather than in a shared `auth.ts` utility
- Session refresh depends on `cookies()` from `next/headers`
- Data fetching functions import from `next/*` packages

**Phase to address:** Foundation / Architecture phase — this is an architectural constraint, not a feature. Establish the pattern before writing any auth or data access code.

---

### Pitfall 8: Role-Scoped Data Visibility Not Enforced at Both Layers

**What goes wrong:**
A client user queries a list of sessions and the application code filters to "only sessions where this client was invited by their coach." This filtering lives only in the application layer. A user who calls the Supabase API directly (with their valid JWT) bypasses the app and retrieves all sessions across all coaches. In a multi-coach community, clients see sessions they were never invited to.

**Why it happens:**
Developers trust the UI to enforce visibility rules and treat the database as a dumb store. Supabase's direct REST API means the database is always exposed, so visibility rules must be enforced at the RLS layer too.

**How to avoid:**
Model the coach-client relationship in a `coach_client_assignments` join table. Write RLS policies on the `sessions` table that join against this table: a client can only select sessions where their `user_id` appears in `coach_client_assignments` for the session's coach. This makes the policy enforceable regardless of how the client reaches the data.

**Warning signs:**
- A client-authenticated Supabase call returns sessions from coaches they were not assigned to
- Application code contains `WHERE coach_id = :coachId` filters that duplicate what RLS should enforce
- Removing a coach-client assignment in the app doesn't immediately restrict API-level access

**Phase to address:** Foundation / RLS policy phase — design the `coach_client_assignments` table and its policies before building session listing.

---

### Pitfall 9: Naive Recurring Session Schema (Storing All Instances as Rows Upfront)

**What goes wrong:**
The developer creates a `session_templates` table and then, on template creation, generates and inserts 52 rows into `sessions` (one per week for a year). Modifying the template now requires updating 52 rows. Cancelling a single instance requires deleting one row. Changing the template recurrence (e.g., switching from Tuesday to Wednesday) requires deleting and regenerating dozens of rows. The schema becomes unwieldy.

**Why it happens:**
Generating all instances upfront is the simplest first approach. It makes "list all sessions in a week" trivially easy to query. The complexity of modifying templates and handling exceptions is underestimated.

**How to avoid:**
Use a hybrid schema modelled on the Google Calendar / RFC 5545 RRULE approach:
- `session_templates`: stores the rule (`day_of_week`, `time`, `timezone`, `coach_id`, `venue`, `capacity`, `active`)
- `session_exceptions`: stores modifications or cancellations to specific instances (`template_id`, `original_date`, `is_cancelled`, override fields)

Generate instances on-the-fly at query time up to a short horizon (e.g., 8 weeks), rather than pre-inserting all instances permanently. Individual sessions that have been booked become "materialised" rows in a `sessions` table; unbooked future sessions are virtual.

**Warning signs:**
- The `sessions` table has hundreds of rows for a template that has never had a booking
- Editing a template requires a bulk UPDATE across dozens of rows
- There is no clean way to "cancel just this week's session"

**Phase to address:** Database schema phase — design the template/instance model before writing any session creation UI.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store roles in JWT claims | Faster RLS policy evaluation (no join) | Role changes don't take effect until token refresh; requires user logout to fix | Never — use a roles table instead |
| Application-layer capacity check for RSVP | Simpler code, no Postgres functions | Race conditions under any concurrency; double-bookings become possible | Never for production |
| Supabase client at module scope | Single instance, slightly less code | Cross-user session leaks on Vercel warm-reuse | Never |
| Skip RLS on "internal" tables | Faster to ship | Any table without RLS is fully exposed via the anon key | Never in production schema |
| Generate all recurring instances upfront | Simple queries, easy pagination | Template edits require bulk updates; exception handling is messy | Only for a fixed, finite event series (e.g., a 6-week tournament bracket) |
| Store timezone as UTC offset (e.g., +11) | Simple to implement | Breaks at DST boundaries; offset changes seasonally | Never — use IANA timezone names |
| Use `auth.jwt() ->> 'role'` for RBAC | Fast, no DB join in policy | Stale until re-auth; can't revoke in real time | Only for roles that never change (e.g., `is_superadmin`) |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase + Next.js App Router | Creating Supabase client at module scope | Create inside each request handler using `createServerClient` with request cookies |
| Supabase RLS testing | Testing policies in the Supabase SQL editor (runs as postgres superuser, bypasses RLS) | Test by calling the API from a real authenticated client session |
| Supabase + React Native (future) | Auth flow depends on `cookies()` from `next/headers` | Use `supabase.auth.getSession()` and store tokens in `AsyncStorage` on native; middleware for Next.js only |
| Supabase `auth.uid()` in RLS | Policy fires for `anon` role where `auth.uid()` returns null, causing unexpected behavior | Scope all policies to `authenticated` role explicitly |
| Timezone in session scheduling | Storing UTC timestamps and adding fixed-second intervals to generate recurrences | Store IANA timezone name + local wall-clock time; expand instances using `date-fns-tz` or `Luxon` |
| Postgres RSVP capacity | Read capacity in app code, then insert booking | Use `SELECT ... FOR UPDATE` inside a Postgres function called via `supabase.rpc()` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unindexed RLS policy columns | Queries slow as bookings accumulate; policy `user_id = auth.uid()` triggers sequential scans | Index every column referenced in RLS `USING`/`WITH CHECK` clauses (`user_id`, `community_id`, `coach_id`) | Noticeable at ~5K rows; severe at ~50K |
| N+1 in coach dashboard (session list + attendee count per session) | Dashboard load time grows linearly with session count | Use a single query with aggregates or a materialized view for attendee counts | 20+ concurrent sessions |
| Real-time subscription for all bookings | Memory and connection pressure on Supabase free tier | Scope realtime subscriptions narrowly (e.g., one session's bookings, not all community bookings) | Free tier: ~200 concurrent connections |
| Generating all recurring instances for multi-year templates | Slow template creation; large `sessions` table; bulk update pain | Generate on-the-fly up to an 8-week horizon; materialise only when a booking exists | Any template with > 26 instances |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| RLS disabled on any table | Full table exposed to any caller with the anon key | Enable RLS in every migration; add CI check against `pg_tables` |
| `INSERT`/`UPDATE` policies without `WITH CHECK` | Users can forge `user_id` or `community_id` on rows they write | Every write policy needs both `USING` and `WITH CHECK` |
| Service role key used in client-side code | Key bypasses all RLS; any user can see all data | Service role key is server-only; never include in client bundle or Vercel env vars without `_SERVER` scoping |
| Coach-client visibility enforced only in app code | Direct API calls bypass app layer; clients see all sessions | Enforce coach-client scoping in RLS policies on the `sessions` table |
| Storing auth tokens in `localStorage` (Next.js) | XSS can extract tokens | Use `HttpOnly` cookies for Next.js; `AsyncStorage` for React Native only |
| Community ID trusted from client request body | Clients can forge community ID to access another community's data | Derive community context from the authenticated user's membership record, never from a client-supplied parameter |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Calendar shown in month view by default on mobile | Tap targets too small; accidental date selection; session details unreadable | Default to week view on mobile; month view optional on desktop |
| No visual distinction between full sessions and available sessions | Clients repeatedly tap full sessions trying to join | Show capacity state (spots left / full / waitlisted) inline on the session card |
| Waitlist position not shown after joining waitlist | Anxiety; clients don't know if they'll ever get in | Show "You are #3 on the waitlist" immediately after joining |
| Session RSVP confirmation is ambiguous | Clients unsure if they actually booked or just expressed interest | Use unambiguous CTAs: "You're confirmed for Tuesday 6pm" vs. "You're on the waitlist" |
| Recurring session changes don't clarify scope | Coach edits "this session" but expects all future sessions to change, or vice versa | Always prompt: "Edit just this session" vs. "Edit this and all future sessions" |
| Timezone not shown on session details | Sydney users with international coaches or roaming members see wrong times | Always display timezone explicitly (e.g., "6:00 PM AEST") never assume user's local timezone matches |
| Coach dashboard shows all-time history by default | Overwhelming for coaches managing 10+ clients | Default to current week; offer date range selector |

---

## "Looks Done But Isn't" Checklist

- [ ] **RSVP system:** Capacity check appears to work — verify it's atomic at the DB layer and not just an app-level check. Test with two simultaneous requests.
- [ ] **Recurring sessions:** Sessions generate correctly in dev — verify DST transitions by simulating a date in April and October (Australia) for a "6pm Tuesday" template.
- [ ] **RLS policies:** Queries return correct data in the SQL editor — verify by calling the API as a real authenticated client user (not superuser), and as an unauthenticated caller.
- [ ] **Role-based access:** Coaches see only their sessions — verify a client cannot access another coach's sessions via a direct Supabase API call with their valid JWT.
- [ ] **Waitlist:** Waitlist join succeeds — verify a user is placed on the waitlist and not double-counted as a booking when the session is at capacity.
- [ ] **Session template edits:** "Edit this session" works — verify "edit all future sessions" generates a new exception record rather than updating all existing booked rows.
- [ ] **Multi-tenancy:** Queries return correct community data — verify an authenticated user from Community A cannot access Community B's sessions via the API.
- [ ] **Module scope client:** Auth works locally — verify no cross-user session leaks by deploying to Vercel and testing concurrent requests from two different user sessions.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cross-user session leak discovered in production | HIGH | Emergency: rotate Supabase JWT secret (logs everyone out); audit access logs for data exposure; migrate all client inits to request scope |
| RLS disabled on a table in production | HIGH | Enable RLS immediately; add deny-all policy temporarily; audit who accessed the table via Supabase logs; add correct policies; notify affected users if PII was exposed |
| Double-bookings from race condition | MEDIUM | Run query to identify over-capacity sessions; manually move overflow to waitlist; add DB-layer enforcement; notify affected users |
| DST timezone shift corrupts session times | MEDIUM | Identify affected sessions by comparing expected vs. stored times; write a migration to recalculate timestamps using IANA timezone names; notify affected coaches |
| All recurring instances stored as rows, needs refactor | HIGH | Migrate to template + exception model; map existing rows to template + materialised instances; rebuild recurrence generation logic |
| JWT role claim stale after role change | LOW | Short-term: force user logout on role change; long-term: move to DB-based role lookup in RLS policies |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Module-scope Supabase client | Phase 1: Foundation / Auth scaffolding | Deploy to Vercel, fire two concurrent requests from different user sessions, confirm no session crossover |
| RLS missing on new tables | Phase 1: Database schema | CI migration linter checks every table in `pg_tables` has a matching entry in `pg_policies` |
| INSERT/UPDATE without WITH CHECK | Phase 1: RLS policy layer | Attempt to insert a row with a forged `user_id`; verify it is rejected |
| JWT role claim staleness | Phase 1: Auth / role model | Change a user's role; confirm access is immediately restricted without logout |
| RSVP race condition | Phase 2: Session booking | Concurrent load test with two simultaneous RSVPs for a 1-spot session; confirm exactly one succeeds |
| DST timezone edge case | Phase 2: Recurring sessions | Generate a "6pm Tuesday" template and inspect the Tuesday instance immediately after a simulated DST boundary |
| React Native incompatible auth patterns | Phase 1: Auth scaffolding | Verify auth flow uses no `next/headers` imports in shared data utilities |
| Recursive session naive schema | Phase 1: Database schema | Schema review: confirm no migration inserts more than one row per template creation |
| Role-scoped visibility not in RLS | Phase 2: Session listing | Direct API call as a client user; confirm only coach-assigned sessions are returned |
| Naive recurring instance storage | Phase 1: Database schema | Migration audit: session_templates creates 0 rows in sessions table |

---

## Sources

- [Supabase RLS official docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS troubleshooting and best practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase Next.js server-side auth guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase RBAC / custom claims docs](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac)
- [Supabase advanced auth guide (module scope warning)](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [makerkit.dev: Supabase RLS best practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [DEV Community: Why your Supabase app might be leaking user data](https://dev.to/gifteddev/why-your-supabase-app-might-be-leaking-user-data-and-how-to-fix-it-with-rls-2fbf)
- [antstack.com: Multi-tenant applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [HackerNoon: How to solve race conditions in a booking system](https://hackernoon.com/how-to-solve-race-conditions-in-a-booking-system)
- [Recurring Calendar Events — Database Design (Medium)](https://medium.com/@aureliadotlim/recurring-calendar-events-database-design-dc872fb4f2b5)
- [DEV Community: Recurring calendar events database design](https://dev.to/loribean/recurring-calendar-events-database-design-45c1)
- [julik.nl: Scheduling things in user's timezone (2025)](https://blog.julik.nl/2025/09/chronically-regular)
- [upsun.com: Next.js App Router common mistakes](https://upsun.com/blog/avoid-common-mistakes-with-next-js-app-router/)
- [PostgreSQL explicit locking docs](https://www.postgresql.org/docs/current/explicit-locking.html)
- [SupaExplorer: SKIP LOCKED for non-blocking queue processing](https://supaexplorer.com/best-practices/supabase-postgres/lock-skip-locked/)
- [Medium: Hidden timezone issues and DST gotchas](https://medium.com/@ThinkingLoop/hidden-timezone-issues-pandas-timestamp-edge-cases-and-dst-gotchas-08eeab53e692)
- [Baymard: Time booking interface design examples](https://baymard.com/ecommerce-design-examples/time-booking-interface)

---

*Pitfalls research for: tennis community management and booking platform*
*Researched: 2026-04-06*
