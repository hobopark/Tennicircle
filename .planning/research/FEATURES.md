# Feature Research

**Domain:** Tennis community and coaching management platform
**Researched:** 2026-04-06
**Confidence:** MEDIUM (competitor analysis via web research; no direct user interviews)

## Feature Landscape

### Table Stakes (Users Expect These)

Features coaches and members assume exist. Missing these = product feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Session scheduling with recurring templates | Coaches run the same sessions every week; manual re-entry is a dealbreaker | MEDIUM | Recurrence logic (skip/modify instances, end date) is the hard part; generating individual sessions from a template is standard |
| RSVP with capacity limits | Every booking tool offers this; without it coaches can't manage court space | LOW | Straightforward; the complexity is in the edge cases (cancellation windows, capacity changes) |
| Waitlist with manual promotion | Coaches know their players and want control over who moves up | LOW | Manual promotion (not auto) is the right call for coaching relationships; auto-promote risks conflicts |
| Player profiles (contact, skill level, notes) | Coaches keep mental models of each player; a profile is the digital equivalent | LOW | Self-assessed vs coach-assessed skill levels are two separate fields; both expected |
| Session attendance history | Coaches need to see who showed up; basis for billing disputes and progress tracking | LOW | Simple join table query; important for coach-to-player trust |
| Coach dashboard (schedule + roster) | Coaches need their day/week at a glance; anything less feels like using a calendar app | MEDIUM | Weekly view + per-session attendance list; multi-coach view is what makes it a dashboard vs a calendar |
| Role-based access (Admin / Coach / Member) | Multi-coach environments require it; without it coaches see each other's private client data | MEDIUM | Three roles minimum; the "coaches see only their clients" scoping is the tricky part |
| In-app notifications | Session reminders, waitlist updates — users expect to be notified without checking manually | MEDIUM | Push notifications on mobile web (PWA) adds complexity; start with in-app notification feed |
| Community event creation (tournaments, socials, open sessions) | Tennis communities run events beyond regular coaching sessions | MEDIUM | Three distinct event types with different registration models |
| Event RSVP and capacity | Users expect to register for community events the same way they RSVP to sessions | LOW | Same pattern as session RSVP; reuse the component |
| Announcements / broadcast messaging | Coaches use WhatsApp groups for this today; replacing it requires at minimum a broadcast feature | LOW | One-to-many; no threading needed for MVP |

### Differentiators (Competitive Advantage)

Features that set TenniCircle apart from generic booking software and Excel-replacement tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Coach-scoped client visibility | Each coach sees only their players; admins see all — mirrors how real coaching hierarchies work | MEDIUM | Competitors treat all members as club-wide; this model respects coach-client relationships |
| Coach progress notes per session | After each session, coach writes a note visible to the player — creates a development record | LOW | Text field per session per player; low complexity, high perceived value for players |
| Dual skill level (self-assessed + coach-assessed) | Players self-report NTRP/UTR; coaches override with their own assessment — both are useful | LOW | Two fields on profile; comparison between them surfaces useful insights later |
| Playing style and goals fields on profile | Goes beyond name/contact — captures how a player thinks about their game | LOW | Freetext or structured tags; enables better coach-to-player matching in multi-coach scenarios |
| Multi-coach co-coaching on a single session | Sessions can have multiple coaches; one is primary | LOW | Foreign key to session_coaches junction table; standard but often missing in smaller tools |
| Recurring template with per-instance overrides | Generate a series, then adjust individual sessions without breaking the whole series | HIGH | This is the hardest scheduling feature; requires careful data model (template + override pattern) |
| Community events as first-class objects | Tournaments, social events, and open sessions are distinct types — not just renamed bookings | MEDIUM | Three event types with different UX flows; most booking tools flatten everything to one type |
| Multi-tenancy from day one | One platform can serve multiple communities; data is fully isolated | HIGH | Requires community_id on every table; not visible to users but critical for growth |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automated waitlist promotion | Reduces admin work | Coaches know which waitlisted player should actually come; auto-promote can cause friction or awkward cancellations with the wrong player | Manual promotion with a clear "promote" button and notification to the promoted player |
| Integrated payment processing | Coaches want to collect fees in-app | Adds regulatory complexity (Stripe Connect, tax compliance, refund flows), support burden, and scope creep for MVP; Jaden collects payments outside the app today | Leave payments out of MVP; add a "mark as paid" flag if coaches need tracking without processing |
| Automated tournament bracket generation | Saves organiser time | Bracket logic for odd numbers, byes, consolation draws, and mixed formats is genuinely complex; bugs erode trust in the platform | Let the organiser post a bracket image or PDF; build manual draw management first, automate later |
| AI-powered coaching feedback | Impressive demo feature | Requires video infrastructure, ML pipeline, significant compute cost — not core to the booking/community problem | Defer to Phase 2; coach progress notes deliver 80% of the value at 1% of the cost |
| Full member directory / social profiles | Community feel | Tennis coaching relationships are private; members don't necessarily want their peers to see their skill level, goals, or attendance | Keep profiles coach-scoped for MVP; consider opt-in directory later |
| Email/SMS notifications | Users expect email reminders | Email deliverability (SPF/DKIM, unsubscribe flows) and SMS add operational complexity and cost; in-app is sufficient to validate the concept | In-app notification feed for MVP; add email later when retention data justifies it |
| Activity feed / social wall | Makes it feel like a community | Tennis communities don't need a Facebook-lite; announcements from coaches cover the communication need; a feed creates moderation burden | Announcements broadcast (one-to-many, coach-controlled) is sufficient |
| OAuth / magic link login | Reduces friction | Adds third-party dependencies; email/password is understood by Jaden's demographic and sufficient for MVP | Email/password with a password reset flow; OAuth can layer on if conversion data supports it |
| Live scoring during tournaments | Engagement feature | Live scoring requires real-time infrastructure, match officials, or player self-reporting — each has tradeoffs | Manual results entry by the organiser after matches; players check the bracket board |

