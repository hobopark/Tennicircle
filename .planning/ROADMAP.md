# Roadmap: TenniCircle

## Overview

TenniCircle replaces Jaden's spreadsheet-and-group-chat workflow with an integrated platform. The build order is foundation-first: the multi-tenant data model and auth architecture must exist before any feature query is written. Sessions are the core product loop and ship second. Player profiles and the coach dashboard follow on top of the session data. Community events and announcements complete the community layer. Notifications add awareness on top of a stable data model. A final polish phase addresses the UX pitfalls that make the difference between a tool that works and one people trust.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Auth** - Multi-tenant data model, RLS, auth flows, and role enforcement
- [ ] **Phase 2: Session Management** - Recurring session templates, RSVP with capacity enforcement, and waitlist
- [ ] **Phase 3: Player Profiles** - Player profiles, lesson history, and coach progress notes
- [ ] **Phase 4: Coach Dashboard & Community Events** - Schedule view, player roster, and community events with RSVP
- [ ] **Phase 5: Notifications** - In-app notification feed with real-time delivery
- [ ] **Phase 6: Polish & Launch Readiness** - UX hardening, edge cases, and cross-cutting correctness

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
**Plans:** 4 plans
Plans:
- [ ] 01-01-PLAN.md — Database schema, RLS, Supabase clients, proxy, and test infrastructure
- [ ] 01-02-PLAN.md — Design system (shadcn + TenniCircle palette + fonts) and auth type definitions
- [ ] 01-03-PLAN.md — /auth page with login/signup tabs, email verification, and server actions
- [ ] 01-04-PLAN.md — Welcome page, role-based routing, invite link system, and member management
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
**Plans**: TBD
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
**Plans**: TBD
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
**Plans**: TBD
**UI hint**: yes

### Phase 5: Notifications
**Goal**: Members are notified of relevant events in-app without needing to poll or check manually
**Depends on**: Phase 4
**Requirements**: NOTF-01, NOTF-02, NOTF-03
**Success Criteria** (what must be TRUE):
  1. A client receives an in-app notification before their upcoming session (session reminder)
  2. A client receives an in-app notification when a coach or admin posts an announcement
  3. A client receives an in-app confirmation notification when their RSVP is accepted or when they are promoted from the waitlist
**Plans**: TBD
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
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 0/4 | Planning complete | - |
| 2. Session Management | 0/? | Not started | - |
| 3. Player Profiles | 0/? | Not started | - |
| 4. Coach Dashboard & Community Events | 0/? | Not started | - |
| 5. Notifications | 0/? | Not started | - |
| 6. Polish & Launch Readiness | 0/? | Not started | - |
