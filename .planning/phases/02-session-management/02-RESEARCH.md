# Phase 2: Session Management - Research

**Researched:** 2026-04-07
**Domain:** Recurring session scheduling, RSVP with capacity enforcement, waitlist, coach/client calendar views — Supabase + Next.js 16 App Router
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Session creation:**
- D-01: Simple single-page form for creating session templates — day of week, time, venue, capacity, coach range (start/end dates)
- D-02: Weekly recurrence only — no biweekly/monthly/custom. Pick a day + time, repeats every week
- D-03: Coach sets the date range (start date + end date or number of weeks) when creating the template — sessions auto-generated within that range
- D-04: Venue/court is a free text field with autocomplete suggestions from previously used venues in the community
- D-05: Court number is editable anytime before the session — coaches update court assignments on the day of the lesson

**Schedule & calendar view:**
- D-06: Coaches see a weekly calendar grid (time slots on Y-axis, days on X-axis) showing all their sessions
- D-07: Clients see card-based upcoming sessions — no calendar, just action-oriented cards with RSVP buttons
- D-08: Clients only see sessions from their assigned coach(es) — scoped by coach_id on community_members
- D-09: Session cards show: date, time, venue, coach name, spots remaining, and a preview of who else is attending (names/avatars)

**RSVP & waitlist:**
- D-10: One-tap RSVP with a brief confirmation dialog ("Join Tuesday 6pm at Moore Park?") before committing
- D-11: When session is full, RSVP button changes to "Join Waitlist" — client sees their position (e.g. "3rd on waitlist")
- D-12: Cancellation is unrestricted — client can cancel anytime. A courtesy prompt reminds the client to discuss cancellations with their coach (informational, not blocking)
- D-13: Manual waitlist promotion only — coach decides who gets a freed spot. No auto-promotion

**Session detail & editing:**
- D-14: When editing a recurring session instance, coach is asked: "This session only" or "This and all future sessions" (Google Calendar style)
- D-15: Coach session detail page shows: confirmed attendee list, waitlist with promote/remove actions, and an edit button for session details
- D-16: Template creator can add co-coaches from the community when creating or editing a template
- D-17: Coaches can cancel a session instance with a required reason — cancelled sessions display the reason on the card rather than disappearing

### Claude's Discretion
- Loading states and skeleton designs for calendar and session cards
- Exact calendar grid component implementation (build custom or use a library)
- Session card layout and spacing details
- Waitlist position display format
- Attendee avatar/name preview implementation on cards
- Empty state design for coaches with no sessions and clients with no available sessions
- Form validation timing and error display patterns (follow Phase 1 patterns with Zod 4 + useActionState)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SESS-01 | Coach can create recurring session templates (day, time, venue, capacity) | `session_templates` table with `day_of_week`, `start_time`, `venue`, `capacity` columns; Server Action + Zod 4 validation; date-range controls for D-03 |
| SESS-02 | System auto-generates individual sessions from templates | `generate_sessions_from_templates()` Postgres function + pg_cron job (available on free tier); inserts into `sessions` table with `template_id` FK |
| SESS-03 | Coach can override individual session details (time, venue, capacity) | `sessions` table columns shadow template; "This session only" or "This and future" edit flow (D-14); `exception_of_template_id` FK for single-instance overrides |
| SESS-04 | Multiple coaches can be assigned to a single session | `session_coaches` junction table (session_id, member_id); coaches added at template creation or session edit (D-16) |
| SESS-05 | Client can RSVP to sessions from their assigned coaches | RLS scopes session visibility to `coach_id` match via `community_members`; Server Action inserts into `session_rsvps`; capacity check before insert |
| SESS-06 | Session capacity enforced at database level | Postgres trigger or check constraint on `session_rsvps` INSERT counting confirmed RSVPs against `sessions.capacity` |
| SESS-07 | Waitlist when session is full | `rsvp_type` enum (`confirmed`, `waitlisted`) on `session_rsvps`; `waitlist_position` integer column; UI shows position (D-11) |
| SESS-08 | Coach can manually promote from waitlist | Server Action updates `rsvp_type` from `waitlisted` → `confirmed`, clears `waitlist_position`; requires capacity check; coach-only access enforced |
| SESS-09 | Client can cancel their RSVP | Server Action deletes or marks cancelled; `session_rsvps.cancelled_at` timestamp; confirmation dialog (D-12) |
</phase_requirements>

---

## Summary

Phase 2 delivers the core product loop: coaches schedule recurring sessions, individual instances are generated automatically, and clients RSVP from cards scoped to their coach. The three hardest implementation problems are (1) the database schema for recurring sessions with per-instance overrides, (2) capacity enforcement at the database level (not just application level), and (3) the "edit this or all future" branching pattern for recurring edits.

The architecture uses concrete pre-generated session rows (not virtual computed sessions) because they are individually editable, trivially queryable, and support per-session overrides without complex recurrence algebra in the application layer. Generation happens via a Postgres function triggered by pg_cron — available on Supabase free tier with no hard job count limit. The schema decision was made in Phase 1 research (`.planning/research/ARCHITECTURE.md`).

None of the recommended additional libraries (date-fns, FullCalendar, react-hook-form, TanStack Query, zustand) are yet installed. All must be added in this phase's Wave 0. The existing installed libraries (@base-ui/react 1.3.0 includes Dialog and Select) can handle the confirmation dialogs and dropdowns. For the coach calendar grid (D-06), FullCalendar is the recommended library from the project's prior stack research — or a custom CSS Grid implementation given the simple single-week fixed-time-slot layout.

