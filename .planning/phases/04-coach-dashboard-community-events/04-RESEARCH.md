# Phase 4: Coach Dashboard & Community Events - Research

**Researched:** 2026-04-08
**Domain:** Next.js App Router + Supabase + React 19 — dashboard enhancement, community events system, Supabase Storage image uploads
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Add daily/weekly view toggle to the existing coach schedule page. Day view shows detailed time blocks with attendee counts and quick access to session details.
- **D-02:** Player roster (DASH-03) at `/coach/clients` shows each player with: last attended date and first lesson date. Simple, practical info that replaces spreadsheet lookup.
- **D-03:** Today's sessions on the coach dashboard show inline attendance preview: confirmed/capacity count and first few attendee names/avatars directly on the card. Tap for full session detail.
- **D-04:** Single "Create Event" button with type selector as first step. Form adapts fields based on selected type (Tournament, Social Event, Open Session). One flow to learn.
- **D-05:** Any community member can create events — tournaments, social events, and open sessions. Community-driven, matching ROADMAP success criteria #4.
- **D-06:** Tournament draws via image upload for MVP. Organiser creates bracket externally and uploads a photo/image. Interactive bracket builder deferred to a future phase.
- **D-07:** New top-level "Events" nav tab visible to all roles. Separate from coach "Schedule" and client "Sessions" tabs.
- **D-08:** Events page has two tabs: "Official" (coach/admin events) and "Community" (member-created). Default to Official tab. Satisfies EVNT-06 separation requirement.
- **D-09:** Coach/admin announcements appear as pinned cards at the top of the Official events tab. Coaches post announcements from the same events interface. No separate announcements page.
- **D-10:** Event cards show: type badge (Tournament/Social/Open), title, date/time, venue, spots remaining, and RSVP button. Consistent with session card pattern from Phase 2.
- **D-11:** Clients land on an action-oriented dashboard replacing the bare calendar grid. Dashboard shows: personalised greeting, upcoming sessions (next 3-5), upcoming events (next 3-5), and recent announcements.
- **D-12:** Client greeting includes quick stats: sessions this month, upcoming RSVPs, member since date.
- **D-13:** Session cards and event cards are tappable with clear RSVP buttons. Calendar view remains accessible as a secondary view.

### Claude's Discretion

- Event form field specifics per type (beyond type selector)
- Event detail page layout and content sections
- Event RSVP flow details (reuse session RSVP pattern where sensible)
- Open session vs coaching session differentiation in the UI
- Empty state designs for no events, no sessions, new communities
- Loading states and skeleton designs
- Mobile responsive layout details for dashboard and events
- Announcement card formatting and character limits

### Deferred Ideas (OUT OF SCOPE)

- Interactive bracket builder for tournaments
- Event RSVP details (capacity limits, waitlist for events, cancellation rules) — left to Claude's discretion
- Event detail page specifics — left to Claude's discretion
- Open session vs coaching session differentiation — left to Claude's discretion
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Coach sees daily/weekly schedule of upcoming sessions | D-01: extend WeekCalendarGrid with day/week toggle prop; new DayView component with session cards showing attendee strips |
| DASH-02 | Coach sees who's confirmed/waitlisted for each session | D-03: inline attendance preview on session cards; existing SessionDetailPanel already shows full lists — extend card query to include RSVP member names |
| DASH-03 | Coach can view all assigned players with attendance patterns | D-02: enhance `/coach/clients` page with last/first attendance dates via SQL query on session_rsvps joined with sessions |
| EVNT-01 | Any member can create tournaments (RSVP + manual draw posting) | D-04/D-06: Create Event dialog with type-selector flow; tournament type adds image upload input; Supabase Storage `event-draws` bucket |
| EVNT-02 | Any member can create social events with RSVP and capacity | D-04/D-05: same Create Event dialog; capacity field shown for Social Event and Open Session types |
| EVNT-03 | Any member can create open sessions visible to all members | D-04/D-05: same flow; Open Session type — note these are community-created, NOT coaching sessions |
| EVNT-04 | All community members can see and RSVP to events | New `events` + `event_rsvps` tables with community-scoped RLS; all roles see `/events` |
| EVNT-05 | Coach/admin can post announcements to the community | `announcements` table; coach/admin INSERT policy; shown as pinned cards on Official tab |
| EVNT-06 | Official (coach/admin) and community (member-created) events are separated | D-08: `is_official` boolean column on events table; Tabs component on Events page |
</phase_requirements>

