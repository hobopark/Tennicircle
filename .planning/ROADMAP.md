# Roadmap: TenniCircle

## Overview

TenniCircle replaces Jaden's spreadsheet-and-group-chat workflow with an integrated platform. The build order is foundation-first: the multi-tenant data model and auth architecture must exist before any feature query is written. Sessions are the core product loop and ship second. Player profiles and the coach dashboard follow on top of the session data. Community events and announcements complete the community layer. Notifications add awareness on top of a stable data model. A final polish phase addresses the UX pitfalls that make the difference between a tool that works and one people trust.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Auth** - Multi-tenant data model, RLS, auth flows, and role enforcement (completed 2026-04-07)
- [ ] **Phase 2: Session Management** - Recurring session templates, RSVP with capacity enforcement, and waitlist
- [ ] **Phase 3: Player Profiles** - Player profiles, lesson history, and coach progress notes
- [ ] **Phase 4: Coach Dashboard & Community Events** - Schedule view, player roster, and community events with RSVP
- [ ] **Phase 5: Notifications** - In-app notification feed with real-time delivery
- [ ] **Phase 6: Polish & Launch Readiness** - UX hardening, edge cases, and cross-cutting correctness
- [ ] **Phase 7: Member Management & Invite System** - Admin/coach invite links, role management, coach client assignment
- [ ] **Phase 8: Community Selector & Open Sign-Up** - Multi-community navigation, community browser, join requests with approval
- [x] **Phase 9: Community Chat** - Realtime chatrooms with text and photo messaging, multi-manager rooms, unread tracking

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: Users can sign up, log in, and be correctly scoped to their community with their role enforced
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. A new user can sign up with email and password and is redirected based on their role (Admin, Coach, or Client)
  2. A logged-in user stays logged in across browser refresh without re-entering credentials
  3. An Admin can add a coach to the community; that coach can then invite a client via invite link
  4. A Coach cannot see data from another community; a Client cannot see sessions they were not invited to
  5. Role changes take effect immediately without requiring the affected user to log out and back in
**Plans:** 4/4 plans complete
Plans:
- [x] 01-01-PLAN.md — Database schema, RLS, Supabase clients, proxy, and test infrastructure
- [x] 01-02-PLAN.md — Design system (shadcn + TenniCircle palette + fonts) and auth type definitions
- [x] 01-03-PLAN.md — /auth page with login/signup tabs, email verification, and server actions
- [x] 01-04-PLAN.md — Welcome page, role-based routing, invite link system, and member management
**UI hint**: yes

### Phase 2: Session Management
**Goal**: Coaches can schedule recurring sessions and clients can RSVP, replacing the spreadsheet workflow
**Depends on**: Phase 1
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04, SESS-05, SESS-06, SESS-07, SESS-08, SESS-09
**Success Criteria** (what must be TRUE):
  1. A coach can create a recurring session template (e.g. "Every Tuesday 6pm at Moore Park") and individual session instances appear automatically
  2. A coach can edit one instance of a recurring session without affecting the rest of the series
  3. A client can RSVP to a session from their assigned coach, and is blocked from joining when the session is full
  4. A client who is waitlisted can be manually promoted to confirmed by the coach
  5. A client can cancel their own RSVP
**Plans:** 7 plans
Plans:
- [x] 02-00-PLAN.md -- Vitest install and test stubs (Wave 0)
- [x] 02-01-PLAN.md — Database schema (4 tables), RLS, capacity trigger, session generation function, types, validations, route config
- [x] 02-02-PLAN.md — RSVP server actions (join, cancel, promote) and session cancellation action
- [x] 02-03-PLAN.md — Session creation form, venue autocomplete, edit session with this/future scope
- [x] 02-04-PLAN.md — Coach weekly calendar grid and session detail page with attendee management
- [x] 02-05-PLAN.md — Client sessions page with card layout, RSVP dialogs, and cancel flow
- [x] 02-06-PLAN.md — Dependency install, schema push, and end-to-end verification checkpoint
**UI hint**: yes

### Phase 3: Player Profiles
**Goal**: Players have rich profiles and coaches can track progress and attendance history
**Depends on**: Phase 2
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04
**Success Criteria** (what must be TRUE):
  1. A player can view their profile showing name, contact, avatar, self-assessed skill level, and goals
  2. A coach can set or update a coach-assessed skill level on a player's profile, visible alongside the self-assessed level
  3. A player can view their lesson history showing all sessions attended and which coaches they worked with
  4. A coach can add a progress note after a session, and the player can see that note on their profile