**Primary recommendation:** Implement the template + concrete-row generation model with pg_cron. Add capacity enforcement as a Postgres trigger (not application-only). Use FullCalendar for the coach calendar or build a lightweight CSS grid; use Server Actions + useActionState for all mutations.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.101.1 | DB queries + auth | Core SDK; established in Phase 1 |
| @supabase/ssr | 0.10.0 | Server/browser Supabase clients | Required for RSC + proxy auth; Phase 1 pattern |
| zod | 4.3.6 | Schema validation | Phase 1 uses z.email() top-level API; replicate for session schemas |
| next | 16.2.2 | App Router + Server Actions | All pages and mutations; proxy.ts for route protection |
| @base-ui/react | 1.3.0 | UI primitives | Dialog (RSVP confirmation D-10), Select, Popover — already installed |
| lucide-react | 1.7.0 | Icons | CalendarDays, Clock, MapPin, Users, CheckCircle, XCircle, Plus, Pencil, Trash2 all present |
| sonner | 2.0.7 | Toast notifications | RSVP confirmations, error feedback; Phase 1 pattern |

[VERIFIED: package.json in project root]

### Must Install (not yet present)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| date-fns | 4.1.0 | Date manipulation | `addWeeks`, `format`, `startOfWeek`, `eachDayOfInterval` for session generation logic and calendar grid; tree-shakeable; recommended in prior STACK.md research |
| react-hook-form | 7.72.1 | Form state management | Session creation form has 6+ fields; RHF prevents full-page re-renders on input; works with Zod via resolver |
| @hookform/resolvers | 5.2.2 | Connects Zod to RHF | Must be v5 for Zod v4 compatibility (v4 resolvers break with Zod 4 API) |

[VERIFIED: npm registry — `npm view date-fns version` → 4.1.0; `npm view react-hook-form version` → 7.72.1]

### Calendar Grid (Claude's Discretion)

**Option A — FullCalendar (recommended by prior research):**

| Library | Version | Purpose |
|---------|---------|---------|
| @fullcalendar/react | 6.1.20 | Calendar component |
| @fullcalendar/timegrid | 6.1.20 | Week/day time-slot grid for coach view |
| @fullcalendar/daygrid | 6.1.20 | Month view option |
| @fullcalendar/interaction | 6.1.20 | Click/drag interactions |

Must wrap in `"use client"` + dynamic import with `ssr: false` due to FullCalendar class-component internals.

[CITED: `.planning/research/STACK.md` — FullCalendar selected for coach schedule view]
[ASSUMED: FullCalendar 6.1.20 is compatible with React 19. React 19 compatibility was not explicitly verified against FullCalendar docs in this session.]

**Option B — Custom CSS Grid (lighter alternative):**

The coach calendar (D-06) is fixed-layout: 5 or 7 day columns, 30-minute time slots from ~6am–10pm. This is achievable with a CSS Grid using `grid-template-rows` for time slots and `grid-template-columns` for days, placing session cards by computed row offsets. No library needed. Given that sessions are recurring/weekly with predictable time slots, a custom grid may be simpler than loading the full FullCalendar bundle.

**Recommendation:** Build a custom CSS Grid calendar for Phase 2 (simpler, no bundle cost). FullCalendar is the right call if drag-and-drop session editing becomes a requirement in a later phase.

### State Management (not yet installed — needed for RSVP optimistic updates)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.96.2 | Server state + optimistic RSVP | Use for client component session lists and RSVP state; `useMutation` with `onMutate` for optimistic updates |
| zustand | 5.0.12 | UI state | Modal open/close, waitlist position display — only if needed; can defer to useState for Phase 2 |

**Recommendation:** Install TanStack Query for RSVP client state. Defer zustand unless a multi-component state sharing need emerges. Note: if RSVP is done via Server Actions + `useActionState` (Phase 1 pattern), TanStack Query may not be needed at all for Phase 2 — evaluate during implementation.

[VERIFIED: npm view @tanstack/react-query version → 5.96.2]

### Installation

```bash
# Required for Phase 2
npm install date-fns react-hook-form @hookform/resolvers

# Calendar — choose one approach:
# Option A (FullCalendar):
npm install @fullcalendar/react @fullcalendar/timegrid @fullcalendar/daygrid @fullcalendar/interaction

# State (if RSVP optimistic updates need it):
npm install @tanstack/react-query zustand
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── coach/
│   │   ├── page.tsx                      # Coach weekly calendar (Server Component shell)
│   │   ├── loading.tsx                   # (already exists)
│   │   ├── sessions/
│   │   │   ├── new/page.tsx              # Create session template form
│   │   │   └── [sessionId]/
│   │   │       ├── page.tsx              # Session detail (attendees, waitlist)
│   │   │       └── edit/page.tsx         # Edit session (with this/future prompt)
│   ├── sessions/                         # Client sessions view
│   │   ├── page.tsx                      # Upcoming sessions cards
│   │   └── loading.tsx                   # (already exists — add if not present)
│   └── api/
│       └── cron/
│           └── route.ts                  # Fallback external cron trigger for session generation
├── components/
│   ├── sessions/
│   │   ├── SessionCard.tsx               # Client RSVP card (D-07, D-09)
│   │   ├── SessionCardSkeleton.tsx       # Loading skeleton
│   │   ├── SessionDetailPanel.tsx        # Coach attendee + waitlist view (D-15)
│   │   ├── CreateSessionForm.tsx         # Template creation form (D-01)
│   │   ├── EditSessionForm.tsx           # Edit with this/future prompt (D-14)
│   │   ├── RsvpDialog.tsx                # Confirmation dialog (D-10)
│   │   ├── CancelRsvpDialog.tsx          # Courtesy cancel prompt (D-12)
│   │   ├── WaitlistPanel.tsx             # Coach waitlist with promote/remove (D-13, D-15)
│   │   └── VenueAutocomplete.tsx         # Free-text + suggestions (D-04)
│   └── calendar/
│       └── WeekCalendarGrid.tsx          # Coach weekly grid (D-06)
├── lib/
│   ├── actions/
│   │   ├── sessions.ts                   # createTemplate, createSession, editSession, cancelSession
│   │   └── rsvps.ts                      # rsvpSession, cancelRsvp, promoteFromWaitlist
│   ├── types/
│   │   └── sessions.ts                   # SessionTemplate, Session, SessionRsvp types
│   └── validations/
│       └── sessions.ts                   # Zod 4 schemas for session forms
└── supabase/
    └── migrations/
        └── 00002_session_schema.sql      # All session-related tables + RLS + trigger + pg_cron
```