---

## Summary

Phase 4 is primarily a UI/UX enhancement + schema addition phase. Three work streams run in parallel: (1) coach dashboard enhancements (day view toggle, roster attendance data), (2) new community events system (schema, CRUD, RSVP), and (3) client dashboard redesign. All three build on established Phase 2/3 patterns — no new libraries are needed beyond the three new shadcn components (Dialog, Select, Skeleton) already called out in the UI-SPEC.

The most technically distinct piece is the Supabase Storage integration for tournament draw image uploads. A verified pattern exists in `AvatarUpload.tsx` — the event draw upload follows the same `createClient().storage.from().upload()` client-side flow with `upsert: true`. A new `event-draws` bucket is needed (separate from `avatars`).

The second distinct piece is the database schema for `events`, `event_rsvps`, and `announcements` tables with appropriate RLS policies. The policies follow the same JWT-claims pattern already established in `00002_session_schema.sql` — `((select auth.jwt()) ->> 'community_id')::uuid` for community scoping and `((select auth.jwt()) ->> 'user_role')` for role checks.

**Primary recommendation:** Plan tasks in this order: (1) DB migration + RLS, (2) server actions + validations, (3) UI components (EventCard, AnnouncementCard, CreateEventDialog), (4) pages (/events, redesigned /sessions), (5) coach dashboard enhancements, (6) nav conversion to bottom tabs. Bottom-nav conversion to AppNav is last because it touches every page.

---

## Standard Stack

### Core (already installed — verified)
| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| Next.js | 16.2.2 | App Router, RSC, server actions | [VERIFIED: package.json] |
| React | 19.2.4 | UI rendering | [VERIFIED: package.json] |
| Supabase JS | 2.101.1 | DB queries, Storage, Auth | [VERIFIED: package.json] |
| @supabase/ssr | 0.10.0 | Server-side Supabase client | [VERIFIED: package.json] |
| Zod | 4.3.6 | Schema validation for server actions | [VERIFIED: package.json] |
| Tailwind CSS | 4.x | Styling | [VERIFIED: package.json] |
| framer-motion | 12.38.0 | Entrance animations (already installed) | [VERIFIED: package.json] |
| lucide-react | 1.7.0 | Icons (Trophy, PartyPopper, Zap, CalendarDays etc.) | [VERIFIED: package.json] |
| shadcn (base-nova) | 4.1.2 | Component primitives | [VERIFIED: package.json] |
| vitest | 4.1.2 | Testing framework | [VERIFIED: package.json] |

### New shadcn components to install (called out in UI-SPEC)
| Component | Install Command | Purpose |
|-----------|----------------|---------|
| Dialog | `npx shadcn add dialog` | Create Event flow (type selector + form), confirmation dialogs |
| Select | `npx shadcn add select` | Event type selector fallback on narrow viewports |
| Skeleton | `npx shadcn add skeleton` | Dashboard / event list / roster loading states |

[VERIFIED: UI-SPEC `## Component Inventory`; shadcn@4.1.2 already in package.json]

### Zod 4 API note (CRITICAL)
The project uses Zod 4.3.6. Zod 4 has a different error API from Zod 3:
- Field errors: `z.string().min(1, { error: 'message' })` — NOT `.min(1, 'message')`
- Top-level email: `z.email()` — NOT `z.string().email()`
- Flatten: `.error.flatten().fieldErrors` — same as Zod 3

[VERIFIED: existing `src/lib/validations/sessions.ts` uses `{ error: '...' }` syntax]

---

## Architecture Patterns

### Recommended File Structure for New Code

