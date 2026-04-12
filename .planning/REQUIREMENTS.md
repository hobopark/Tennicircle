# Requirements: TenniCircle

**Defined:** 2026-04-07
**Core Value:** Coaches can schedule sessions and members can RSVP — replacing spreadsheets entirely.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Roles

- [x] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User can log in and stay logged in across browser refresh
- [x] **AUTH-03**: Three user roles enforced: Admin, Coach, Client
- [x] **AUTH-04**: Admin can add and remove coaches from the community
- [x] **AUTH-05**: Coaches can invite clients via invite link
- [x] **AUTH-06**: Multi-tenant data isolation via RLS (community-scoped)

### Session Management

- [ ] **SESS-01**: Coach can create recurring session templates (day, time, venue, capacity)
- [ ] **SESS-02**: System auto-generates individual sessions from templates
- [ ] **SESS-03**: Coach can override individual session details (time, venue, capacity)
- [ ] **SESS-04**: Multiple coaches can be assigned to a single session
- [ ] **SESS-05**: Client can RSVP to sessions from their assigned coaches
- [ ] **SESS-06**: Session capacity enforced at database level
- [ ] **SESS-07**: Waitlist when session is full
- [ ] **SESS-08**: Coach can manually promote from waitlist
- [ ] **SESS-09**: Client can cancel their RSVP

### Player Profiles

- [ ] **PROF-01**: User has profile with name, contact, avatar, bio
- [ ] **PROF-02**: Player has skill level (self-assessed + coach-assessed)
- [ ] **PROF-03**: Player can view their lesson history (sessions attended, coaches)
- [ ] **PROF-04**: Coach can add progress notes after sessions, visible to player

### Community Events

- [ ] **EVNT-01**: Any member can create tournaments (RSVP + manual draw posting)
- [ ] **EVNT-02**: Any member can create social events with RSVP and capacity
- [ ] **EVNT-03**: Any member can create open sessions visible to all members
- [ ] **EVNT-04**: All community members can see and RSVP to events
- [ ] **EVNT-05**: Coach/admin can post announcements to the community
- [ ] **EVNT-06**: Official (coach/admin) and community (member-created) events are separated into distinct pages/tabs

### Coach Dashboard

- [ ] **DASH-01**: Coach sees daily/weekly schedule of upcoming sessions
- [ ] **DASH-02**: Coach sees who's confirmed/waitlisted for each session
- [ ] **DASH-03**: Coach can view all assigned players with attendance patterns

### Notifications

- [ ] **NOTF-01**: In-app session reminder notifications
- [ ] **NOTF-02**: In-app announcement alert notifications
- [ ] **NOTF-03**: In-app RSVP confirmation notifications

### Member Management

- [ ] **MGMT-01**: Admin can send invite links specifying coach or client role
- [ ] **MGMT-02**: Admin can add/remove coaches from the community
- [ ] **MGMT-03**: Admin can grant admin privilege to any community member
- [ ] **MGMT-04**: New sign-up without invite link is assigned client role with no coach
- [ ] **MGMT-05**: Coach can view all community members with filter for own assigned clients
- [ ] **MGMT-06**: Coach can assign/remove members to/from their own client list
- [ ] **MGMT-07**: Members without completed profiles visible in roster with "profile pending" state

### Community Chat

- [ ] **CHAT-01**: Any community member can create a chatroom and becomes its manager
- [ ] **CHAT-02**: Realtime text messaging between chatroom members
- [ ] **CHAT-03**: Photo attachments in chat (JPEG/PNG/WebP, 10MB max)
- [ ] **CHAT-04**: Unread message tracking with per-room and total counts
- [ ] **CHAT-05**: Multiple managers per chatroom; managers can rename, add/remove members, promote/demote
- [ ] **CHAT-06**: Chat tab in bottom nav accessible to all roles (admin, coach, client)

### Community Navigation

- [ ] **COMM-01**: Post-login community picker for users in multiple communities
- [ ] **COMM-02**: Auto-redirect to dashboard for users in a single community
- [ ] **COMM-03**: Community browser for new sign-ups (all communities visible)
- [ ] **COMM-04**: Join request requires coach/admin approval before member gains access
- [ ] **COMM-05**: Admin can create a new community (future: paid feature for non-admins)
- [ ] **COMM-06**: Routing restructured with community context in navigation

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Payments & Subscriptions

