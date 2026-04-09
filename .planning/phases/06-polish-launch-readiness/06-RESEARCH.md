# Phase 6: Polish & Launch Readiness - Research

**Researched:** 2026-04-09
**Domain:** Cross-cutting UX polish, race-condition safety, RLS audit, UI corrections
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Session cards show spots in fraction format: "4/8 spots". Color-coded by fill level — green (open), orange (>=75% full), red (full/waitlist)
- **D-02:** Waitlisted clients see their position inline on the session card: "Waitlisted — #3 in line" where the RSVP button normally appears. No need to tap into session detail
- **D-03:** Calendar view is user's choice — no auto-switching by breakpoint. User picks week or day view on first visit, preference persists in localStorage. Both options available on all screen sizes
- **D-04:** All times displayed in Australia/Sydney timezone implicitly. Timezone suffix ("AEST"/"AEDT") only shown when the user's browser timezone differs from Australia/Sydney. Clean for the 99% Sydney community case
- **D-05:** Concurrent RSVP protection via Supabase RPC function with row-level lock (Postgres FOR UPDATE). Function atomically checks capacity, inserts RSVP or waitlist entry in a single round-trip
- **D-06:** When a user loses the RSVP race, they are auto-waitlisted silently. Toast notification: "Session just filled — you're #1 on the waitlist". No extra user action needed
- **D-07:** Automated RLS test suite that verifies every table has row-level security enabled with correct community-scoping policies. Tests run as part of the build for ongoing regression prevention
- **D-08:** Any table without proper RLS is a launch blocker. All gaps must be fixed before shipping — security is non-negotiable
- **D-09:** Profile edit page gets a cancel button — user can exit editing without cycling through the entire profile edit flow
- **D-10:** Logout button shows a styled Dialog confirmation (not browser confirm()) before logging out. Consistent with the app's Dialog component pattern and the "no browser dialogs" rule
- **D-11:** Upcoming sessions split into "Today" and "This Week" sections for clearer time orientation
- **D-12:** Calendar grid gets frozen panes — sticky date header row at top and time column on left when scrolling. Maintains context during navigation

### Claude's Discretion

- RLS test framework choice (vitest with Supabase client, or raw SQL tests)
- Exact color values for capacity indicators (within the AceHub palette)
- Toast component implementation details
- Calendar frozen pane CSS approach (sticky positioning)
- Loading states for any new UI additions

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 6 is a cross-cutting correctness and polish pass — no new features, only hardening what already exists. The work divides into four categories: (1) capacity display and waitlist inline state on session cards across three surfaces, (2) a Postgres RPC function that eliminates the TOCTOU race in the existing `rsvpSession` action, (3) an RLS audit with automated tests that remain as a regression guard, and (4) a handful of targeted UI fixes (cancel button on profile edit, Dialog-wrapped logout, Today/This Week session grouping, frozen calendar panes).

The existing codebase is in better shape than the CONCERNS.md (written at project bootstrap) suggests. All six migration files show `ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` statements for every table. The race condition in `rsvpSession` is real — it performs a read-then-write across multiple round-trips without a lock. The Supabase RPC + `FOR UPDATE` approach in D-05 is the correct fix. The `WeekCalendarGrid` already uses CSS Grid with `position: absolute` event blocks; the frozen-pane work is additive CSS (`position: sticky`) on the header row and time column that are already there. The logout Dialog wraps an existing `handleLogout` function in `AppNav` — low-risk change. The profile edit cancel button is a one-line addition to `ProfileSetupWizard` or a new route-back button on `ProfileView`.

**Primary recommendation:** Implement in five distinct plan units — (1) capacity display + waitlist inline, (2) atomic RSVP RPC, (3) RLS audit + tests, (4) calendar frozen panes + view state already implemented, (5) targeted UI fixes (logout Dialog, profile cancel, session grouping). Unit 4 is mostly already done; verify and tighten.

---

## Standard Stack

### Core (already in project — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.1.2 | Unit/integration tests | Already configured (`vitest.config.ts`), used in existing test files [VERIFIED: package.json] |
| @supabase/supabase-js | 2.101.1 | Supabase client for RLS audit tests | Already installed [VERIFIED: package.json] |
| @base-ui/react | installed | Dialog component for logout confirmation | Already used in `src/components/ui/dialog.tsx` [VERIFIED: codebase] |
| sonner | installed | Toast notifications for race condition feedback | Already in `src/components/ui/sonner.tsx` and used in `RsvpSessionButton` [VERIFIED: codebase] |
| framer-motion | installed | Animations on session cards | Already in use throughout [VERIFIED: codebase] |