```
src/
├── app/
│   ├── events/
│   │   ├── page.tsx                  # /events — Events page (Official/Community tabs)
│   │   ├── loading.tsx               # Skeleton loading state
│   │   └── [eventId]/
│   │       ├── page.tsx              # /events/[eventId] — Event detail
│   │       └── loading.tsx
│   └── sessions/
│       └── page.tsx                  # /sessions — REDESIGNED client dashboard (replaces WeekCalendarGrid)
├── components/
│   ├── events/
│   │   ├── EventCard.tsx             # Event card component (reusable)
│   │   ├── AnnouncementCard.tsx      # Announcement card component
│   │   ├── CreateEventDialog.tsx     # Multi-step create event dialog
│   │   ├── EventRsvpButton.tsx       # RSVP / cancel RSVP for events
│   │   └── DrawImageUpload.tsx       # Tournament draw image upload
│   ├── dashboard/
│   │   └── ClientDashboard.tsx       # Client dashboard sections (greeting, stats, lists)
│   └── calendar/
│       └── WeekCalendarGrid.tsx      # EXTEND only — add view prop for day/week toggle
├── lib/
│   ├── types/
│   │   └── events.ts                 # Event, EventRsvp, Announcement TypeScript types
│   ├── validations/
│   │   └── events.ts                 # Zod schemas: CreateEventSchema, AnnouncementSchema
│   └── actions/
│       ├── events.ts                 # createEvent, rsvpEvent, cancelEventRsvp, deleteEvent
│       └── announcements.ts          # createAnnouncement, editAnnouncement
└── supabase/
    └── migrations/
        └── 00005_events_schema.sql   # events, event_rsvps, announcements tables + RLS
```

### Pattern 1: Server Action with `{ success, data?, error?, fieldErrors? }` return shape

All server actions in this codebase use a consistent return shape. New event actions MUST follow this pattern.

```typescript
// Source: src/lib/actions/rsvps.ts (verified pattern)
'use server'

export async function createEvent(
  _prevState: EventActionResult,
  formData: FormData
): Promise<EventActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  const communityId = claims.community_id
  if (!communityId) return { success: false, error: 'No community associated with your account' }

  // Zod validation using Zod 4 error syntax
  const parsed = CreateEventSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  // ... DB insert ...

  revalidatePath('/events')
  return { success: true }
}
```

### Pattern 2: useActionState for form handling with inline field errors

```typescript
// Source: established Phase 1/2 pattern throughout codebase
'use client'
import { useActionState } from 'react'

const [state, formAction, pending] = useActionState(createEvent, { success: false })

// onChange clears that field's error — Phase 1 pattern
const [titleError, setTitleError] = useState<string | undefined>()
// On change: setTitleError(undefined)
// Display: titleError ?? state.fieldErrors?.title?.[0]
```

### Pattern 3: JWT Claims for role/community checks

```typescript
// Source: src/lib/supabase/server.ts (getJWTClaims)
// Source: src/lib/actions/sessions.ts (verified usage)
const claims = await getJWTClaims(supabase)
const communityId = claims.community_id
const userRole = claims.user_role  // 'admin' | 'coach' | 'client'
```

### Pattern 4: Supabase Storage client-side upload

```typescript
// Source: src/components/profile/AvatarUpload.tsx (verified pattern)
'use client'
const supabase = createClient()  // browser client
const path = `${communityId}/${eventId}/draw`
const { error } = await supabase.storage
  .from('event-draws')           // NEW bucket needed in migration
  .upload(path, file, { upsert: true, contentType: file.type })

const { data } = supabase.storage.from('event-draws').getPublicUrl(path)
// data.publicUrl is synchronous — no await needed
```

### Pattern 5: Two-tab page with shadcn Tabs

The Events page needs Official/Community tabs. The shadcn `Tabs` component is already installed (`src/components/ui/tabs.tsx`).

```typescript
// Source: shadcn Tabs — already used in codebase (ui/tabs.tsx present)
// Events page uses server-rendered content with client Tabs wrapper
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

<Tabs defaultValue="official">
  <TabsList>
    <TabsTrigger value="official">Official</TabsTrigger>
    <TabsTrigger value="community">Community</TabsTrigger>
  </TabsList>
  <TabsContent value="official">...</TabsContent>
  <TabsContent value="community">...</TabsContent>
</Tabs>
```

NOTE: Because the Events page uses Tabs (client interactivity) but fetches data server-side, the page.tsx should be a Server Component that passes data as props to a `'use client'` EventsPageClient wrapper, or uses Suspense boundaries. The established pattern in this project is: server page fetches data, passes as props to client components.

### Pattern 6: Role-based route registration (proxy + auth types)