### Pattern 1: Template + Concrete Session Row Generation

**What:** `session_templates` stores the recurring rule. A Postgres function generates concrete `sessions` rows within the coach's specified date range (D-03). Sessions carry a `template_id` FK back to the template for lineage tracking.

**When to use:** Default for all session creation (D-02: weekly recurrence only simplifies this considerably).

**Why not virtual/computed sessions:** Per-instance overrides (D-03, D-05, D-14) require real rows. Queries are trivial. No recurrence algebra at query time.

**Example — session_templates table:**
```sql
-- Source: .planning/research/ARCHITECTURE.md + adapted for D-02 (weekly only)
create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  coach_id uuid references public.community_members(id) not null,
  title text not null,
  venue text not null,
  capacity int not null check (capacity > 0),
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sun, 6=Sat
  start_time time not null,
  duration_minutes int not null default 60,
  starts_on date not null,
  ends_on date,                          -- null = open-ended (rare for MVP)
  is_active boolean not null default true,
  created_at timestamptz default now()
);
```

**Example — sessions table:**
```sql
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  template_id uuid references public.session_templates(id),
  -- Per-instance overrides shadow template values:
  venue text not null,
  capacity int not null check (capacity > 0),
  scheduled_at timestamptz not null,    -- concrete date+time for this instance
  duration_minutes int not null default 60,
  cancelled_at timestamptz,             -- D-17: null = active
  cancellation_reason text,             -- D-17: required when cancelled
  court_number text,                    -- D-05: updated on the day
  created_at timestamptz default now(),
  unique (template_id, scheduled_at)   -- prevents duplicate generation
);
```

**Example — session generation Postgres function:**
```sql
-- Source: .planning/research/ARCHITECTURE.md pattern adapted for D-02 (weekly only, date-range based)
create or replace function public.generate_sessions_from_templates()
returns void language plpgsql as $$
declare
  tmpl record;
  occurrence_date date;
  occurrence_ts timestamptz;
  days_until int;
begin
  for tmpl in
    select * from public.session_templates
    where is_active = true
      and (ends_on is null or ends_on >= current_date)
  loop
    -- Find the next occurrence from today forward within ends_on
    days_until := (tmpl.day_of_week - extract(dow from current_date)::int + 7) % 7;
    occurrence_date := current_date + days_until;

    while occurrence_date <= coalesce(tmpl.ends_on, current_date + interval '8 weeks') loop
      occurrence_ts := (occurrence_date || ' ' || tmpl.start_time)::timestamptz;

      insert into public.sessions (
        community_id, template_id, venue, capacity,
        scheduled_at, duration_minutes
      )
      values (
        tmpl.community_id, tmpl.id, tmpl.venue, tmpl.capacity,
        occurrence_ts, tmpl.duration_minutes
      )
      on conflict (template_id, scheduled_at) do nothing;  -- idempotent

      occurrence_date := occurrence_date + 7;  -- weekly
    end loop;
  end loop;
end;
$$;

-- pg_cron: run nightly to catch newly created templates
select cron.schedule(
  'generate-upcoming-sessions',
  '0 2 * * *',
  $$ select public.generate_sessions_from_templates() $$
);
```

**Important:** Also call `generate_sessions_from_templates()` immediately after a coach creates a template via the Server Action — don't wait for the next cron run. Use `supabase.rpc('generate_sessions_from_templates')`.

[VERIFIED: pg_cron is available on Supabase free tier — no hard job count limit per official Supabase community discussion]

### Pattern 2: "Edit This or All Future" — Google Calendar Style (D-14)

**What:** When a coach edits a recurring session instance, the UI prompts "This session only" or "This and all future sessions". These are two distinct database operations.

**When to use:** Any edit to a session that has a `template_id`.

**How "This session only" works:**
- Update the `sessions` row directly (venue, capacity, scheduled_at, etc.)
- The row retains its `template_id` for lineage but is now diverged from the template

**How "This and all future sessions" works:**
- Update the `session_templates` row (venue, capacity, start_time changes)
- For sessions already generated with `scheduled_at >= now()`: bulk UPDATE to match new template values
- Sessions in the past are not touched

**Critical:** There is no "exception" row pattern needed here because D-02 requires weekly-only recurrence with a simple date range — no complex iCal EXDATE tracking required.

```typescript
// Source: established pattern, adapted for this schema
// Server Action: editSession
export async function editSession(
  sessionId: string,
  scope: 'this' | 'future',
  updates: { venue?: string; capacity?: number; startTime?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.user_role !== 'coach' && user.app_metadata?.user_role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  if (scope === 'this') {
    const { error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
    return error ? { success: false, error: error.message } : { success: true }
  }

  // scope === 'future': update template + all future generated sessions
  const { data: session } = await supabase
    .from('sessions')
    .select('template_id, scheduled_at')
    .eq('id', sessionId)
    .single()

  if (!session?.template_id) return { success: false, error: 'No template for this session' }

  const [templateUpdate, futureSessionsUpdate] = await Promise.all([
    supabase.from('session_templates').update(updates).eq('id', session.template_id),
    supabase.from('sessions')
      .update(updates)
      .eq('template_id', session.template_id)
      .gte('scheduled_at', session.scheduled_at),
  ])

  const err = templateUpdate.error || futureSessionsUpdate.error
  return err ? { success: false, error: err.message } : { success: true }
}
```

