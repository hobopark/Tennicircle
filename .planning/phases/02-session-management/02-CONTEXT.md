# Phase 2: Session Management - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Coaches can schedule recurring sessions and clients can RSVP, replacing the spreadsheet workflow. Includes session templates with weekly recurrence, individual session instances, RSVP with capacity enforcement, waitlist with manual coach promotion, and session editing (single instance or future series). This phase delivers the core product loop.

</domain>

<decisions>
## Implementation Decisions

### Session creation
- **D-01:** Simple single-page form for creating session templates — day of week, time, venue, capacity, coach range (start/end dates)
- **D-02:** Weekly recurrence only — no biweekly/monthly/custom. Pick a day + time, repeats every week
- **D-03:** Coach sets the date range (start date + end date or number of weeks) when creating the template — sessions auto-generated within that range
- **D-04:** Venue/court is a free text field with autocomplete suggestions from previously used venues in the community
- **D-05:** Court number is editable anytime before the session — coaches update court assignments on the day of the lesson

### Schedule & calendar view
- **D-06:** Coaches see a weekly calendar grid (time slots on Y-axis, days on X-axis) showing all their sessions
- **D-07:** Clients see card-based upcoming sessions — no calendar, just action-oriented cards with RSVP buttons
- **D-08:** Clients only see sessions from their assigned coach(es) — scoped by coach_id on community_members
- **D-09:** Session cards show: date, time, venue, coach name, spots remaining, and a preview of who else is attending (names/avatars)

### RSVP & waitlist
- **D-10:** One-tap RSVP with a brief confirmation dialog ("Join Tuesday 6pm at Moore Park?") before committing
- **D-11:** When session is full, RSVP button changes to "Join Waitlist" — client sees their position (e.g. "3rd on waitlist")
- **D-12:** Cancellation is unrestricted — client can cancel anytime. A courtesy prompt reminds the client to discuss cancellations with their coach (informational, not blocking), since most clients are regulars with recurring bookings
- **D-13:** Manual waitlist promotion only — coach decides who gets a freed spot. No auto-promotion. Aligns with PROJECT.md decision

### Session detail & editing
- **D-14:** When editing a recurring session instance, coach is asked: "This session only" or "This and all future sessions" (Google Calendar style)
- **D-15:** Coach session detail page shows: confirmed attendee list, waitlist with promote/remove actions, and an edit button for session details (time, venue, capacity)
- **D-16:** Template creator can add co-coaches from the community when creating or editing a template. Co-coaches see the session on their schedule
- **D-17:** Coaches can cancel a session instance with a required reason (e.g. "Rain", "Public holiday"). Cancelled sessions display the reason on the card rather than disappearing

### Claude's Discretion
- Loading states and skeleton designs for calendar and session cards
- Exact calendar grid component implementation (build custom or use a library)
- Session card layout and spacing details
- Waitlist position display format
- Attendee avatar/name preview implementation on cards
- Empty state design for coaches with no sessions and clients with no available sessions
- Form validation timing and error display patterns (follow Phase 1 patterns with Zod 4 + useActionState)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Core value, constraints, key decisions (manual waitlist promotion, client-side auth)
- `.planning/REQUIREMENTS.md` — SESS-01 through SESS-09 acceptance criteria
- `.planning/ROADMAP.md` — Phase 2 success criteria and dependencies

### Phase 1 foundation (must read for patterns)
- `src/lib/types/auth.ts` — UserRole, CommunityMember types, ROLE_HOME_ROUTES (client route updates to /sessions in Phase 2), ROLE_ALLOWED_ROUTES
- `src/lib/supabase/server.ts` — Server Supabase client pattern
- `src/lib/supabase/client.ts` — Browser Supabase client pattern
- `src/lib/actions/invites.ts` — Server action pattern with auth checks and error handling
- `src/proxy.ts` — Next.js 16 proxy (middleware replacement), role enforcement
- `src/components/ui/` — shadcn components available: button, input, label, tabs, sonner

### Codebase analysis
- `.planning/codebase/STACK.md` — Supabase SDK versions, Next.js 16
- `.planning/codebase/CONVENTIONS.md` — Naming, import, and component patterns
- `.planning/codebase/ARCHITECTURE.md` — App structure and entry points

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/button.tsx` — shadcn Button for RSVP/cancel actions
- `src/components/ui/input.tsx` — shadcn Input for session form fields
- `src/components/ui/label.tsx` — shadcn Label for form labels
- `src/components/ui/sonner.tsx` — Toast notifications for RSVP confirmations
- `src/lib/utils.ts` — cn() utility for Tailwind class merging
- `src/lib/validations/auth.ts` — Zod 4 validation pattern to replicate for session forms

### Established Patterns
- Server actions in `src/lib/actions/` — auth-checked, typed returns with `{ success, data?, error? }`
- Supabase server client for DB operations via `createClient()` from `@/lib/supabase/server`
- `useActionState` for form handling with inline field errors
- Role-based access control via `user.app_metadata.user_role` and `user.app_metadata.community_id`
- Next.js 16 proxy (`src/proxy.ts`) handles route protection — not middleware.ts

### Integration Points
- `ROLE_HOME_ROUTES` in `src/lib/types/auth.ts` — client route needs updating from `/welcome` to `/sessions`
- `ROLE_ALLOWED_ROUTES` — needs `/sessions` added for client role, coach schedule routes for coach role
- `src/proxy.ts` — new routes need protection rules
- Navigation component `src/components/nav/AppNav.tsx` — needs session-related nav items
- Supabase database — new tables needed: session_templates, sessions, session_rsvps, session_coaches

</code_context>

<specifics>
## Specific Ideas

- Court number should be easily updatable on the day — coaches often don't know which court until they arrive
- Cancellation prompt should feel like a gentle reminder ("Have you let your coach know?"), not a blocker — these are relationship-based regular bookings
- Google Calendar-style "Edit this or all future" pattern for recurring session edits — familiar mental model

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-session-management*
*Context gathered: 2026-04-07*