### No new dependencies required

All work in this phase uses the existing stack. The Supabase RPC function is written in SQL and created via migration (or manual SQL editor per project preference).

---

## Architecture Patterns

### Recommended Project Structure

No new directories. Changes are within existing structure:
```
src/
├── components/sessions/        # capacity display on session cards
│   ├── RsvpSessionButton.tsx   # update toast message for race result (D-06)
│   └── SessionCard.tsx         # new shared card component (or enhance existing)
├── components/dashboard/
│   └── ClientDashboard.tsx     # Today/This Week section split (D-11)
├── components/calendar/
│   └── WeekCalendarGrid.tsx    # frozen pane sticky CSS (D-12)
├── components/nav/
│   └── AppNav.tsx              # Dialog wrap logout button (D-10)
├── components/profile/
│   └── ProfileSetupWizard.tsx  # cancel button (D-09)
├── lib/actions/
│   └── rsvps.ts                # replace non-atomic logic with RPC call (D-05)
└── __tests__/
    └── rls/                    # new — RLS audit test suite (D-07)
supabase/migrations/
└── 00007_atomic_rsvp_rpc.sql   # new — atomic_rsvp() Postgres function
```

### Pattern 1: Atomic RSVP via Postgres RPC (D-05)

**What:** Replace the multi-round-trip RSVP logic in `rsvpSession()` with a single `supabase.rpc('atomic_rsvp', { ... })` call. The Postgres function acquires a row-level lock on the session row, checks capacity, and inserts confirmed or waitlisted in one transaction.

**When to use:** Any mutation that reads-then-writes with a correctness dependency (capacity enforcement).

**Postgres function skeleton (migration 00007):**

```sql
-- Source: Supabase docs — RPC + FOR UPDATE pattern [ASSUMED pattern; Postgres FOR UPDATE is standard SQL]
create or replace function public.atomic_rsvp(
  p_session_id uuid,
  p_member_id  uuid,
  p_community_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_capacity      int;
  v_confirmed     int;
  v_waitlisted    int;
  v_rsvp_type     text;
  v_position      int;
  v_existing_id   uuid;
begin
  -- Acquire row lock on the session to serialize concurrent RSVPs
  select capacity into v_capacity
  from public.sessions
  where id = p_session_id
    and cancelled_at is null
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Session not found or cancelled');
  end if;

  -- Count current confirmed (non-cancelled)
  select count(*) into v_confirmed
  from public.session_rsvps
  where session_id = p_session_id
    and rsvp_type  = 'confirmed'
    and cancelled_at is null;

  if v_confirmed < v_capacity then
    v_rsvp_type := 'confirmed';
    v_position  := null;
  else
    select count(*) into v_waitlisted
    from public.session_rsvps
    where session_id = p_session_id
      and rsvp_type  = 'waitlisted'
      and cancelled_at is null;

    v_rsvp_type := 'waitlisted';
    v_position  := v_waitlisted + 1;
  end if;

  -- Upsert: reactivate cancelled record or insert new
  select id into v_existing_id
  from public.session_rsvps
  where session_id = p_session_id
    and member_id  = p_member_id
    and cancelled_at is not null
  limit 1;

  if v_existing_id is not null then
    update public.session_rsvps
    set rsvp_type = v_rsvp_type,
        waitlist_position = v_position,
        cancelled_at = null
    where id = v_existing_id;
  else
    insert into public.session_rsvps
      (session_id, member_id, community_id, rsvp_type, waitlist_position)
    values
      (p_session_id, p_member_id, p_community_id, v_rsvp_type, v_position);
  end if;

  return jsonb_build_object(
    'success',           true,
    'rsvp_type',         v_rsvp_type,
    'waitlist_position', v_position
  );
end;
$$;
```

**Caller side (rsvps.ts):**