## Feature Dependencies

```
Roles & Auth
    └──required by──> Session Management (coach-scoped sessions need coach identity)
    └──required by──> Player Profiles (profiles belong to a coach's client list)
    └──required by──> Community Events (admin-only creation controls)
    └──required by──> Notifications (notifications are user-targeted)

Recurring Session Templates
    └──required by──> Individual Sessions (templates generate instances)
                          └──required by──> RSVP / Waitlist
                                               └──required by──> Waitlist Promotion
                                               └──required by──> Session Reminders (notifications)

Player Profiles
    └──required by──> Attendance History (history is per player)
    └──required by──> Coach Progress Notes (notes attach to player + session)
    └──required by──> Lesson History

Coach Dashboard
    └──requires──> Sessions (nothing to show without sessions)
    └──requires──> Player Profiles (roster view needs profiles)
    └──enhanced by──> Attendance History

Community Events
    └──requires──> Roles & Auth (event visibility rules differ from coaching sessions)
    └──enhanced by──> RSVP (same RSVP component as sessions, reused)

Announcements
    └──requires──> Roles & Auth (coach/admin only can post)
    └──enhanced by──> Notifications (announcement triggers in-app notification)

Multi-tenancy (community_id scoping)
    └──required by──> ALL features (must be in data model from day one, invisible to users)
```

### Dependency Notes

- **Recurring session templates require careful data modelling before individual sessions:** The template-plus-override pattern must be decided in Phase 1 data modelling or it becomes a painful migration. Generating individual sessions from a template is straightforward; allowing per-instance overrides without breaking the series is the hard part.
- **RSVP and community events share a component:** Both follow the same capacity + RSVP + waitlist pattern. Design the session RSVP system to be reusable; don't build two separate systems.
- **Multi-tenancy is invisible but load-bearing:** Every query, every RLS policy, and every API endpoint must be community-scoped from the first migration. Retrofitting multi-tenancy is a rewrite-level change.
- **Coach progress notes enhance but don't block profiles:** Profiles work without notes; notes add value once profiles are in place. Notes can be a v1.1 addition if time is tight.

## MVP Definition

### Launch With (v1)

Minimum viable to replace Jaden's WhatsApp groups and spreadsheets.

- [ ] Roles and auth (Admin, Coach, Member) with coach-scoped client visibility
- [ ] Recurring session templates that generate individual sessions
- [ ] Per-instance overrides (time, venue, capacity) after generation
- [ ] RSVP with capacity limits
- [ ] Waitlist with manual promotion by coach/admin
- [ ] Player profiles (name, contact, skill levels x2, playing style, goals)
- [ ] Lesson/attendance history per player
- [ ] Coach progress notes per session (can be v1.1 if needed)
- [ ] Community events: tournaments (RSVP + manual draw), social events (RSVP), open sessions (drop-in)
- [ ] Coach dashboard: schedule view + per-session attendance list + player roster
- [ ] Announcements (admin/coach posts, all members see)
- [ ] In-app notification feed (session reminders, waitlist updates, announcements)
- [ ] Multi-tenancy data model (community_id scoping, even if only one community uses it)

### Add After Validation (v1.x)

Features to add once the core booking loop is confirmed to work.

- [ ] Email notifications — add when in-app alone shows insufficient engagement
- [ ] Match history (community match results) — add when tournament feature is actively used
- [ ] Skill level progression over time (history of coach-assessed levels) — add when coaches ask for it
- [ ] PWA push notifications — add when web-only reminders prove insufficient

### Future Consideration (v2+)

Defer until product-market fit is established.

