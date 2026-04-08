# Phase 5: Notifications - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

In-app notification feed so members are notified of relevant events without needing to poll or check manually. Covers session reminders, announcement alerts, and RSVP confirmation/promotion notifications. No email or push notifications in MVP.

</domain>

<decisions>
## Implementation Decisions

### Delivery mechanism
- **D-01:** In-app notification feed only — bell icon with unread badge in the bottom nav + notification list page. No email or push for MVP.
- **D-02:** Notifications delivered via Supabase Realtime (postgres_changes subscription on the notifications table). Bell badge and feed update live without page refresh.

### Notification triggers
- **D-03:** NOTF-01 — Session reminder fires 24 hours before the session. Requires a scheduled job (Vercel Cron hitting a Next.js API route, or Supabase pg_cron).
- **D-04:** NOTF-02 — Announcement notification created immediately when a coach/admin posts an announcement (triggered in the `createAnnouncement` server action).
- **D-05:** NOTF-03 — RSVP confirmation/waitlist promotion notification created immediately when RSVP is confirmed or a waitlisted member is promoted (triggered in `rsvpSession`, `rsvpEvent`, and the auto-promotion logic in `cancelEventRsvp`/`cancelRsvp`).

### Navigation
- **D-06:** Notifications bell goes in the bottom nav as a new tab — consistent with the app's mobile-first pattern. All roles see it. Unread count badge on the icon.

### Claude's Discretion
- Notification data model (table schema, fields)
- Read/unread tracking mechanism
- Mark-all-as-read UX
- Notification grouping or ordering strategy
- How deep-links from notifications work (e.g., tapping a session reminder navigates to the session detail)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — NOTF-01, NOTF-02, NOTF-03 acceptance criteria

### Existing notification patterns
- `src/components/ui/sonner.tsx` — Toast notification component (for ephemeral feedback, not persistent notifications)
- `src/components/nav/AppNav.tsx` — Bottom nav where bell tab will be added

### Server actions (notification trigger points)
- `src/lib/actions/announcements.ts` — `createAnnouncement` (NOTF-02 trigger)
- `src/lib/actions/rsvps.ts` — `rsvpSession`, `cancelRsvp` with waitlist promotion (NOTF-03 trigger)
- `src/lib/actions/events.ts` — `rsvpEvent`, `cancelEventRsvp` with waitlist promotion (NOTF-03 trigger)

### Supabase setup
- `src/lib/supabase/client.ts` — Browser Supabase client (for Realtime subscription)
- `src/lib/supabase/server.ts` — Server Supabase client (for notification creation)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AppNav.tsx` — Bottom nav with role-based tabs and longest-match-wins active state. New Notifications tab slots in here.
- `sonner.tsx` — Toast notifications for immediate action feedback. Notifications feed is complementary (persistent vs ephemeral).
- `InitialsAvatar` — For showing who triggered a notification (coach posted, admin announced).
- Supabase client/server split pattern — browser client for Realtime subscriptions, server client for creating notification rows.

### Established Patterns
- Server actions follow: auth → claims → member → validate → DB → revalidatePath
- `useEffect` for client-side data fetching (JWT parsing in AppNav is the pattern for Realtime subscription setup)
- `force-dynamic` on pages that need real-time data
- AceHub design: `rounded-3xl`, `font-heading`, framer-motion stagger animations

### Integration Points
- `AppNav.tsx` — add Notifications tab with Bell icon + unread badge
- `createAnnouncement` action — insert notification row after announcement creation
- `rsvpSession` / `rsvpEvent` — insert notification row on confirmed RSVP
- `cancelRsvp` / `cancelEventRsvp` auto-promotion — insert notification for promoted member
- Vercel Cron or pg_cron — scheduled job to create session reminder notifications 24h before

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the notification feed UI and data model.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-notifications*
*Context gathered: 2026-04-08*