- **PAY-01**: Premium subscription tiers (free/paid)
- **PAY-02**: Stripe payment processing for subscriptions
- **PAY-03**: Revenue tracking on coach dashboard

### AI Coaching (Phase 2 per PRD)

- **AICO-01**: Player uploads video/photo of form
- **AICO-02**: AI analyses technique and provides structured feedback
- **AICO-03**: Coach reviews AI analysis and adds annotations
- **AICO-04**: Progress tracking with AI-assisted improvement plans

### Advanced Events

- **AEVT-01**: Automated bracket generation for tournaments
- **AEVT-02**: Live scoring during matches
- **AEVT-03**: Leaderboards and historical results
- **AEVT-04**: Automated match scheduling based on availability

### Community Features

- **COMM-01**: Member directory (browse other members)
- **COMM-02**: Community activity feed / social wall
- **COMM-03**: Community health metrics and engagement analytics

### Notifications (Extended)

- **NOTX-01**: Email notifications for important events
- **NOTX-02**: Push notifications (mobile)
- **NOTX-03**: Waitlist promotion notifications
- **NOTX-04**: Configurable notification preferences

### Multi-Sport & Scale (Phase 3 per PRD)

- **SCAL-01**: Multi-community support (multiple independent communities)
- **SCAL-02**: Sport-agnostic framework (golf, basketball, etc.)
- **SCAL-03**: White-label / marketplace options

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Payment processing | Handled outside app for MVP; planned for post-MVP |
| AI coaching (video/photo analysis) | Phase 2 — high complexity, not core to replacing spreadsheets |
| Live scoring / automated brackets | High complexity; manual draws sufficient for MVP |
| Member directory | Deferred — coaching relationship is coach-scoped |
| Activity feed / social wall | Deferred — not needed to replace spreadsheet workflow |
| Email / push notifications | In-app only for MVP; email/push layered later |
| Native mobile app | Web-first; architecture kept compatible for future React Native |
| OAuth / magic link login | Email/password sufficient for MVP |
| Revenue tracking / analytics | No payments in MVP |
| Multi-sport support | Phase 3 per PRD |
| Match history / results tracking | Deferred to v1.1; not blocking core workflow validation |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| SESS-01 | Phase 2 | Pending |
| SESS-02 | Phase 2 | Pending |
| SESS-03 | Phase 2 | Pending |
| SESS-04 | Phase 2 | Pending |
| SESS-05 | Phase 2 | Pending |
| SESS-06 | Phase 2 | Pending |
| SESS-07 | Phase 2 | Pending |
| SESS-08 | Phase 2 | Pending |
| SESS-09 | Phase 2 | Pending |
| PROF-01 | Phase 3 | Pending |
| PROF-02 | Phase 3 | Pending |
| PROF-03 | Phase 3 | Pending |
| PROF-04 | Phase 3 | Pending |
| EVNT-01 | Phase 4 | Pending |
| EVNT-02 | Phase 4 | Pending |
| EVNT-03 | Phase 4 | Pending |
| EVNT-04 | Phase 4 | Pending |
| EVNT-05 | Phase 4 | Pending |
| EVNT-06 | Phase 4 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| NOTF-01 | Phase 5 | Pending |
| NOTF-02 | Phase 5 | Pending |
| NOTF-03 | Phase 5 | Pending |
| MGMT-01 | Phase 7 | Pending |
| MGMT-02 | Phase 7 | Pending |
| MGMT-03 | Phase 7 | Pending |
| MGMT-04 | Phase 7 | Pending |
| MGMT-05 | Phase 7 | Pending |
| MGMT-06 | Phase 7 | Pending |
| MGMT-07 | Phase 7 | Pending |
| COMM-01 | Phase 8 | Pending |
| COMM-02 | Phase 8 | Pending |
| COMM-03 | Phase 8 | Pending |
| COMM-04 | Phase 8 | Pending |
| COMM-05 | Phase 8 | Pending |
| COMM-06 | Phase 8 | Pending |
| CHAT-01 | Phase 9 | Complete |
| CHAT-02 | Phase 9 | Complete |
| CHAT-03 | Phase 9 | Complete |
| CHAT-04 | Phase 9 | Complete |
| CHAT-05 | Phase 9 | Complete |
| CHAT-06 | Phase 9 | Complete |

**Coverage:**
- v1 requirements: 50 total
- Mapped to phases: 50
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-12 — added CHAT-01 through CHAT-06 (Phase 9)*
