# Phase 6: Polish & Launch Readiness - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the platform stable, correct at the edges, and trustworthy enough to hand to Jaden's community. Cross-cutting polish — no new features. Addresses UX gaps, race conditions, security audit, and specific UI fixes across all existing phases.

</domain>

<decisions>
## Implementation Decisions

### Capacity & waitlist display
- **D-01:** Session cards show spots in fraction format: "4/8 spots". Color-coded by fill level — green (open), orange (>=75% full), red (full/waitlist)
- **D-02:** Waitlisted clients see their position inline on the session card: "Waitlisted — #3 in line" where the RSVP button normally appears. No need to tap into session detail

### Calendar defaults & timezone
- **D-03:** Calendar view is user's choice — no auto-switching by breakpoint. User picks week or day view on first visit, preference persists in localStorage. Both options available on all screen sizes
- **D-04:** All times displayed in Australia/Sydney timezone implicitly. Timezone suffix ("AEST"/"AEDT") only shown when the user's browser timezone differs from Australia/Sydney. Clean for the 99% Sydney community case

### Race condition handling
- **D-05:** Concurrent RSVP protection via Supabase RPC function with row-level lock (Postgres FOR UPDATE). Function atomically checks capacity, inserts RSVP or waitlist entry in a single round-trip
- **D-06:** When a user loses the RSVP race, they are auto-waitlisted silently. Toast notification: "Session just filled — you're #1 on the waitlist". No extra user action needed

### RLS audit
- **D-07:** Automated RLS test suite that verifies every table has row-level security enabled with correct community-scoping policies. Tests run as part of the build for ongoing regression prevention
- **D-08:** Any table without proper RLS is a launch blocker. All gaps must be fixed before shipping — security is non-negotiable

### UI fixes
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design direction
- `.planning/DESIGN-REF.md` — AceHub color tokens, fonts, card patterns, component styles. All UI changes must align

### Session & RSVP patterns
- `.planning/phases/02-session-management/02-CONTEXT.md` — Session card design (D-09), waitlist display (D-11), RSVP flow (D-10), calendar views (D-06, D-07)

### Profile patterns
- `.planning/phases/03-player-profiles/03-CONTEXT.md` — Profile setup wizard flow (D-01), profile content decisions

### Notification patterns
- `.planning/phases/05-notifications/05-CONTEXT.md` — Bell icon + notification feed (D-01), Supabase Realtime delivery (D-02)

### Security & auth
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — RLS foundation, multi-tenant data isolation, proxy.ts auth pattern

### Codebase state
- `.planning/codebase/CONCERNS.md` — Known security issues, architectural gaps

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/dialog.tsx` — Dialog component for logout confirmation (D-10)
- `src/components/ui/badge.tsx` — Badge component for waitlist status display
- `src/components/ui/skeleton.tsx` — Skeleton loader for any new loading states
- `src/components/ui/sonner.tsx` — Toast notification component for race condition feedback (D-06)
- `src/components/sessions/` — Existing session card components to enhance with capacity display
- `src/components/calendar/` — Existing calendar grid to add frozen panes and view toggle

### Established Patterns
- Sydney timezone via `Intl.DateTimeFormat` with `timeZone: 'Australia/Sydney'` — use for all time display
- Roland Garros orange for cancel/destructive actions instead of red
- `data-active` attribute (not `data-[state=active]`) for active states
- Server actions for mutations, Supabase RPC for database functions

### Integration Points
- Session cards across `/sessions`, `/coach/sessions`, client dashboard — all need capacity display updates
- Calendar at `/sessions/calendar` — needs frozen panes and view persistence
- Profile edit at `/profile` — needs cancel button
- Logout button (currently fixed top-right on all pages) — needs Dialog wrapper
- Supabase RPC layer — new atomic RSVP function

</code_context>

<specifics>
## Specific Ideas

- Calendar frozen panes: date header row sticks to top, time column sticks to left during scroll — spreadsheet-like behavior for the calendar grid
- Session grouping: "Today" section appears first with today's sessions, "This Week" section below with remaining week sessions — gives clients immediate orientation
- Logout confirmation uses the app's Dialog component, not browser `confirm()` — matches the established "no browser dialogs" pattern

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-polish-launch-readiness*
*Context gathered: 2026-04-09*