Adding `/events` requires three file edits:
1. `src/lib/types/auth.ts` — add `/events` to all roles in `ROLE_ALLOWED_ROUTES`
2. `src/lib/supabase/middleware.ts` (updateSession) — the `roleRoutes` object also has inline route lists that need `/events`
3. `AppNav` — add Events tab entry

[VERIFIED: src/lib/types/auth.ts ROLE_ALLOWED_ROUTES, src/lib/supabase/middleware.ts roleRoutes object both exist]

### Pattern 7: Framer Motion entrance animations (already installed)

```typescript
// Source: .planning/DESIGN-REF.md — AceHub pattern, framer-motion@12.38.0 verified installed
import { motion } from 'framer-motion'

// Staggered list items
{events.map((event, index) => (
  <motion.div
    key={event.id}
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
  >
    <EventCard event={event} />
  </motion.div>
))}
```

### Anti-Patterns to Avoid

- **Don't rewrite WeekCalendarGrid:** CONTEXT.md D-01 explicitly says "extend, do not rewrite". Add a `view` prop and render a new DayView section inside the same component or alongside it.
- **Don't use `useEffect` for auth role reading in pages:** Pages are Server Components — get role from `getJWTClaims()` server-side. Only `AppNav` (client component) reads role via JWT decode from `getSession()`.
- **Don't use `middleware.ts`:** This project uses `proxy.ts` (Next.js 16 convention). `middleware.ts` is deprecated in v16. [VERIFIED: src/proxy.ts exists, AGENTS.md and STATE.md confirm this]
- **Don't use `z.string().email()` or `z.string().min(1, 'msg')`:** Project uses Zod 4 — use `z.email()` and `{ error: 'msg' }` syntax. [VERIFIED: src/lib/validations/sessions.ts]
- **Don't add `'use client'` to page.tsx files unnecessarily:** Data fetching happens in Server Components. Client interactivity is isolated to leaf components.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event type badge colors | Custom color logic | CSS class map per UI-SPEC | UI-SPEC defines exact badge classes per type |
| Image upload to storage | Custom multipart form | Supabase JS `storage.from().upload()` | Pattern already exists in AvatarUpload.tsx |
| Capacity enforcement | Application-level check only | DB trigger (same as sessions) | Race conditions at DB level; session_rsvps already has `check_session_capacity` trigger — replicate for event_rsvps |
| Tabs state management | useState + manual active class | shadcn Tabs component | Already installed, handles accessible keyboard nav |
| Dialog open/close | useState + conditional render | shadcn Dialog component | Handles focus trap, escape key, accessibility — install via `npx shadcn add dialog` |
| Loading skeletons | Spinner | shadcn Skeleton | Design spec requires skeleton rows — install via `npx shadcn add skeleton` |
| Confirmation dialogs | Inline confirm | shadcn Dialog | Cancel RSVP and Delete Event confirmations per UI-SPEC |
| Framer Motion animations | CSS transitions | `framer-motion` (already installed) | Design spec requires framer-motion stagger animations |

---

## Database Schema Design

### New Tables Required (migration 00005)

#### `events` table

```sql
create table public.events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  created_by uuid references public.community_members(id) not null,
  event_type text not null check (event_type in ('tournament', 'social', 'open_session')),
  title text not null,
  description text,
  venue text not null,
  starts_at timestamptz not null,
  duration_minutes int,
  capacity int check (capacity > 0),
  is_official boolean not null default false,  -- coach/admin created = official
  draw_image_url text,                          -- tournament draw image
  cancelled_at timestamptz,
  created_at timestamptz default now()
);
```

Key design choices:
- `is_official` boolean differentiates Official tab (coach/admin) from Community tab (member-created). Simpler than a separate `source` column.
- `draw_image_url` is nullable — only tournaments may have it.
- `capacity` is nullable — not all events have a cap.
- `event_type` is constrained to 3 MVP values; `open_session` distinguishes member-created open court time from coaching sessions.

#### `event_rsvps` table

```sql
create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  event_id uuid references public.events(id) on delete cascade not null,
  member_id uuid references public.community_members(id) on delete cascade not null,
  rsvp_type text not null default 'confirmed' check (rsvp_type in ('confirmed', 'waitlisted')),
  waitlist_position int,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  unique (event_id, member_id)
);
```

Mirrors `session_rsvps` structure for consistency. Capacity enforcement handled in server action (check confirmed count before insert) — a DB trigger is optional but consistent with sessions pattern.