```typescript
// Replace the read-then-write block with a single RPC call
const { data: rpcResult, error: rpcError } = await supabase.rpc('atomic_rsvp', {
  p_session_id:   sessionId,
  p_member_id:    member.id,
  p_community_id: communityId,
})
if (rpcError || !rpcResult?.success) {
  return { success: false, error: rpcResult?.error ?? rpcError?.message ?? 'RSVP failed' }
}
const rsvpType = rpcResult.rsvp_type as 'confirmed' | 'waitlisted'
const waitlistPosition = rpcResult.waitlist_position ?? undefined
```

**Toast update for race result (D-06):**
The existing toast in `RsvpSessionButton` already handles the `waitlisted` type. The message should match the spec: "Session just filled — you're #1 on the waitlist". Update the copy in `RsvpSessionButton.tsx`.

### Pattern 2: Capacity Color-Coding (D-01)

**What:** Fraction display "4/8 spots" with fill-level color.

**Color mapping (AceHub palette):**
```typescript
// [ASSUMED: color tokens from DESIGN-REF.md]
function capacityColor(confirmed: number, capacity: number): string {
  if (confirmed >= capacity) return 'text-red-500'          // full
  if (confirmed / capacity >= 0.75) return 'text-orange-500' // >= 75%
  return 'text-primary'                                       // green — open
}
```

The `--primary` token in AceHub is HSL 152 65% 42% (green). Orange 500 maps to the Roland Garros orange direction. Red 500 is appropriate since this is capacity status, not a cancel action — no conflict with the "no red for cancel" rule.

**Surfaces that need updating:**
1. `ClientDashboard.tsx` — "Upcoming Sessions" session cards (currently no capacity display)
2. `SessionDetailPanel.tsx` — detail view (verify capacity is shown)
3. `WeekCalendarGrid.tsx` — day view session cards (already shows `confirmedCount/capacity` in small text at top-right; needs color-coding and D-01 format)
4. Coach session list views

**Data flow:** The `UpcomingSession` type in `ClientDashboard` already carries `capacity: number | null`. The confirmed count is NOT currently passed. The sessions page query needs to also fetch RSVP confirmed counts for the displayed sessions.

### Pattern 3: Waitlist Inline Display (D-02)

**What:** On the session card, show "Waitlisted — #3 in line" where the RSVP button normally appears.

**Data requirement:** The `rsvp_type` and `waitlist_position` must be available on the card. Currently `UpcomingSession` has `rsvp_type` but NOT `waitlist_position`. Add `waitlist_position: number | null` to `UpcomingSession`.

**Conditional render (in `ClientDashboard` session card):**
```tsx
{session.rsvp_type === 'waitlisted' ? (
  <span className="text-[10px] font-bold text-orange-500 px-2.5 py-1 rounded-full bg-orange-500/10">
    Waitlisted — #{session.waitlist_position ?? '?'} in line
  </span>
) : (
  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
    Going
  </span>
)}
```

### Pattern 4: Today / This Week Grouping (D-11)

**What:** Split the "Upcoming Sessions" list in `ClientDashboard` into "Today" (sessions today) and "This Week" (rest of current week, beyond today).

**Implementation:** Filter `upcomingSessions` array by `scheduled_at` date in Sydney timezone.

```typescript
// [ASSUMED: timezone handling pattern from MEMORY.md — Australia/Sydney]
function isToday(isoString: string): boolean {
  const sydneyDate = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(isoString))
  const todaySydney = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  return sydneyDate === todaySydney
}
```

Only "Today" and "This Week" sections appear. Sessions beyond this week still appear as "This Week" rather than adding a third group — keep it simple for MVP.

### Pattern 5: Calendar Frozen Panes (D-12)

**What:** The header row (day names) sticks to the top of the scroll container; the time column sticks to the left.

**Current state:** The `WeekCalendarGrid` already has `position: sticky; top: 0; z-index: 10` on the header cells (lines 586–606 of the component). The time label cells use `gridColumn: 1` but are NOT sticky.

**Gap to fix:** The time column cells need `position: sticky; left: 0; z-index: 8` (below header row z-index). The outer `div.overflow-x-auto` must NOT have `overflow: hidden` or it will trap `position: sticky` children.

```tsx
// Time label cell — add sticky left
<div
  key={`time-${rowIdx}`}
  className="border-b border-r border-border flex items-start pt-1 pr-2 justify-end bg-background sticky left-0 z-[8]"
  style={{ gridColumn: 1, gridRow: rowIdx + 2 }}
>
```