### Pattern 3: Capacity Enforcement at Database Level (SESS-06)

**What:** Capacity is enforced by a Postgres trigger (or `CHECK` constraint via a function) that counts confirmed RSVPs before allowing an insert. Application-level checks are a secondary UX guard, not the security boundary.

**Why a trigger:** `CHECK` constraints on a table can only reference the row being inserted (not aggregate counts). A trigger with `RAISE EXCEPTION` is the correct pattern.

```sql
-- Trigger to enforce capacity on session_rsvps INSERT
create or replace function public.check_session_capacity()
returns trigger language plpgsql as $$
declare
  confirmed_count int;
  session_capacity int;
begin
  -- Only enforce for confirmed RSVPs; waitlist bypasses capacity
  if NEW.rsvp_type = 'confirmed' then
    select count(*) into confirmed_count
    from public.session_rsvps
    where session_id = NEW.session_id
      and rsvp_type = 'confirmed'
      and cancelled_at is null;

    select capacity into session_capacity
    from public.sessions
    where id = NEW.session_id;

    if confirmed_count >= session_capacity then
      raise exception 'Session is at capacity';
    end if;
  end if;

  return NEW;
end;
$$;

create trigger enforce_session_capacity
before insert on public.session_rsvps
for each row execute function public.check_session_capacity();
```

**Application layer (Server Action):** Before inserting, check capacity and determine `rsvp_type` — if full, insert as `waitlisted`. The trigger is the final guard; the application provides the UX ("Join" vs "Join Waitlist").

### Pattern 4: RSVP with Waitlist (SESS-05, SESS-07)

**session_rsvps table:**
```sql
create table public.session_rsvps (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  session_id uuid references public.sessions(id) on delete cascade not null,
  member_id uuid references public.community_members(id) on delete cascade not null,
  rsvp_type text not null check (rsvp_type in ('confirmed', 'waitlisted')),
  waitlist_position int,                 -- null for confirmed; 1-based for waitlisted
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  unique (session_id, member_id)        -- one RSVP per member per session
);
```

**Server Action flow for rsvpSession:**
1. Auth check — user must be `client` or `admin/coach` RSVPing on behalf
2. Check `sessions.cancelled_at IS NULL` — cannot RSVP to cancelled session
3. Count confirmed RSVPs for this session
4. If `count < capacity`: insert with `rsvp_type = 'confirmed'`
5. If `count >= capacity`: count waitlisted, insert with `rsvp_type = 'waitlisted'`, `waitlist_position = count + 1`
6. DB trigger is the backstop for race conditions

**Manual waitlist promotion (SESS-08, D-13):**
```typescript
// Server Action: promoteFromWaitlist — coach-only
// 1. Auth: user must be coach or admin
// 2. Check session is not at capacity (after the cancelled slot)
// 3. UPDATE session_rsvps SET rsvp_type = 'confirmed', waitlist_position = null WHERE id = rsvpId
// 4. Resequence remaining waitlist positions for that session
```

### Pattern 5: RLS for Session Visibility (D-08)

Clients see only sessions from their assigned coach. The `community_members` table already has `coach_id` from Phase 1.

```sql
-- Sessions SELECT policy: coaches see own sessions, clients see coach's sessions, admins see all
create policy "sessions_select"
on public.sessions for select to authenticated
using (
  community_id = (auth.jwt() ->> 'community_id')::uuid
  and (
    -- Admins see everything in their community
    (auth.jwt() ->> 'user_role') = 'admin'
    -- Coaches see sessions from their templates
    or exists (
      select 1 from public.session_templates st
      where st.id = sessions.template_id
        and st.coach_id = (
          select id from public.community_members
          where user_id = (select auth.uid())
          limit 1
        )
    )
    -- Co-coaches via session_coaches junction
    or exists (
      select 1 from public.session_coaches sc
      where sc.session_id = sessions.id
        and sc.member_id = (
          select id from public.community_members
          where user_id = (select auth.uid())
          limit 1
        )
    )
    -- Clients see sessions from their assigned coach
    or (
      (auth.jwt() ->> 'user_role') = 'client'
      and template_id in (
        select st.id from public.session_templates st
        join public.community_members cm on cm.id = st.coach_id
        join public.community_members client_cm on client_cm.coach_id = cm.id
        where client_cm.user_id = (select auth.uid())
      )
    )
  )
);
```

**Performance note:** Wrap `(select auth.uid())` and `(select auth.jwt())` in sub-selects as shown above to cache per query, not per row. Add indexes on `session_templates(coach_id)`, `community_members(user_id)`, `community_members(coach_id)`.

### Pattern 6: Session Coaches Junction Table (SESS-04)

```sql
create table public.session_coaches (
  session_id uuid references public.sessions(id) on delete cascade not null,
  member_id uuid references public.community_members(id) on delete cascade not null,
  is_primary boolean not null default false,
  primary key (session_id, member_id)
);
```

Co-coaches are added at the template level and propagated to generated sessions, or added directly to a session instance.

### Pattern 7: Server Action Pattern (follows Phase 1 pattern)