- [ ] AI-powered coaching analysis (video/photo) — Phase 2 per PRD; requires significant infrastructure
- [ ] Progress analytics dashboards — Phase 2; needs historical data to be meaningful
- [ ] Payment processing and billing — Phase 2; adds regulatory and support complexity
- [ ] Automated bracket generation for tournaments — Phase 2; manual draws sufficient for MVP
- [ ] Member directory (opt-in, community-wide) — Phase 3 or when multi-community use cases emerge
- [ ] Native mobile apps (iOS/Android) — Phase 3; web-responsive covers MVP needs
- [ ] Multi-sport support — Phase 3 per PRD
- [ ] Community activity feed / social wall — Phase 3 if ever

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Roles & auth (3-role, coach-scoped) | HIGH | MEDIUM | P1 |
| Recurring session templates + instances | HIGH | HIGH | P1 |
| RSVP with capacity | HIGH | LOW | P1 |
| Waitlist with manual promotion | HIGH | LOW | P1 |
| Player profiles (dual skill level, style, goals) | HIGH | LOW | P1 |
| Attendance history | HIGH | LOW | P1 |
| Coach dashboard | HIGH | MEDIUM | P1 |
| Community events (3 types) | HIGH | MEDIUM | P1 |
| In-app notifications | MEDIUM | MEDIUM | P1 |
| Announcements | MEDIUM | LOW | P1 |
| Multi-tenancy data model | LOW (user-visible) / HIGH (strategic) | MEDIUM | P1 |
| Coach progress notes | MEDIUM | LOW | P2 |
| Match history | MEDIUM | LOW | P2 |
| Email notifications | MEDIUM | MEDIUM | P2 |
| PWA push notifications | LOW | HIGH | P3 |
| Progress analytics dashboards | HIGH | HIGH | P3 |
| Payment processing | HIGH | HIGH | P3 |
| AI coaching analysis | MEDIUM | VERY HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | CourtReserve | Tennis Locker | Omnify | TenniCircle Approach |
|---------|--------------|---------------|--------|----------------------|
| Session booking | Yes — court-centric, member self-books | No — coaching session focus | Yes — class/slot model | Coach-managed sessions with coach-scoped client RSVP |
| Recurring schedules | Yes | Calendar only | Yes (class packs) | Template + auto-generated instances with per-instance overrides |
| Waitlist | Yes — automated promotion | No | Yes — automated | Manual promotion (coaches decide who moves up) |
| Player profiles | Basic membership profile | Rich — evals, fitness tests, style | Client profile | Coach-assessed + self-assessed skill; goals; playing style |
| Progress notes | No | Yes — session notes shared with player/parent | No | Yes — post-session notes from coach to player |
| Community events | Tournament scheduling | Tournament history only | No | First-class: three event types with distinct UX |
| Multi-coach per session | No | No | No (one instructor) | Yes — co-coaching supported |
| Role hierarchy | Member / Staff / Admin | Coach / Player / Parent | Staff / Client | Admin / Coach / Member with coach-scoped visibility |
| Payments | Yes — core feature | No | Yes — core feature | Out of scope for MVP |
| Notifications | Email + push (app) | Push notifications | Email + SMS | In-app feed for MVP |
| Multi-tenancy | Yes (franchise model) | No | Yes (multi-location) | Yes — community_id from day one |
| Mobile | Native iOS/Android | Native iOS/Android | Web + native app | Mobile-responsive web; React Native compatible architecture |

**Key competitive insight:** Existing platforms are either court-booking tools (CourtReserve, Omnify) or player-development tools (Tennis Locker). None are optimised for the coach-community organiser who runs both coaching sessions and community events under one roof. TenniCircle's differentiation is the combination of coaching session management, community events, and coach-scoped player development in a single, lightweight platform — not trying to add payments, AI, or a pro shop.

## Sources

- [6 Best Tennis Club Software in 2026 — WodGuru](https://wod.guru/blog/tennis-club-software/)
- [Best Tennis Club Management Software In-Depth Comparison — Activity Messenger](https://activitymessenger.com/blog/5-best-tennis-club-management-software-in-depth-comparison/)
- [Top 10 Tennis Club Management Software — JoinIt](https://joinit.com/blog/tennis-club-management-software)
- [Tennis Locker App Features](https://www.tennislockerapp.com/features/)
- [Omnify Tennis Coaching Software](https://www.getomnify.com/business/tennis-coaching-software)
- [CourtReserve Tennis Club Management](https://courtreserve.com/tennis/)
- [Best Tennis Scheduling Software — Anolla](https://anolla.com/en/best-tennis-software)
- [Top 10 Best Tennis Management Software — ZipDo](https://zipdo.co/best/tennis-management-software/)

---
*Feature research for: Tennis community and coaching management platform (TenniCircle)*
*Researched: 2026-04-06*
