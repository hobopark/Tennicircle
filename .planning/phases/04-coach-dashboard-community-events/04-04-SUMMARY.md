---
phase: 04-coach-dashboard-community-events
plan: "04"
subsystem: events-pages-client-dashboard-nav
tags: [events, dashboard, navigation, client, rsvp, calendar]
dependency_graph:
  requires: ["04-02", "04-03"]
  provides: ["events-page", "event-detail-page", "client-dashboard", "sessions-calendar", "bottom-nav"]
  affects: ["all-roles-nav", "route-protection"]
tech_stack:
  added: []
  patterns:
    - "Server Component with EventsPageClient client wrapper for tab interactivity"
    - "ClientDashboard client component with framer-motion stagger animations"
    - "Bottom fixed tab nav with usePathname active state"
    - "Bulk RSVP fetch + JS grouping instead of per-row aggregation"
key_files:
  created:
    - src/app/events/page.tsx
    - src/app/events/loading.tsx
    - src/app/events/[eventId]/page.tsx
    - src/app/events/[eventId]/loading.tsx
    - src/app/sessions/loading.tsx
    - src/app/sessions/calendar/page.tsx
    - src/components/events/EventsPageClient.tsx
    - src/components/dashboard/ClientDashboard.tsx
  modified:
    - src/lib/types/auth.ts
    - src/lib/supabase/middleware.ts
    - src/app/sessions/page.tsx
    - src/components/nav/AppNav.tsx
decisions:
  - "EventsPageClient wraps Official/Community Tabs as client component while events/page.tsx stays server-rendered for data fetching"
  - "RSVP counts computed via bulk fetch + JS Map instead of Supabase grouped count (avoids SDK limitations)"
  - "Sessions page fully replaced — old bare WeekCalendarGrid moved to /sessions/calendar as secondary view per D-13"
  - "/events route added to all three roles in both auth.ts ROLE_ALLOWED_ROUTES and middleware.ts roleRoutes"
metrics:
  duration_minutes: 35
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_changed: 12
---

# Phase 04 Plan 04: Events Pages, Client Dashboard & Bottom Nav Summary

Events page with Official/Community tabs, event detail with RSVP support, client dashboard replacing bare calendar, calendar secondary view at /sessions/calendar, and AppNav converted to bottom tab bar.

## What Was Built

### Task 1: Events page, event detail page, route configuration

**Route protection:** Added `/events` to `ROLE_ALLOWED_ROUTES` in `auth.ts` and `roleRoutes` in `middleware.ts` for all three roles (admin, coach, client).

**`/events` page** (server component + `EventsPageClient` client wrapper):
- Fetches events, user RSVPs, confirmed RSVP counts, and announcements server-side
- `EventsPageClient` renders shadcn `Tabs` with Official and Community tabs
- Official tab: pinned Announcements section (with "Post announcement" button for coach/admin), followed by EVENTS section
- Community tab: community-created events
- Mobile FAB (fixed bottom-20 right-5) and desktop header "Create Event" button both open `CreateEventDialog`
- Framer-motion stagger on cards

**`/events/[eventId]` detail page** (server component):
- Header card: event type badge, edit button (creator/admin), title, date/time, venue, organiser
- RSVP card: confirmed count + "GOING" label, spots-left pill, `EventRsvpButton`, attendee list
- Description card (if set): "About" heading + body
- Tournament draw card: shows image full-width or "No draw posted yet" with `DrawImageUpload` for admin/creator

**Loading skeletons:** `/events/loading.tsx` (4 pulse cards), `/events/[eventId]/loading.tsx` (2 pulse cards).

### Task 2: Client dashboard, calendar secondary view, bottom nav

**`/sessions` redesign** (server component → `ClientDashboard` client component):
- Fetches profile for display_name/firstName, upcoming confirmed session RSVPs (with sessions), upcoming events + user RSVPs, sessions-this-month count, latest 2 announcements
- Stats: sessions this month / upcoming RSVPs / member since
- Sections: Upcoming Sessions (→ /sessions/calendar), Upcoming Events (→ /events), Announcements (conditional)
- Empty states for both session and event sections

**`ClientDashboard`** (`'use client'`):
- Renders greeting ("G'day, {firstName}"), heading ("{displayName}'s Dashboard")
- Quick stats strip: `grid grid-cols-3 gap-3`
- Framer-motion stagger (`delay: index * 0.08`) on each section block
- "See all" for sessions links to `/sessions/calendar` (D-13)
- "See all" for events links to `/events`

**`/sessions/calendar`** (server component, D-13 secondary view):
- Back to Dashboard link at top
- "Calendar" heading
- Reuses `WeekCalendarGrid` with same data-fetching pattern as the old `/sessions` page

**`/sessions/loading.tsx`:** Stats skeleton + two section skeletons with pulse rows.

**`AppNav` bottom tab conversion:**
- Removed top nav bar (`w-full bg-popover border-b`) entirely
- New: `fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]`
- Tab row: `flex items-center justify-around px-2 h-16`
- Active tab: `text-primary` with `bg-primary/10 p-1.5 rounded-xl` icon container
- Uses `usePathname()` for active state (startsWith match)
- Tabs: Admin (ShieldCheck/admin), Schedule (CalendarDays/admin+coach), Sessions (Calendar/client+admin), Clients (Users/admin+coach), Events (CalendarDays/all), Profile (User/all)

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1 | `4097375` | auth.ts, middleware.ts, events/page.tsx, events/loading.tsx, events/[eventId]/page.tsx, events/[eventId]/loading.tsx, EventsPageClient.tsx |
| Task 2 | `d1c7968` | sessions/page.tsx, sessions/loading.tsx, sessions/calendar/page.tsx, ClientDashboard.tsx, AppNav.tsx |

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written, with one implementation note:

**RSVP count approach:** The plan suggested trying Supabase grouped counts per event. Since `supabase-js` v2 doesn't support GROUP BY directly, implemented the documented fallback: bulk fetch all RSVPs, compute counts per event_id in JS using a Map. This matches the plan's own "Note: If this grouped count approach doesn't work..." fallback.

## Known Stubs

- `DrawImageUpload` in `/events/[eventId]/page.tsx` passes `onUpload={() => {}}` — the upload itself works (component handles it via Supabase Storage), but the page won't automatically reflect the new image without a router.refresh() call. The existing `DrawImageUpload` component handles uploads internally; a full refresh on upload would require converting the detail page section to a client component or adding a refresh trigger. Not critical for MVP — users can refresh.

## Threat Flags

None — all new surfaces were within the plan's threat model:
- T-04-11: `/events` added to `roleRoutes` in middleware.ts (mitigated)
- T-04-12: All event queries run server-side through Supabase RLS
- T-04-13: Edit button rendered only when `event.created_by === member.id || userRole === 'admin'`

## Self-Check: PASSED

All created files exist on disk. Both task commits (4097375, d1c7968) verified in git log. Build passes with all routes rendered including /events, /events/[eventId], /sessions, /sessions/calendar.
