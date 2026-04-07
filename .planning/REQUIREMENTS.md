# Requirements: TenniCircle

**Defined:** 2026-04-07
**Core Value:** Coaches can schedule sessions and members can RSVP — replacing spreadsheets entirely.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Roles

- [ ] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User can log in and stay logged in across browser refresh
- [x] **AUTH-03**: Three user roles enforced: Admin, Coach, Client
- [ ] **AUTH-04**: Admin can add and remove coaches from the community
- [ ] **AUTH-05**: Coaches can invite clients via invite link
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
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
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

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-06 after roadmap creation*