The header corner cell (gridColumn: 1, gridRow: 1) needs both `sticky top-0 z-20 left-0` to anchor the corner.

**Constraint:** `position: sticky` inside CSS Grid works in all modern browsers. The outer scroll container is `overflow-x-auto` on a `min-w-[640px]` grid — this is compatible with sticky. [ASSUMED: browser compatibility; sticky in overflow-x:auto containers is a known limitation in some older browsers but all modern targets support it]

### Pattern 6: Logout Dialog (D-10)

**What:** Wrap the `handleLogout` call in `AppNav` with the existing `Dialog` component from `src/components/ui/dialog.tsx` (base-ui/react).

**Current state:** `handleLogout()` is called directly from `onClick` on the logout button (line 156–160 of `AppNav.tsx`). No confirmation.

**Implementation:** The existing Dialog component from `@base-ui/react/dialog` is already wired up. Add state `showLogoutDialog` and render a `Dialog` with a confirm/cancel pair. The confirm button uses Roland Garros orange (not red) per project conventions. The cancel button is muted/secondary.

### Pattern 7: Profile Edit Cancel Button (D-09)

**What:** Add a cancel button to the profile edit flow so users can exit without completing the setup wizard loop.

**Current state:** `ProfileView` shows a Settings gear icon that links to `/profile/setup` (line 82–88 of `ProfileView.tsx`). The `ProfileSetupWizard` at `/profile/setup/page.tsx` is the edit surface. There is no "Cancel" / "Back to profile" escape without completing the wizard.

**Implementation:** Add a "Cancel" link/button at the top of `ProfileSetupWizard` that navigates back to `/profile`. This is a simple `<Link href="/profile">` with secondary button styling.

### Pattern 8: RLS Audit Tests (D-07)