```typescript
// Source: src/lib/actions/invites.ts — Phase 1 established pattern
'use server'

import { createClient } from '@/lib/supabase/server'

export async function rsvpSession(
  sessionId: string
): Promise<{ success: boolean; rsvpType?: 'confirmed' | 'waitlisted'; waitlistPosition?: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // ... auth + capacity check + insert
  return { success: true, rsvpType: 'confirmed' }
}
```

Form actions use `useActionState` from React with `prevState` as first argument — established in Phase 1 (`src/lib/actions/auth.ts` pattern).

### Anti-Patterns to Avoid

- **Generating sessions lazily at query time:** Complex to query, impossible to override per-instance. Use pre-generated rows. [CITED: .planning/research/ARCHITECTURE.md Anti-Pattern 5]
- **Application-only capacity enforcement:** Race condition when two clients RSVP simultaneously. Always add the DB trigger as the final guard.
- **Using `getSession()` in server code:** Always use `getUser()`. Established in Phase 1.
- **Missing community_id on new tables:** Every new table needs `community_id` + RLS. No exceptions.
- **Bare `auth.uid()` without SELECT wrapper in RLS:** Use `(select auth.uid())` to cache per-query, not per-row. [CITED: .planning/research/ARCHITECTURE.md Anti-Pattern 2]
- **Running FullCalendar as SSR:** Must use `dynamic(() => import(...), { ssr: false })` wrapper.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic for session generation | Custom date looping | `date-fns` `addWeeks`, `eachWeekOfInterval` | DST edge cases, locale handling, month boundaries |
| Form validation with field errors | Manual state per field | `react-hook-form` + Zod resolver | Phase 1 already uses Zod; RHF prevents re-renders on every keystroke for the 6-field session form |
| Calendar grid | Custom SVG/canvas | CSS Grid (lightweight) or FullCalendar | CSS Grid handles fixed time-slot layout cleanly; FullCalendar for drag-and-drop if needed later |
| Confirmation dialogs | Custom modal state | `@base-ui/react/dialog` | Already installed; handles focus trap, escape key, aria-dialog semantics |
| Capacity enforcement | App-level only | Postgres trigger | Race conditions between concurrent RSVPs; DB trigger is the only reliable guard |
| Waitlist position tracking | Application increment | DB `waitlist_position` column + sequencing in Server Action | Gaps on cancellation must be resequenced; keep logic in one place |

**Key insight:** Recurring schedule generation and capacity enforcement both have hidden correctness problems at concurrency boundaries. The DB is the right layer for both — do not trust application logic alone.

---

## Common Pitfalls

### Pitfall 1: Race Condition on RSVP Capacity Check

**What goes wrong:** Two clients check capacity simultaneously (both see 1 spot remaining), both pass the application-level check, both insert as `confirmed` — session is now over capacity.

**Why it happens:** Application-level checks are not atomic with the INSERT.

**How to avoid:** Postgres trigger on `session_rsvps` BEFORE INSERT that re-counts and raises exception. The Server Action catches the exception and surfaces "Session is now full — you've been added to the waitlist" as a friendly error.

**Warning signs:** If capacity enforcement is only in the Server Action, this will happen.

### Pitfall 2: Duplicate Session Generation

**What goes wrong:** pg_cron fires, `generate_sessions_from_templates()` runs, then a coach creates a new template. Calling `supabase.rpc('generate_sessions_from_templates')` from the Server Action after template creation runs again — generating duplicates.

**How to avoid:** The `UNIQUE (template_id, scheduled_at)` constraint on `sessions` + `ON CONFLICT DO NOTHING` in the generation function makes it idempotent. Generation can run as many times as needed.

**Warning signs:** If the generation function lacks `ON CONFLICT`, duplicate session rows will accumulate.

### Pitfall 3: FullCalendar SSR Crash

**What goes wrong:** Importing FullCalendar in a Server Component or without `ssr: false` throws "window is not defined" at build/render time.

**Why it happens:** FullCalendar uses browser globals internally.

**How to avoid:** Always wrap in a `'use client'` component and use `dynamic(() => import('./FullCalendarWrapper'), { ssr: false })` in the parent.

**Warning signs:** Build error mentioning `window` or `document` in a server context.

### Pitfall 4: Waitlist Position Gaps After Cancellation

**What goes wrong:** Client 3 on the waitlist cancels. Positions become [1, 2, _, 4, 5] — gaps. Client sees "5th on waitlist" when they should be "4th".

**How to avoid:** After any `session_rsvps` cancellation, re-sequence waitlist positions for the affected session in the same Server Action transaction — use `ORDER BY created_at` to determine the new sequence.

**Warning signs:** `waitlist_position` values are not contiguous for a session after multiple cancellations.

### Pitfall 5: "This and Future" Edit Breaking Past Sessions

**What goes wrong:** Coach edits "all future" sessions but the bulk UPDATE incorrectly applies to past sessions too, rewriting historical records.

**How to avoid:** The bulk UPDATE must include `WHERE scheduled_at >= [current session's scheduled_at]`. Test this boundary condition explicitly.

**Warning signs:** Sessions that have already occurred have their details changed.

### Pitfall 6: pg_cron Not Generating Sessions After Template Creation

**What goes wrong:** Coach creates a template, but no sessions appear until the next nightly cron run (up to 24 hours later).

**How to avoid:** Call `supabase.rpc('generate_sessions_from_templates')` from the `createTemplate` Server Action immediately after inserting the template. This is synchronous and typically takes < 100ms for a date range of weeks.

**Warning signs:** Sessions don't appear until the next day.

### Pitfall 7: RLS Policy on session_coaches Junction Missing

**What goes wrong:** Co-coaches can be added to sessions but cannot read those sessions because the RLS SELECT policy only checks `session_templates.coach_id`.