#### `announcements` table

```sql
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  created_by uuid references public.community_members(id) not null,
  title text not null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Announcements are separate from events — they have no RSVP, no date, no venue. They appear as pinned cards on the Official tab.

### RLS Policy Patterns

All new tables follow the same JWT-claims pattern as sessions. Key rules:

**events SELECT:** All community members can see all events in their community (both official and community tabs).
```sql
-- community_id matches JWT claim
using (community_id = ((select auth.jwt()) ->> 'community_id')::uuid)
```

**events INSERT:** Any authenticated member in the community (D-05: any member can create).
```sql
with check (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  -- is_official can only be true for coach/admin
  and (
    not NEW.is_official
    or ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
  )
)
```

**events UPDATE/DELETE:** Creator or admin.

**event_rsvps INSERT:** Member can only RSVP for themselves (mirrors session_rsvps pattern).

**announcements INSERT:** Coach or admin only.
```sql
with check (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
)
```

### Supabase Storage Bucket

New bucket needed: `event-draws`
- Public bucket (draw images are shared with all community members)
- Path pattern: `{community_id}/{event_id}/draw`
- `upsert: true` to allow re-upload

Create in migration or via Supabase dashboard. Existing `avatars` bucket policy is the reference.

[ASSUMED: Supabase free tier allows multiple public storage buckets — based on general knowledge, not verified in this session]

---

## Common Pitfalls

### Pitfall 1: Dual route-protection locations for /events

**What goes wrong:** Adding `/events` to `ROLE_ALLOWED_ROUTES` in `auth.ts` but forgetting the inline `roleRoutes` object in `src/lib/supabase/middleware.ts` (updateSession function). The middleware has its own hardcoded route map that is separate from `ROLE_ALLOWED_ROUTES`.

**Why it happens:** Two places define role-route mapping — the type file and the middleware. Both must be updated.

**How to avoid:** When adding a new route, search for `roleRoutes` in middleware.ts AND `ROLE_ALLOWED_ROUTES` in auth.ts. Update both.

**Warning signs:** Route redirects to role home page even when role should have access.

### Pitfall 2: WeekCalendarGrid `view` prop — SSR/hydration mismatch for localStorage

**What goes wrong:** The day/week toggle persists view preference in `localStorage` (per UI-SPEC). Reading `localStorage` during SSR causes hydration mismatch.

**Why it happens:** `localStorage` is browser-only. Server renders default, client reads localStorage and renders different initial state.

**How to avoid:** Initialize the view state with `useState('week')` (the default), then use `useEffect` to read localStorage after hydration. This is the standard Next.js pattern for localStorage-persisted UI state.

```typescript
const [view, setView] = useState<'day' | 'week'>('week')
useEffect(() => {
  const saved = localStorage.getItem('tennis-schedule-view')
  if (saved === 'day' || saved === 'week') setView(saved)
}, [])
```

### Pitfall 3: Event creation `is_official` computed server-side, not from form

**What goes wrong:** Passing `is_official` from the client form allows any member to create official events.

**Why it happens:** If the form includes a hidden `is_official` field, a malicious user can set it to true.

**How to avoid:** In the `createEvent` server action, compute `is_official` from the JWT role claim, NOT from formData. Only coach/admin produce official events.

```typescript
const isOfficial = claims.user_role === 'coach' || claims.user_role === 'admin'
```

### Pitfall 4: Client dashboard query N+1 on session attendee names

**What goes wrong:** Fetching attendee names for each session card individually (one query per session) causes N+1 queries.

**Why it happens:** The session cards on the client dashboard show "upcoming sessions" — if attendee data is fetched per-session, N sessions = N queries.

**How to avoid:** For the client dashboard, session cards show simpler data (RSVP status, spots remaining) — attendee names are NOT shown on client session cards. Only the coach day-view cards show attendee strips, and that data should be fetched in a single joined query for all sessions in the day.

### Pitfall 5: framer-motion `motion.div` with Server Components

**What goes wrong:** Using `motion.div` directly in a Server Component (no `'use client'`) causes a build error because framer-motion uses React context/hooks.

**Why it happens:** framer-motion is a client-side library.

**How to avoid:** Any component using framer-motion must have `'use client'`. Page files are Server Components — create a client wrapper (e.g., `AnimatedEventList.tsx`) that receives data as props and renders motion elements.

### Pitfall 6: shadcn Dialog bottom-sheet on mobile

**What goes wrong:** The Create Event dialog should be a bottom sheet on mobile, centered on desktop. shadcn Dialog is centered by default.

**Why it happens:** Default shadcn Dialog styling does not include mobile bottom-sheet behavior.

**How to avoid:** Per UI-SPEC, use the `Dialog` component but override positioning for mobile: add responsive classes to the DialogContent. Pattern: `sm:max-w-[425px]` for desktop center; for mobile bottom-sheet, add `max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:rounded-b-none` to DialogContent.

---

## Code Examples

### Attendance data query for coach roster (DASH-03)

```typescript
// Source: derived from existing session_rsvps + sessions schema (verified)
// For each player, get their first and last confirmed session attendance