**Recommended approach (Claude's Discretion):** Vitest + Supabase JavaScript client with two test users (member from community A, member from community B). Tests verify cross-community isolation by asserting that a community B token cannot read community A data.

**Why not raw SQL tests:** The project uses vitest already; SQL-only tests require `pgTAP` setup or separate tooling. A vitest suite using the JS client is simpler to add to the existing CI flow and closer to how the real app queries data.

**Test structure:**

```
src/__tests__/rls/
├── rls-audit.test.ts       # table-by-table RLS coverage check
└── fixtures/
    └── rls-test-users.ts   # helper: create two test community users
```

**What to test per table:**
1. Member from community A cannot SELECT rows from community B
2. Member from community A cannot INSERT rows with community_id = B
3. Unauthenticated request returns 0 rows or error

**Tables covered (from migrations):**
- `communities`, `community_members`, `invite_links` (migration 00001)
- `session_templates`, `sessions`, `session_rsvps`, `session_coaches` (migration 00002)
- `session_invitations` (migration 00003)
- `player_profiles`, `coach_assessments`, `progress_notes` (migration 00004)
- `events`, `event_rsvps`, `announcements` (migration 00005)
- `notifications` (migration 00006)

**Key finding:** All 16 tables in migrations have `ENABLE ROW LEVEL SECURITY` confirmed. [VERIFIED: supabase/migrations/*.sql grep]. The audit tests are a regression guard, not gap-filling. However, the policies must be verified for correct `community_id` scoping — RLS enabled without proper policies is still a risk.

**Vitest environment for RLS tests:** Must use `// @vitest-environment node` (same as existing action tests). Cannot run against live Supabase from jsdom — needs Node environment for network calls. Since the project pushes schema manually (no local Docker Supabase), these tests will need `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to create test users, and `SUPABASE_ANON_KEY` for the tenant-restricted queries.

**Pragmatic alternative (lighter weight):** A static audit test that reads the migration SQL files and asserts every `CREATE TABLE` statement has a corresponding `ENABLE ROW LEVEL SECURITY` and at least one `CREATE POLICY`. This runs fully offline, catches regressions without live DB, and is deterministic.

**Recommendation:** Ship the static SQL-parse audit as a fast offline test PLUS one integration smoke test per table type (session, profile, event) using the real Supabase test project. Flag the integration tests with `// @skip-in-ci` until the test-user provisioning is documented.

### Pattern 9: Timezone Display (D-04)

**What:** Show "AEST"/"AEDT" suffix only when the user's browser timezone differs from `Australia/Sydney`.

**Detection:**

```typescript
function getTimezoneLabel(): string | null {
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (userTz === 'Australia/Sydney') return null
  // Return the Sydney timezone abbreviation
  const abbr = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    timeZoneName: 'short',
  }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? null
  return abbr
}
```

**Where used:** Session card time display, calendar event tooltips. This is client-side only (browser Intl API). Must be in a `'use client'` component or inside a `useEffect` to avoid hydration mismatch.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrent RSVP correctness | Custom optimistic-lock in JS | Postgres `FOR UPDATE` via RPC | JS-level locking doesn't work across server instances; only DB-level locks are atomic |
| Dialog confirmation | Custom modal state/backdrop | `@base-ui/react/dialog` (already installed) | Accessibility, keyboard/escape handling already solved |
| Toast notifications | Custom toast UI | `sonner` (already installed and wired) | Already in use in `RsvpSessionButton` |
| Sticky calendar panes | JS scroll event listeners | CSS `position: sticky` | Native browser feature, zero JS overhead |
| Timezone detection | Custom offset arithmetic | `Intl.DateTimeFormat().resolvedOptions()` | Built into every modern browser; IANA timezone names are authoritative |

**Key insight:** Every "hand-roll" temptation in this phase has a zero-dependency solution already in the project.

---

## Common Pitfalls

### Pitfall 1: sticky + overflow:auto containment

**What goes wrong:** `position: sticky` stops working if any ancestor has `overflow: hidden`, `overflow: auto`, or `overflow: scroll` in the same axis.

**Why it happens:** The scroll container intercepts the sticky context. The `WeekCalendarGrid` has `overflow-x-auto` on the outer wrapper. Sticky `left: 0` on the time column and sticky `top: 0` on the header work because `overflow-x: auto` does not clip `overflow-y`, and the header sticks in the vertical axis.

**How to avoid:** Keep `overflow-x: auto` on the grid wrapper (needed for horizontal scroll on small screens). Do NOT add `overflow-y: auto` to the same element — that would break vertical stickiness of the header. The time column uses `sticky left-0`, which works inside an `overflow-x: auto` container for horizontal scroll scenarios.

**Warning signs:** Header row or time column scrolls away during scroll testing.

### Pitfall 2: FOR UPDATE in Supabase RPC — security definer required

**What goes wrong:** The `atomic_rsvp` RPC function must use `SECURITY DEFINER` to run with sufficient privileges to acquire `FOR UPDATE` locks, since the anon/authenticated role may not have explicit lock privileges.

**How to avoid:** Always use `security definer` on Supabase RPC functions that perform row-level locks. Set `search_path = public` to prevent search-path injection. [ASSUMED: Supabase security definer pattern — standard guidance, not verified in current docs this session]

### Pitfall 3: Hydration mismatch on timezone-conditional render

**What goes wrong:** Server renders time without suffix; client detects different timezone and renders with suffix. React 19 hydration mismatch error.

**How to avoid:** Timezone detection must happen exclusively on the client. Use `useState` + `useEffect` to apply the suffix after mount, OR use `suppressHydrationWarning` on the time element. The safest pattern:

```tsx
const [tzLabel, setTzLabel] = useState<string | null>(null)
useEffect(() => { setTzLabel(getTimezoneLabel()) }, [])
// render: {time} {tzLabel && <span>{tzLabel}</span>}
```

### Pitfall 4: RLS audit tests creating test pollution

**What goes wrong:** Integration RLS tests create `auth.users` records and community data that linger in the test project after a failed run.

**How to avoid:** Use a dedicated test community with a fixed UUID. Wrap test setup/teardown in `beforeAll`/`afterAll` with cleanup using the service role client. Or use the static SQL audit approach (no DB writes required).

### Pitfall 5: Capacity count query on dashboard misses real-time state

**What goes wrong:** The sessions page loads confirmed counts at server-render time. By the time the user sees the card, the count may be stale.

**How to avoid:** For the MVP, server-rendered count is acceptable — capacity display is informational. Add `export const dynamic = 'force-dynamic'` (already on `sessions/page.tsx`) so the count reflects the state at page load time. Do not add a Supabase Realtime subscription for capacity — out of scope for Phase 6.

### Pitfall 6: waitlist_position not in UpcomingSession type

**What goes wrong:** `ClientDashboard` passes sessions to the card but `waitlist_position` is not in the `UpcomingSession` interface. TypeScript will not catch the missing field if the query returns it but the type doesn't declare it.

**How to avoid:** Update the `UpcomingSession` interface to include `waitlist_position: number | null`. Update the sessions page query to include `waitlist_position` in the `session_rsvps` select. Update the map that builds `upcomingSessions`.

---

## Code Examples

### Capacity display with color

```tsx
// Source: DESIGN-REF.md palette + project convention [VERIFIED: codebase]
function CapacityBadge({ confirmed, capacity }: { confirmed: number; capacity: number }) {
  const isFull = confirmed >= capacity
  const isAlmostFull = !isFull && confirmed / capacity >= 0.75
  const colorClass = isFull
    ? 'text-red-500 bg-red-500/10'
    : isAlmostFull
    ? 'text-orange-500 bg-orange-500/10'
    : 'text-primary bg-primary/10'

  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${colorClass}`}>
      {confirmed}/{capacity} spots
    </span>
  )
}
```

### Logout Dialog

```tsx
// Source: src/components/ui/dialog.tsx — existing base-ui/react Dialog [VERIFIED: codebase]
// Roland Garros orange for confirm — matches project convention (no red for actions)
const [showLogout, setShowLogout] = useState(false)

<Dialog open={showLogout} onOpenChange={setShowLogout}>
  <DialogTrigger asChild>
    <button ... onClick={() => setShowLogout(true)}>
      <LogOut className="w-4 h-4 text-muted-foreground" />
    </button>
  </DialogTrigger>
  <DialogContent>
    <DialogTitle>Log out?</DialogTitle>
    <DialogDescription>You'll be returned to the sign-in screen.</DialogDescription>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button
        onClick={handleLogout}
        className="bg-orange-500 hover:bg-orange-600 text-white"
      >
        Log out
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Note: `AppNav` is a client component — Dialog state works without any additional directives.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sequential read-then-write RSVP | Atomic RPC with `FOR UPDATE` | Phase 6 | Eliminates double-booking under concurrent load |
| Flat "Upcoming Sessions" list | Today / This Week sectioned list | Phase 6 | Clearer time orientation for users |
| Raw onClick logout | Dialog confirmation | Phase 6 | Consistent with project "no browser dialogs" rule |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `SECURITY DEFINER` required for `FOR UPDATE` in Supabase RPC | Pattern 1 | RPC may fail with permission error; fallback: grant LOCK TABLE to authenticated role or restructure as trigger |
| A2 | CSS `sticky left-0` works inside `overflow-x: auto` container for the time column | Pattern 5 / Pitfall 1 | Time column scrolls with content; fallback: duplicate time column with absolute positioning |
| A3 | Orange 500 Tailwind class matches Roland Garros orange intent from MEMORY.md | Pattern 2 (capacity) | Wrong visual tone; check DESIGN-REF.md `--secondary` token (HSL 45 100% 58%) instead |
| A4 | Integration RLS tests need service role key to provision test users | Pattern 8 | If test project doesn't have service role exposed, use static SQL audit only |
| A5 | `ProfileSetupWizard` is the only edit surface (not a separate `/profile/edit` route) | Pattern 7 | If there's an inline edit mode in `ProfileView`, cancel must be added there instead |

---

## Open Questions

1. **Where exactly does capacity data come from for session cards on the client dashboard?**
   - What we know: `upcomingSessions` in `ClientDashboard` includes `capacity: number | null` but NOT `confirmedCount`. The sessions page fetches RSVPs but doesn't count confirmed per session.
   - What's unclear: Is there an existing query to augment with confirmed counts, or does a new query need to join `session_rsvps`?
   - Recommendation: Add a batch confirmed-count query in `sessions/page.tsx` keyed by session_id, similar to how `eventRsvpCountMap` is built for events (lines 195–199 of `sessions/page.tsx`). This is already a proven pattern in the codebase.

2. **Does `ProfileSetupWizard` have multi-step internal state that makes a simple cancel non-trivial?**
   - What we know: The file exists at `src/components/profile/ProfileSetupWizard.tsx` but was not read in full.
   - What's unclear: Whether cancel from mid-wizard needs to reset state or simply navigate away.
   - Recommendation: Read before implementing; if multi-step, `router.push('/profile')` from any step is sufficient since the wizard is re-entrant.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 6 is code/config changes with no new external dependencies. All tools already verified in prior phases.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| Capacity count displays correctly on session cards | unit | `npx vitest run src/__tests__/capacity-display.test.ts` | No — Wave 0 |
| Waitlist position shows inline on card | unit | `npx vitest run src/__tests__/waitlist-display.test.ts` | No — Wave 0 |
| Today/This Week grouping splits correctly | unit | `npx vitest run src/__tests__/session-grouping.test.ts` | No — Wave 0 |
| RLS: all tables have RLS enabled | static audit | `npx vitest run src/__tests__/rls/rls-audit.test.ts` | No — Wave 0 |
| Atomic RSVP RPC returns correct rsvp_type | unit (mock RPC) | `npx vitest run src/__tests__/actions/rsvps.test.ts` | Yes (stubs only) |
| Timezone suffix shown only for non-Sydney browsers | unit | `npx vitest run src/__tests__/timezone-label.test.ts` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/capacity-display.test.ts` — unit tests for `CapacityBadge` color logic
- [ ] `src/__tests__/waitlist-display.test.ts` — unit tests for waitlist inline rendering
- [ ] `src/__tests__/session-grouping.test.ts` — unit tests for Today/This Week split logic
- [ ] `src/__tests__/rls/rls-audit.test.ts` — static SQL audit of migration files
- [ ] `src/__tests__/timezone-label.test.ts` — unit tests for `getTimezoneLabel()`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Already implemented Phase 1 |
| V3 Session Management | no | Supabase JWT, Phase 1 |
| V4 Access Control | **yes** | RLS policies (D-07/D-08) — community-scoping verification |
| V5 Input Validation | partial | RPC inputs validated server-side via Postgres constraints |
| V6 Cryptography | no | No new crypto in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-community data access | Information disclosure | RLS policies with `community_id = jwt.community_id` check [VERIFIED: migration policies] |
| Double-booking RSVP | Tampering | `FOR UPDATE` row lock in `atomic_rsvp` RPC |
| RLS bypass via missing policy | Elevation of privilege | Static SQL audit test asserts every table has policies |
| RSVP to another user's member record | Tampering | `p_member_id` resolved server-side from authenticated user, not passed by client |

**Critical note on atomic_rsvp RPC:** The caller (`rsvps.ts`) must resolve `p_member_id` from `supabase.auth.getUser()` server-side — never trust a member_id passed from the client. The current `rsvpSession` action already follows this pattern (lines 21–26 of `rsvps.ts`). The RPC refactor must preserve this. [VERIFIED: existing rsvps.ts]

---

## Sources

### Primary (HIGH confidence)
- Codebase grep: all migration files — confirmed RLS enabled on all 16 tables [VERIFIED]
- `src/components/sessions/RsvpSessionButton.tsx` — existing toast pattern [VERIFIED]
- `src/components/calendar/WeekCalendarGrid.tsx` — existing sticky header, CSS Grid layout [VERIFIED]
- `src/components/nav/AppNav.tsx` — logout button location, handleLogout function [VERIFIED]
- `src/components/ui/dialog.tsx` — @base-ui/react Dialog already available [VERIFIED]
- `src/lib/actions/rsvps.ts` — TOCTOU race confirmed (read-then-write without lock) [VERIFIED]
- `vitest.config.ts` + `package.json` — vitest 4.1.2 installed, node environment tests exist [VERIFIED]
- `.planning/DESIGN-REF.md` — AceHub color tokens [VERIFIED]
- `MEMORY.md` — Sydney timezone pattern, no browser dialogs, Roland Garros orange [VERIFIED]

### Secondary (MEDIUM confidence)
- Postgres `FOR UPDATE` in functions: standard SQL, well-documented behavior [ASSUMED - training]
- CSS `sticky left-0` in `overflow-x: auto`: known browser behavior, works in all modern browsers [ASSUMED - training]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase
- Architecture: HIGH — patterns derived directly from existing code
- Pitfalls: MEDIUM — some CSS sticky edge cases assumed from training knowledge
- RLS audit: HIGH — migration files verified for coverage, policies reviewed for pattern

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable stack, no fast-moving dependencies)
