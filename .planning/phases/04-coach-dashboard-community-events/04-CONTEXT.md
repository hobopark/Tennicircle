# Phase 4: Coach Dashboard & Community Events - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Coaches get an enhanced dashboard with daily/weekly schedule toggle, inline attendance previews, and a player roster with attendance patterns. All community members can create and RSVP to events (tournaments, social events, open sessions). Coach/admin announcements are pinned on the events page. Official and community events are separated into distinct tabs. Clients get a proper action-oriented dashboard replacing the current bare calendar grid.

</domain>

<decisions>
## Implementation Decisions

### Coach dashboard enhancements
- **D-01:** Add daily/weekly view toggle to the existing coach schedule page. Day view shows detailed time blocks with attendee counts and quick access to session details.
- **D-02:** Player roster (DASH-03) at `/coach/clients` shows each player with: last attended date and first lesson date. Simple, practical info that replaces spreadsheet lookup.
- **D-03:** Today's sessions on the coach dashboard show inline attendance preview: confirmed/capacity count and first few attendee names/avatars directly on the card. Tap for full session detail.

### Event creation flow
- **D-04:** Single "Create Event" button with type selector as first step. Form adapts fields based on selected type (Tournament, Social Event, Open Session). One flow to learn.
- **D-05:** Any community member can create events — tournaments, social events, and open sessions. Community-driven, matching ROADMAP success criteria #4.
- **D-06:** Tournament draws via image upload for MVP. Organiser creates bracket externally and uploads a photo/image. Interactive bracket builder deferred to a future phase.

### Event discovery & navigation
- **D-07:** New top-level "Events" nav tab visible to all roles. Separate from coach "Schedule" and client "Sessions" tabs. Clear mental model: sessions = coaching, events = community.
- **D-08:** Events page has two tabs: "Official" (coach/admin events) and "Community" (member-created). Default to Official tab. Satisfies EVNT-06 separation requirement.

### Announcements
- **D-09:** Coach/admin announcements appear as pinned cards at the top of the Official events tab. Coaches post announcements from the same events interface. No separate announcements page needed.

### Event cards
- **D-10:** Event cards show: type badge (Tournament/Social/Open), title, date/time, venue, spots remaining, and RSVP button. Consistent with session card pattern from Phase 2.

### Client dashboard
- **D-11:** Clients land on an action-oriented dashboard (replacing the current bare calendar grid). Dashboard shows: personalised greeting with name, upcoming sessions (next 3-5 as cards with RSVP status), upcoming events (next 3-5), and recent announcements.
- **D-12:** Client greeting includes quick stats: sessions this month, upcoming RSVPs, member since date. Warm and personal.
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` -- Vision, constraints, community-driven model, coaching hierarchy
- `.planning/REQUIREMENTS.md` -- DASH-01 through DASH-03, EVNT-01 through EVNT-06 acceptance criteria
- `.planning/ROADMAP.md` -- Phase 4 success criteria and dependencies

### Phase 2 session patterns (must read for consistency)
- `src/app/coach/page.tsx` -- Existing coach dashboard with WeekCalendarGrid, session query pattern
- `src/components/calendar/WeekCalendarGrid.tsx` -- Calendar grid component to extend with day/week toggle
- `src/components/sessions/SessionDetailPanel.tsx` -- Session detail pattern for event detail pages
- `src/components/sessions/WaitlistPanel.tsx` -- Waitlist pattern reusable for event RSVP
- `src/app/sessions/page.tsx` -- Current client sessions page (being replaced with action-oriented dashboard)

### Phase 3 profile patterns
- `src/app/coach/clients/page.tsx` -- Existing coach clients page to enhance with attendance data
- `src/lib/types/profiles.ts` -- Profile types for player roster display

### Navigation
- `src/components/nav/AppNav.tsx` -- Navigation component, needs "Events" tab added for all roles

### Codebase analysis
- `.planning/codebase/CONVENTIONS.md` -- Naming and component patterns
- `.planning/codebase/ARCHITECTURE.md` -- App structure

No external specs -- requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/calendar/WeekCalendarGrid.tsx` -- Extend for day/week toggle rather than building new
- `src/components/sessions/SessionDetailPanel.tsx` -- Session detail pattern to replicate for event details
- `src/components/sessions/WaitlistPanel.tsx` -- Waitlist/RSVP pattern reusable for events
- `src/components/sessions/CancelRsvpButton.tsx` -- RSVP cancellation pattern
- `src/components/sessions/CreateSessionForm.tsx` -- Form pattern to reference for event creation
- `src/components/sessions/VenueAutocomplete.tsx` -- Venue input reusable for events
- `src/components/ui/*` -- shadcn Button, Input, Label, Tabs, Sonner (toast)
- `src/lib/utils.ts` -- cn() utility
- `src/lib/actions/rsvps.ts` -- RSVP server action pattern to replicate for event RSVPs
- `src/lib/actions/sessions.ts` -- Session CRUD action pattern to reference for events

### Established Patterns
- Server actions in `src/lib/actions/` with `{ success, data?, error? }` return shape
- `useActionState` for form handling with inline field errors
- Supabase server client for DB operations
- Role-based access via `user.app_metadata.user_role` and `user.app_metadata.community_id`
- Next.js 16 proxy (`src/proxy.ts`) for route protection
- Two-query merge strategy for coach sessions (template-owned + co-coached)

### Integration Points
- `AppNav` -- needs "Events" tab added (visible to all roles)
- `ROLE_ALLOWED_ROUTES` in `src/lib/types/auth.ts` -- needs `/events` added for all roles
- `src/proxy.ts` -- needs `/events` route protection
- Client sessions page at `/sessions` -- needs redesign to action-oriented dashboard
- Supabase database -- new tables needed: events, event_rsvps, announcements
- Supabase Storage -- new bucket for tournament draw image uploads

</code_context>

<specifics>
## Specific Ideas

- Client dashboard should feel like a proper home, not just a data dump. The action-oriented layout with greeting + upcoming sessions + events + announcements makes the app feel personal.
- Tournament draw as image upload matches how most club tournaments work today -- organiser draws brackets on paper or in an app, takes a photo. Interactive bracket builder is a future phase goal.
- Announcements as pinned cards on the Official events tab keeps everything in one place -- coaches don't need a separate page to post announcements.
- "Events" nav tab creates a clear mental model: "Sessions" = my coaching sessions, "Events" = community stuff anyone can join.

</specifics>

<deferred>
## Deferred Ideas

- Interactive bracket builder for tournaments -- user wants this eventually but image upload is sufficient for MVP
- Event RSVP details (capacity limits, waitlist for events, cancellation rules) -- left to Claude's discretion, should follow session RSVP patterns
- Event detail page specifics -- left to Claude's discretion
- Open session vs coaching session differentiation -- left to Claude's discretion

</deferred>

---

*Phase: 04-coach-dashboard-community-events*
*Context gathered: 2026-04-08*