const memberIds = players.map(p => p.id)

// Get first and last attended session per member
const { data: attendanceData } = await supabase
  .from('session_rsvps')
  .select('member_id, sessions!inner(scheduled_at)')
  .in('member_id', memberIds)
  .eq('rsvp_type', 'confirmed')
  .is('cancelled_at', null)
  .order('sessions(scheduled_at)', { ascending: true })

// Process in JS: group by member_id, extract min/max scheduled_at
```

### Event RSVP server action pattern

```typescript
// Source: mirrors rsvps.ts pattern (verified)
export async function rsvpEvent(eventId: string): Promise<EventRsvpActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  const communityId = claims.community_id
  if (!communityId) return { success: false, error: 'No community' }

  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!member) return { success: false, error: 'Member record not found' }

  // Check event capacity (if set)
  const { data: event } = await supabase
    .from('events')
    .select('capacity, cancelled_at')
    .eq('id', eventId)
    .single()
  if (!event || event.cancelled_at) return { success: false, error: 'Event not found or cancelled' }

  let rsvpType: 'confirmed' | 'waitlisted' = 'confirmed'
  if (event.capacity !== null) {
    const { count } = await supabase
      .from('event_rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('rsvp_type', 'confirmed')
      .is('cancelled_at', null)
    if ((count ?? 0) >= event.capacity) rsvpType = 'waitlisted'
  }

  const { error } = await supabase.from('event_rsvps').insert({
    event_id: eventId,
    member_id: member.id,
    community_id: communityId,
    rsvp_type: rsvpType,
  })
  if (error) return { success: false, error: error.message }

  revalidatePath('/events')
  revalidatePath('/sessions')
  return { success: true, rsvpType }
}
```

### Client stats query (sessions this month, upcoming RSVPs)

```typescript
// Source: derived from existing schema (verified table structures)
const now = new Date()
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

// Sessions attended this month
const { count: sessionsThisMonth } = await supabase
  .from('session_rsvps')
  .select('*', { count: 'exact', head: true })
  .eq('member_id', member.id)
  .eq('rsvp_type', 'confirmed')
  .is('cancelled_at', null)
  .gte('created_at', monthStart)  // approximation; ideally join sessions.scheduled_at

// Upcoming confirmed RSVPs
const { count: upcomingRsvps } = await supabase
  .from('session_rsvps')
  .select('sessions!inner(scheduled_at)', { count: 'exact', head: true })
  .eq('member_id', member.id)
  .eq('rsvp_type', 'confirmed')
  .is('cancelled_at', null)
  .gte('sessions.scheduled_at', now.toISOString())
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `middleware.ts` | `proxy.ts` | Next.js 16 renamed middleware to proxy — project already uses this [VERIFIED: src/proxy.ts] |
| `z.string().email()` | `z.email()` (Zod 4) | Project uses Zod 4.3.6 — flat API [VERIFIED: validations/sessions.ts] |
| `z.string().min(1, 'msg')` | `z.string().min(1, { error: 'msg' })` | Zod 4 error API change [VERIFIED: validations/sessions.ts] |
| Top-nav horizontal bar | Bottom tab nav (AppNav conversion) | UI-SPEC Phase 4 converts AppNav to fixed bottom tabs matching AceHub design |
| Client sessions page = WeekCalendarGrid | Action-oriented dashboard | D-11: /sessions fully redesigned for Phase 4 |

---

## Route Integration Checklist