**Plans:** 4 plans
Plans:
- [x] 03-01-PLAN.md — Database migration (3 tables + display_name), types, validations, server actions, test stubs, dependency installs
- [x] 03-02-PLAN.md — Profile setup wizard (4-step), avatar upload with square crop, skill level selector
- [x] 03-03-PLAN.md — Profile view pages, lesson history, coach assessment widget, progress notes, nav update
- [x] 03-04-PLAN.md — Schema push to Supabase and end-to-end verification checkpoint
**UI hint**: yes

### Phase 4: Coach Dashboard & Community Events
**Goal**: Coaches have a schedule view of their work and community members can create and RSVP to events
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, EVNT-06
**Success Criteria** (what must be TRUE):
  1. A coach can see their daily and weekly session schedule in a calendar view showing all upcoming sessions
  2. A coach can tap into any session and see the confirmed and waitlisted attendees
  3. A coach can view their full player roster with attendance patterns for each player
  4. Any member can create a tournament, social event, or open session and other members can RSVP
  5. Coach and admin announcements are visible to all members; community-created events are separated into a distinct tab from official coaching sessions
**Plans:** 6 plans
Plans:
- [x] 04-00-PLAN.md — Wave 0 test stubs for events actions, announcements, calendar, and event card
- [x] 04-01-PLAN.md — Database schema (events, event_rsvps, announcements), RLS, types, validations, shadcn installs
- [x] 04-02-PLAN.md — Server actions (events CRUD, RSVP, announcements) and event UI components
- [x] 04-03-PLAN.md — Coach schedule day/week toggle, day view, player roster attendance dates
- [x] 04-04-PLAN.md — Events page, event detail page, client dashboard with calendar secondary view, bottom nav conversion
- [x] 04-05-PLAN.md — Schema push to Supabase and end-to-end verification checkpoint
**UI hint**: yes

### Phase 5: Notifications
**Goal**: Members are notified of relevant events in-app without needing to poll or check manually
**Depends on**: Phase 4
**Requirements**: NOTF-01, NOTF-02, NOTF-03
**Success Criteria** (what must be TRUE):
  1. A client receives an in-app notification before their upcoming session (session reminder)
  2. A client receives an in-app notification when a coach or admin posts an announcement
  3. A client receives an in-app confirmation notification when their RSVP is accepted or when they are promoted from the waitlist
**Plans:** 4 plans
Plans:
- [ ] 05-01-PLAN.md — Database schema (notifications table), RLS, types, mark-as-read server actions
- [ ] 05-02-PLAN.md — Wire notification inserts into announcement/RSVP actions, Vercel Cron session reminders
- [ ] 05-03-PLAN.md — Notification feed page with Realtime subscription, bell icon with unread badge in AppNav
- [ ] 05-04-PLAN.md — Schema push to Supabase and end-to-end verification checkpoint
**UI hint**: yes

### Phase 6: Polish & Launch Readiness
**Goal**: The platform is stable, correct at the edges, and trustworthy enough to hand to Jaden's community
**Depends on**: Phase 5
**Requirements**: (cross-cutting — no new requirements; addresses UX gaps and correctness across all phases)
**Success Criteria** (what must be TRUE):
  1. Session cards show available capacity and waitlist position so a client always knows where they stand
  2. The calendar defaults to week view on desktop and day view on mobile; all session times display the correct timezone
  3. Attempting to RSVP to a full session from two browser tabs simultaneously results in one success and one waitlist placement — not two RSVPs
  4. An RLS audit confirms every database table has row-level security enabled with correct community-scoping policies
**Plans:** 5 plans
Plans:
- [x] 07-00-PLAN.md — Wave 0: test stub files for all Phase 7 requirements
- [x] 07-01-PLAN.md — Junction table migration, types, and assignment server actions
- [x] 07-02-PLAN.md — Open sign-up auto-join and processInviteSignup junction table update
- [x] 07-03-PLAN.md — Roster UI: invite button, member cards, role management, client assignment
- [x] 07-04-PLAN.md — Schema push (manual) and end-to-end verification checkpoint
**UI hint**: yes