**How to avoid:** The sessions SELECT RLS policy must include a `session_coaches` join path (as shown in Pattern 5 above).

---

## Code Examples

### Creating a Session Template (Server Action)

```typescript
// Source: Phase 1 pattern from src/lib/actions/invites.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { SessionTemplateSchema } from '@/lib/validations/sessions'

export async function createSessionTemplate(
  _prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const userRole = user.app_metadata?.user_role
  if (userRole !== 'coach' && userRole !== 'admin') {
    return { success: false, error: 'Only coaches and admins can create sessions' }
  }

  const parsed = SessionTemplateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { success: false, error: 'Member record not found' }

  const { error: insertError } = await supabase
    .from('session_templates')
    .insert({ ...parsed.data, coach_id: member.id, community_id: user.app_metadata.community_id })

  if (insertError) return { success: false, error: insertError.message }

  // Generate sessions immediately — don't wait for nightly cron
  await supabase.rpc('generate_sessions_from_templates')

  return { success: true }
}
```

### Zod 4 Session Template Schema

```typescript
// Source: Phase 1 pattern from src/lib/validations/auth.ts
import { z } from 'zod'

export const SessionTemplateSchema = z.object({
  title: z.string().min(1, { error: 'Session title is required' }),
  venue: z.string().min(1, { error: 'Venue is required' }),
  day_of_week: z.coerce.number().int().min(0).max(6, { error: 'Invalid day of week' }),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, { error: 'Time must be HH:MM' }),
  duration_minutes: z.coerce.number().int().min(15).max(480).default(60),
  capacity: z.coerce.number().int().min(1, { error: 'Capacity must be at least 1' }),
  starts_on: z.string().date({ error: 'Start date is required' }),
  ends_on: z.string().date().optional(),
})
```