When adding `/events`, these locations MUST be updated:

| File | Change |
|------|--------|
| `src/lib/types/auth.ts` | Add `/events` to all 3 roles in `ROLE_ALLOWED_ROUTES` |
| `src/lib/supabase/middleware.ts` | Add `/events` to all 3 role arrays in inline `roleRoutes` object |
| `src/components/nav/AppNav.tsx` | Add Events tab entry (all roles) + convert to bottom nav |
| `src/lib/types/auth.ts` | Update `ROLE_HOME_ROUTES` — client home changes from `/sessions` to `/sessions` (no change needed, client still lands on /sessions) |

[VERIFIED: Both `ROLE_ALLOWED_ROUTES` in auth.ts and the inline `roleRoutes` in middleware.ts currently omit `/events` — confirmed by reading both files]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase free tier allows multiple public storage buckets | Database Schema Design | Low risk — Supabase free tier has generous storage; if limited, use single `uploads` bucket with path prefixes |
| A2 | `sessions!inner(scheduled_at)` foreign table filter syntax works in supabase-js for attendance queries | Code Examples | Medium risk — if the join filter syntax differs in 2.101.1, attendance query needs restructuring to a two-step fetch |
| A3 | AppNav bottom-nav conversion does not break existing page layouts (padding/spacing) | Architecture | Medium risk — all pages currently have top-padding for the top nav bar; bottom nav requires changing from `pt-14` to `pb-24` (already specified in UI-SPEC per-page) |

---

## Open Questions (RESOLVED)

1. **Attendance query for DASH-03 — exact Supabase join syntax**
   - What we know: `session_rsvps` and `sessions` tables exist; need min/max `scheduled_at` per member
   - What's unclear: Whether `supabase-js` 2.101.1 supports `.order('sessions(scheduled_at)')` for foreign table ordering
   - Recommendation: Use two-query approach if join ordering is unsupported — first fetch RSVPs, then fetch sessions by ID, merge in JS (same pattern as the two-query strategy already in coach/page.tsx)

2. **Event draw image public URL cache busting**
   - What we know: `getPublicUrl()` is synchronous; `upsert: true` overwrites at same path
   - What's unclear: Whether Supabase CDN caches the old image when re-uploaded at same path
   - Recommendation: Append a timestamp query param to the path on re-upload, or use event ID + timestamp as path: `{communityId}/{eventId}/draw-{timestamp}`

3. **`is_official` for admin-created events**
   - What we know: Coach/admin creating events should produce `is_official: true`
   - What's unclear: Whether admin-created events should appear in Official or Community tab when admin is acting as community manager
   - Recommendation: Consistent with D-08, admin-created events are official (admin role = coach-level authority). Compute `is_official = role in ('coach', 'admin')` server-side.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/runtime | ✓ | 25.8.1 | — |
| npm | Package install | ✓ | 11.11.0 | — |
| Supabase JS | DB + Storage | ✓ | 2.101.1 | — |
| framer-motion | Animations | ✓ | 12.38.0 | CSS transitions (degrade gracefully) |
| lucide-react | Icons | ✓ | 1.7.0 | — |
| vitest | Tests | ✓ | 4.1.2 | — |
| shadcn Dialog | Create Event flow | ✗ | — | Install: `npx shadcn add dialog` |
| shadcn Select | Event type (narrow) | ✗ | — | Install: `npx shadcn add select` |
| shadcn Skeleton | Loading states | ✗ | — | Install: `npx shadcn add skeleton` |
| Supabase Storage `event-draws` bucket | Tournament draw upload | ✗ | — | Create in migration or dashboard |

**Missing dependencies with no fallback:** None — all missing items have clear install commands.

**Missing dependencies with fallback:** framer-motion (installed) has CSS transition fallback if needed, but it is already installed so no fallback needed.

