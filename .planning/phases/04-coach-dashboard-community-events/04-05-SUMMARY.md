---
plan: 05
phase: 04-coach-dashboard-community-events
status: complete
started: 2026-04-08
completed: 2026-04-08
---

## Summary

Schema pushed manually via Supabase SQL Editor. Extensive user testing and iterative fixes applied across multiple rounds of checkpoint feedback.

## Key Changes (Beyond Original Plan)

### Round 1 (9 issues)
- Calendar shows start–end time range; pixel-based positioning for precise timeslots
- Nav longest-match-wins logic (no dual highlighting)
- Player roster shows "Next session" in primary color
- Events/announcements queries use explicit community_id filter
- Login preserves email on wrong password
- Client dashboard shows clean onboarding state instead of "member not found"
- Create Event gated for coach/admin on official tab only
- Vibrant tab toggles, colorful stat cards, bold active nav icons

### Round 2 (7 issues)
- Nav: longest-match-wins algorithm for nested routes
- Coach dashboard: greeting, stats strip, upcoming sessions, events, announcements
- Client create event restored (community events)
- Dialog blank on first open fixed (step sync)
- Root cause: avatar_url doesn't exist on community_members — removed from all joins
- Tabs: switched from data-[state=active] (Radix) to data-active (base-ui)
- Events page: force-dynamic to prevent caching

### Round 3 (6 issues)
- Separated dashboard and schedule into distinct tabs/pages
- Coach: /coach = dashboard, /coach/schedule = calendar
- Client: /sessions = dashboard, /sessions/all = future+past lessons
- Nav restructured: Dashboard/Schedule/Clients/Events/Profile (coach), Dashboard/Sessions/Events/Profile (client)
- Different icons: LayoutDashboard, CalendarDays, Trophy, Calendar
- Calendar time labels shortened, column widened to 72px
- Tournament detail: removed DrawImageUpload server component error

### Additional Fixes
- Player names from player_profiles (not community_members UUID fallback)
- Profile photos on session detail, schedule calendar, event attendees
- Client detail page under /coach/clients/[memberId] with back nav
- Back navigation links on all detail pages
- Validation: capacity/duration truly optional (z.preprocess)
- Event and announcement edit functionality (updateEvent, updateAnnouncement actions)
- Announcement inline edit with plain HTML inputs (avoids base-ui warning)
- Author names resolved from player_profiles (no more "Unknown")
- Coach dashboard counts only events user is attending
- Events shown on schedule calendar (amber/blue/orange blocks)
- Overlapping calendar blocks stack side by side
- Grand Slam color scheme: Tournament=blue (AO), Social=orange (RG), Open=green (Wimbledon)
- Client dashboard: fixed created_at column error, sessions.title column error
- RSVPs count includes both session and event RSVPs
- Event type badges on dashboard event cards

## Self-Check: PASSED

## key-files
created:
  - src/app/coach/schedule/page.tsx
  - src/app/sessions/all/page.tsx
  - src/app/coach/clients/[memberId]/page.tsx
  - src/app/events/[eventId]/edit/page.tsx
  - src/components/events/EditEventForm.tsx

modified:
  - src/components/calendar/WeekCalendarGrid.tsx
  - src/components/nav/AppNav.tsx
  - src/components/events/EventsPageClient.tsx
  - src/components/events/EventCard.tsx
  - src/components/events/AnnouncementCard.tsx
  - src/components/events/CreateEventDialog.tsx
  - src/components/dashboard/ClientDashboard.tsx
  - src/components/sessions/SessionDetailPanel.tsx
  - src/components/auth/AuthPage.tsx
  - src/components/auth/LoginForm.tsx
  - src/components/profile/LessonHistory.tsx
  - src/app/coach/page.tsx
  - src/app/sessions/page.tsx
  - src/app/events/page.tsx
  - src/app/events/[eventId]/page.tsx
  - src/app/coach/clients/page.tsx
  - src/app/coach/sessions/[sessionId]/page.tsx
  - src/lib/actions/events.ts
  - src/lib/actions/announcements.ts
  - src/lib/actions/auth.ts
  - src/lib/validations/events.ts
  - src/lib/types/auth.ts
  - src/lib/types/events.ts
  - src/lib/supabase/middleware.ts