### RSVP Server Action

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function rsvpSession(sessionId: string): Promise<{
  success: boolean
  rsvpType?: 'confirmed' | 'waitlisted'
  waitlistPosition?: number
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const member = await supabase.from('community_members').select('id').eq('user_id', user.id).single()
  if (!member.data) return { success: false, error: 'Member not found' }

  // Check current capacity
  const [{ count: confirmedCount }, { data: session }] = await Promise.all([
    supabase.from('session_rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('rsvp_type', 'confirmed')
      .is('cancelled_at', null),
    supabase.from('sessions').select('capacity').eq('id', sessionId).single(),
  ])

  if (!session) return { success: false, error: 'Session not found' }

  const isFull = (confirmedCount ?? 0) >= session.capacity
  let waitlistPosition: number | undefined

  if (isFull) {
    const { count: waitlistCount } = await supabase
      .from('session_rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('rsvp_type', 'waitlisted')
      .is('cancelled_at', null)
    waitlistPosition = (waitlistCount ?? 0) + 1
  }

  const { error } = await supabase.from('session_rsvps').insert({
    session_id: sessionId,
    member_id: member.data.id,
    community_id: user.app_metadata.community_id,
    rsvp_type: isFull ? 'waitlisted' : 'confirmed',
    waitlist_position: waitlistPosition ?? null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/sessions')
  return { success: true, rsvpType: isFull ? 'waitlisted' : 'confirmed', waitlistPosition }
}
```

### Route Protection Updates (proxy.ts)

No changes needed to `src/proxy.ts` itself — it delegates to `src/lib/supabase/middleware.ts`. New routes need to be added to `ROLE_ALLOWED_ROUTES` in `src/lib/types/auth.ts`:

```typescript
// src/lib/types/auth.ts — update ROLE_HOME_ROUTES and ROLE_ALLOWED_ROUTES
export const ROLE_HOME_ROUTES: Record<Exclude<UserRole, 'pending'>, string> = {
  admin: '/admin',
  coach: '/coach',
  client: '/sessions',   // CHANGE: was '/welcome' in Phase 1
} as const

export const ROLE_ALLOWED_ROUTES: Record<Exclude<UserRole, 'pending'>, string[]> = {
  admin: ['/admin', '/coach', '/sessions', '/welcome', '/profile'],
  coach: ['/coach', '/sessions', '/welcome', '/profile'],
  client: ['/sessions', '/welcome', '/profile'],
} as const
```

### Navigation Update (AppNav.tsx)

```typescript
// Add to NAV_LINKS in src/components/nav/AppNav.tsx
{ href: '/sessions', label: 'Sessions', roles: ['client', 'admin'] },
{ href: '/coach', label: 'Schedule', roles: ['admin', 'coach'] },  // already present
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-big-calendar` for scheduling | FullCalendar 6.x or CSS Grid | 2023–2024 | react-big-calendar is less maintained and requires manual recurring event handling |
| `moment.js` for dates | `date-fns` 4.x | 2020+ | date-fns is tree-shakeable, functional, and supported by shadcn date picker |
| Global Supabase client singleton | Separate browser/server clients via `@supabase/ssr` | 2023 | Prevents cross-user session leaks in SSR/RSC environments |
| `getSession()` in server code | `getUser()` in server code | Supabase SSR guide update | `getUser()` validates JWT signature; `getSession()` trusts cookie without validation |
| Middleware in `middleware.ts` | Proxy in `proxy.ts` (Next.js 16) | Next.js 16.x | `middleware.ts` is renamed to `proxy.ts` in Next.js 16; exporting `proxy` instead of `middleware` |

**Deprecated/outdated:**
- `@supabase/auth-helpers`: Replaced by `@supabase/ssr 0.10.0`; do not use
- `rrule.js`: Not installed, not needed — D-02 specifies weekly-only recurrence, which is trivially implemented as `date + 7 days` without a full RFC 5545 library

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | FullCalendar 6.1.20 is compatible with React 19 | Standard Stack | Calendar component crashes at runtime; fallback is custom CSS Grid (which has no compatibility risk) |
| A2 | pg_cron is available and enabled on this project's Supabase instance | Architecture Patterns Pattern 1 | Session generation requires a Vercel Cron fallback via `/api/cron` Route Handler instead; the pattern is the same, just the trigger differs |
| A3 | `supabase.rpc('generate_sessions_from_templates')` returns within acceptable time (< 2s) for a typical coach date range (8–16 weeks) | Common Pitfalls Pitfall 6 | If slow, move generation to a background job and show a "Generating sessions..." pending state |
| A4 | `@base-ui/react` Dialog is sufficient for RSVP confirmation (D-10) without needing an additional dialog library | Standard Stack | Would need to add `shadcn` dialog component via CLI; low risk since base-ui Dialog is already used in the project |

**If A2 is confirmed false:** The fallback is a Vercel Cron Job that hits `/api/cron/generate-sessions` as a Route Handler. The Postgres function itself is identical. Add to `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/generate-sessions", "schedule": "0 2 * * *" }] }
```

---

## Open Questions

1. **pg_cron enabled on this Supabase project?**
   - What we know: pg_cron is available on free tier per Supabase community discussion
   - What's unclear: Whether the extension is already enabled in this project's Supabase dashboard
   - Recommendation: Include `CREATE EXTENSION IF NOT EXISTS pg_cron` in the migration; if it fails (insufficient permissions), the fallback Vercel Cron route handles it. Both strategies should be planned.

2. **Calendar grid: FullCalendar vs custom CSS Grid?**
   - What we know: FullCalendar is recommended in STACK.md; custom CSS Grid is simpler for fixed weekly layout
   - What's unclear: User preference / performance tolerance for FullCalendar bundle size
   - Recommendation: Build custom CSS Grid for Phase 2 (D-06 shows a fixed time-slot grid, not drag-and-drop). FullCalendar adds ~200KB for features not yet needed.

3. **Co-coach visibility: do co-coaches see the session on `/coach`?**
   - What we know: D-16 says co-coaches see the session on their schedule
   - What's unclear: Whether `session_coaches` is the source of truth or whether the template-level coach_id is also checked
   - Recommendation: RLS should check both `session_templates.coach_id` and `session_coaches.member_id` for session visibility — both implemented in Pattern 5.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ | 25.8.1 | — |
| npm | Package install | ✓ | 11.11.0 | — |
| Supabase CLI | DB migrations, type gen | ✗ | — | Apply migrations via Supabase dashboard SQL editor |
| pg_cron (Supabase) | Session auto-generation | ASSUMED ✓ | — | Vercel Cron + `/api/cron` Route Handler |
| date-fns | Session date logic | ✗ (not installed) | — | Must install: `npm install date-fns` |
| react-hook-form | Session create form | ✗ (not installed) | — | Must install: `npm install react-hook-form @hookform/resolvers` |
| FullCalendar | Coach calendar grid | ✗ (not installed) | — | Custom CSS Grid (preferred for Phase 2) |

[VERIFIED: Node.js 25.8.1, npm 11.11.0 via `node --version`, `npm --version`]
[VERIFIED: Supabase CLI not in PATH via `command -v supabase`]
[VERIFIED: date-fns, react-hook-form, FullCalendar not in node_modules]

**Missing with no fallback:** None — all missing dependencies either have fallbacks or can be installed.

**Must install before implementation:**
```bash
npm install date-fns react-hook-form @hookform/resolvers
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.mts` (exists) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SESS-01 | Coach creates session template — auth check, validation, insert | unit (Server Action) | `npx vitest run src/__tests__/actions/sessions.test.ts -t "createSessionTemplate"` | ❌ Wave 0 |
| SESS-02 | generate_sessions_from_templates() creates rows, is idempotent | unit (Server Action rpc) | `npx vitest run src/__tests__/actions/sessions.test.ts -t "generateSessions"` | ❌ Wave 0 |
| SESS-03 | editSession — 'this' scope modifies only one row | unit (Server Action) | `npx vitest run src/__tests__/actions/sessions.test.ts -t "editSession this"` | ❌ Wave 0 |
| SESS-03 | editSession — 'future' scope updates template + future sessions | unit (Server Action) | `npx vitest run src/__tests__/actions/sessions.test.ts -t "editSession future"` | ❌ Wave 0 |
| SESS-04 | addCoach — adds entry to session_coaches for valid coach member | unit (Server Action) | `npx vitest run src/__tests__/actions/sessions.test.ts -t "addCoach"` | ❌ Wave 0 |
| SESS-05 | rsvpSession — client can RSVP to assigned coach's session | unit (Server Action) | `npx vitest run src/__tests__/actions/rsvps.test.ts -t "rsvpSession confirmed"` | ❌ Wave 0 |
| SESS-06 | rsvpSession — inserts as waitlisted when session is full | unit (Server Action) | `npx vitest run src/__tests__/actions/rsvps.test.ts -t "rsvpSession waitlisted"` | ❌ Wave 0 |
| SESS-07 | rsvpSession — returns waitlist position | unit (Server Action) | `npx vitest run src/__tests__/actions/rsvps.test.ts -t "waitlist position"` | ❌ Wave 0 |
| SESS-08 | promoteFromWaitlist — coach promotes, type changes to confirmed | unit (Server Action) | `npx vitest run src/__tests__/actions/rsvps.test.ts -t "promote waitlist"` | ❌ Wave 0 |
| SESS-08 | promoteFromWaitlist — fails if session is still full | unit (Server Action) | `npx vitest run src/__tests__/actions/rsvps.test.ts -t "promote fails when full"` | ❌ Wave 0 |
| SESS-09 | cancelRsvp — sets cancelled_at, resequences waitlist | unit (Server Action) | `npx vitest run src/__tests__/actions/rsvps.test.ts -t "cancelRsvp"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/actions/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-phase`

### Wave 0 Gaps

- [ ] `src/__tests__/actions/sessions.test.ts` — covers SESS-01, SESS-02, SESS-03, SESS-04
- [ ] `src/__tests__/actions/rsvps.test.ts` — covers SESS-05, SESS-06, SESS-07, SESS-08, SESS-09
- [ ] Mock pattern: follow `src/__tests__/actions/invites.test.ts` — `vi.mock('@/lib/supabase/server')` + `createMockSupabase` factory

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase `getUser()` in every Server Action — established Phase 1 pattern |
| V3 Session Management | yes (inherited) | `@supabase/ssr` proxy pattern handles token refresh |
| V4 Access Control | yes | Role check in every Server Action (`user_role === 'coach'` for template create/edit; `user_role === 'client'` for RSVP); RLS enforces at DB layer |
| V5 Input Validation | yes | Zod 4 schema validation on all Server Action inputs (SessionTemplateSchema, RSVP inputs) |
| V6 Cryptography | no | No new crypto in this phase |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client RSVPs to a session from a non-assigned coach | Spoofing / Elevation | RLS `sessions_select` policy scoped by `coach_id` via `community_members`; Server Action verifies session visibility before RSVP insert |
| Over-booking by race condition | Tampering | Postgres trigger `enforce_session_capacity` — application check + DB-level guard |
| Coach editing another coach's session | Tampering | Server Action checks `session_templates.coach_id = member.id` before allowing edit |
| Client seeing another community's sessions | Information Disclosure | `community_id` in RLS on all tables; JWT claim checked, not a client-supplied value |
| Waitlist position manipulation | Tampering | `waitlist_position` set server-side only; not accepted from client input |
| Cancellation reason injection | Tampering | `cancellation_reason` validated via Zod `z.string().max(500)` before insert |

---

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Next.js App Router + Supabase + Vercel — non-negotiable
- **Architecture:** Client-side auth flows preserved; API layer clean for future React Native; separate browser/server Supabase clients
- **Multi-tenancy:** All new tables must include `community_id` column with RLS enforcing isolation
- **Mobile:** Mobile-responsive from day one; session cards must be touch-friendly
- **Payments:** No payment processing — not relevant to this phase
- **Next.js 16 proxy:** Use `src/proxy.ts` (exports `proxy` function) — `middleware.ts` is deprecated in Next.js 16; new routes added to `ROLE_ALLOWED_ROUTES` in `src/lib/types/auth.ts`
- **Zod 4 API:** Use `z.email()` top-level (not `z.string().email()`); use `z.string().min(1, { error: '...' })` not `message:` key
- **useActionState pattern:** Server Actions take `(prevState, formData)` signature; field errors returned as `{ fieldErrors: Record<string, string[]> }`
- **Server Supabase client:** Read-only `getAll` in `server.ts`; proxy handles `setAll` token refresh writes
- **Testing:** Vitest with `vi.mock('@/lib/supabase/server')` pattern; `createMockSupabase` factory per test file

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/ARCHITECTURE.md` — Template + concrete session row pattern, pg_cron, RLS patterns, anti-patterns; HIGH confidence (verified against Supabase official docs during prior research session)
- `.planning/research/STACK.md` — Date-fns, FullCalendar, react-hook-form recommendations with version verification; HIGH confidence
- `supabase/migrations/00001_foundation_schema.sql` — Existing schema: communities, community_members, invite_links; HIGH confidence (in-codebase)
- `src/lib/actions/invites.ts` — Server Action pattern: auth check → role check → DB operation → typed return; HIGH confidence (in-codebase)
- `src/lib/validations/auth.ts` — Zod 4 schema pattern with `z.email()` top-level API; HIGH confidence (in-codebase)
- `src/lib/types/auth.ts` — `ROLE_HOME_ROUTES`, `ROLE_ALLOWED_ROUTES` — update targets for Phase 2; HIGH confidence (in-codebase)
- `node_modules/next/dist/docs/01-app/02-guides/forms.md` — `useActionState` pattern, `prevState` argument; HIGH confidence (official Next.js 16 docs)
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md` — `revalidatePath` usage after mutations; HIGH confidence (official Next.js 16 docs)

### Secondary (MEDIUM confidence)
- [Supabase pg_cron discussion #37405](https://github.com/orgs/supabase/discussions/37405) — pg_cron available on free tier; MEDIUM confidence (community discussion, no hard limit on job count)
- [Supabase Cron module](https://supabase.com/modules/cron) — Official Supabase Cron page; MEDIUM confidence (verified pg_cron is a supported module)

### Tertiary (LOW confidence)
- FullCalendar React 19 compatibility: Not explicitly verified in this session — [ASSUMED] based on version 6.1.20 release timeline

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via package.json + npm view; prior STACK.md is npm-verified
- Architecture (schema): HIGH — builds directly on verified Phase 1 schema; patterns from official Supabase docs
- Architecture (pg_cron): MEDIUM — availability confirmed on free tier via community sources; activation state on this project is unknown
- Pitfalls: HIGH — race condition and duplicate generation patterns are well-understood concurrency problems
- Calendar grid decision: MEDIUM — custom CSS Grid vs FullCalendar left to planner/implementer based on complexity budget

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable domain — Supabase RLS patterns and Next.js 16 Server Actions are stable)