[VERIFIED: All installed packages via `npm list` command in this session]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/lib` |
| Full suite command | `npx vitest run` |

[VERIFIED: vitest.config.ts exists, includes `['src/**/*.test.{ts,tsx}']`, jsdom environment]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | WeekCalendarGrid renders day view when view='day' | unit | `npx vitest run src/components/calendar` | ❌ Wave 0 |
| DASH-02 | Session card shows confirmed count and attendee names | unit | `npx vitest run src/components/calendar` | ❌ Wave 0 |
| DASH-03 | Coach clients page includes last/first attendance dates | unit | `npx vitest run src/app/coach` | ❌ Wave 0 |
| EVNT-01 | createEvent action with type=tournament succeeds | unit | `npx vitest run src/lib/actions` | ❌ Wave 0 |
| EVNT-02 | createEvent action with type=social succeeds | unit | `npx vitest run src/lib/actions` | ❌ Wave 0 |
| EVNT-03 | createEvent action with type=open_session succeeds | unit | `npx vitest run src/lib/actions` | ❌ Wave 0 |
| EVNT-04 | rsvpEvent action inserts confirmed rsvp | unit | `npx vitest run src/lib/actions` | ❌ Wave 0 |
| EVNT-05 | createAnnouncement action rejects non-coach/admin | unit | `npx vitest run src/lib/actions` | ❌ Wave 0 |
| EVNT-06 | EventCard renders with correct tab separation | unit | `npx vitest run src/components/events` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/actions/events.ts` (action under test)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/actions/events.test.ts` — covers EVNT-01 through EVNT-05
- [ ] `src/lib/actions/announcements.test.ts` — covers EVNT-05
- [ ] `src/components/calendar/WeekCalendarGrid.test.tsx` — covers DASH-01, DASH-02
- [ ] `src/components/events/EventCard.test.tsx` — covers EVNT-06

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Supabase Auth (established Phase 1) |
| V3 Session Management | no | Supabase session (established Phase 1) |
| V4 Access Control | yes | RLS policies on events, event_rsvps, announcements; `is_official` computed server-side |
| V5 Input Validation | yes | Zod 4 schemas for event creation and announcement forms |
| V6 Cryptography | no | No new crypto; Supabase handles auth tokens |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Member sets `is_official=true` on event form | Tampering | Compute `is_official` from JWT role in server action, never from formData |
| Member creates announcement (coach-only) | Elevation of Privilege | `announcements` INSERT policy: role in ('admin', 'coach') |
| Cross-community event RSVP | Tampering | RLS: `event_rsvps` community_id must match JWT community_id |
| Tournament draw image upload — oversized file | DoS | Client-side 5MB check + server-side validation before storage.upload() |
| RSVP for another member | Spoofing | `event_rsvps` INSERT: member_id must equal community_members.id for current user |

---

## Sources

### Primary (HIGH confidence)
- `src/lib/actions/rsvps.ts` — server action pattern, JWT claims usage, RSVP logic [VERIFIED: read in session]
- `src/lib/actions/sessions.ts` — createSessionTemplate pattern, revalidatePath pattern [VERIFIED: read in session]
- `src/lib/validations/sessions.ts` — Zod 4 schema syntax [VERIFIED: read in session]
- `src/components/profile/AvatarUpload.tsx` — Supabase Storage client-side upload pattern [VERIFIED: read in session]
- `src/components/calendar/WeekCalendarGrid.tsx` — component to extend [VERIFIED: read in session]
- `src/lib/supabase/middleware.ts` — dual route-protection location [VERIFIED: read in session]
- `src/lib/types/auth.ts` — ROLE_ALLOWED_ROUTES, dual route registration [VERIFIED: read in session]
- `supabase/migrations/00002_session_schema.sql` — RLS policy patterns, JWT claim syntax [VERIFIED: read in session]
- `.planning/phases/04-coach-dashboard-community-events/04-UI-SPEC.md` — visual contract, spacing, component inventory [VERIFIED: read in session]
- `.planning/phases/04-coach-dashboard-community-events/04-CONTEXT.md` — locked decisions [VERIFIED: read in session]
- `package.json` — all installed library versions [VERIFIED: npm list in session]

### Tertiary (LOW confidence)
- Supabase free tier storage bucket limits [ASSUMED — A1]
- `supabase-js` 2.101.1 foreign table order syntax [ASSUMED — A2]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from package.json and npm list
- Architecture patterns: HIGH — derived directly from existing code files
- Database schema design: HIGH — follows established migration patterns
- Pitfalls: HIGH — derived from direct code inspection of dual-location route protection, localStorage hydration, and Zod 4 syntax
- Attendance query syntax: LOW — exact supabase-js join syntax not verified against 2.101.1 docs

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable stack, 30-day window)