### Phase 7: Member Management & Invite System
**Goal**: Admins and coaches can manage members, send invite links, and assign clients — completing the member lifecycle that was stubbed in Phase 1
**Depends on**: Phase 1, Phase 4
**Requirements**: MGMT-01, MGMT-02, MGMT-03, MGMT-04, MGMT-05, MGMT-06, MGMT-07
**Gap Closure**: Closes AUTH-04, AUTH-05, DASH-03 gaps from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. An admin can send an invite link specifying coach or client role, and the recipient joins with that role after signing up
  2. An admin can add or remove coaches and grant admin privilege to any community member
  3. A new sign-up without an invite link is assigned the client role with no coach
  4. A coach can view all members in the community, with a filter toggle for "my clients" only
  5. A coach can assign any unassigned member to themselves and remove members from their own client list
  6. Members without completed profiles appear in the roster with a "profile pending" state (not silently hidden)
**Plans:** 4 plans
Plans:
- [x] 07-01-PLAN.md — Junction table migration, types, and assignment server actions
- [x] 07-02-PLAN.md — Open sign-up auto-join and processInviteSignup junction table update
- [x] 07-03-PLAN.md — Roster UI: invite button, member cards, role management, client assignment
- [x] 07-04-PLAN.md — Schema push (manual) and end-to-end verification checkpoint
**UI hint**: yes

### Phase 8: Community Selector & Open Sign-Up
**Goal**: Users can belong to multiple communities and navigate between them; new users can discover and request to join communities
**Depends on**: Phase 7
**Requirements**: COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06
**Success Criteria** (what must be TRUE):
  1. After login, a user who belongs to multiple communities sees a community picker screen and can select which community to enter
  2. A user who belongs to a single community lands on the community picker showing their one community — single tap to enter (D-23 override: no auto-redirect past picker)
  3. A new user signing up without an invite link sees a community browser listing all communities and can request to join one
  4. A join request requires coach or admin approval before the member gains access
  5. An admin can create a new community and becomes that community's first admin (future: paid feature for non-admins)
  6. Routing is restructured so community context is part of the navigation (dashboard loads after community selection, not directly after login)
  7. All key route directories have loading.tsx skeleton files for instant perceived navigation between tabs (coach dashboard, sessions, clients, events, notifications, profile)
**Plans:** 5 plans
Plans:
- [x] 08-01-PLAN.md — SQL migration (RLS rewrite, join_requests table, types, helpers, CommunityProvider)
- [x] 08-02-PLAN.md — Server actions migration (communityId parameter, remove getJWTClaims)
- [x] 08-03-PLAN.md — Route migration to /c/[slug]/, proxy rewrite, AppNav update
- [x] 08-04-PLAN.md — /communities page (picker, browse, join, create), community switcher
- [x] 08-05-PLAN.md — Join request approval UI, loading skeletons, schema push checkpoint
**UI hint**: yes

### Phase 9: Community Chat
**Goal**: Community members can communicate in realtime chatrooms with text and photo messages, replacing external group chats
**Depends on**: Phase 8
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06
**Success Criteria** (what must be TRUE):
  1. Any community member can create a chatroom, name it, and add other community members
  2. Members of a chatroom can send and receive text messages in realtime without page refresh
  3. Members can attach and send photos (JPEG/PNG/WebP, up to 10MB) that render inline in the chat
  4. The Chat nav tab shows total unread message count; the chatroom list shows per-room unread counts
  5. Chatroom managers (multiple allowed) can rename the room, add/remove members, and promote/demote other managers
  6. Opening a chatroom marks all messages as read; unread counts update accordingly
**Plans:** Built directly (no phased plan files)
**Schema**: `chatrooms`, `chatroom_members` (with role column), `chat_messages`, `chat_read_cursors` + `is_chatroom_member()` and `is_chatroom_manager()` security definer functions
**Storage**: `chat-media` bucket (public, 10MB, image/*)
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 4/4 | Complete   | 2026-04-07 |
| 2. Session Management | 7/7 | Complete | - |
| 3. Player Profiles | 4/4 | Complete | - |
| 4. Coach Dashboard & Community Events | 6/6 | Complete | - |
| 5. Notifications | 4/4 | Complete | - |
| 6. Polish & Launch Readiness | 5/5 | Complete | - |
| 7. Member Management & Invite System | 4/4 | Complete | - |
| 8. Community Selector & Open Sign-Up | 0/5 | Planning complete | - |
| 9. Community Chat | - | Complete | 2026-04-12 |
