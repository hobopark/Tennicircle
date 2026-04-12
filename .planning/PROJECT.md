# TenniCircle

## What This Is

TenniCircle is a tennis community management platform that replaces the fragmented spreadsheet-and-group-chat workflow used by tennis coaches and community organisers. It provides integrated session booking, player management, and community event organisation in one place. The first customer is Jaden, a head coach running a Sydney-based tennis community, with co-founder Joon Park building the product.

## Core Value

Coaches can schedule sessions and members can RSVP — replacing spreadsheets entirely. If Jaden stops needing his spreadsheet, it's working.

## Requirements

### Validated

- [x] Atomic RSVP prevents double-booking under concurrent access (Phase 6)
- [x] RLS enabled on all 15 database tables with policies (Phase 6)
- [x] Session capacity display with color-coded badges (Phase 6)
- [x] Calendar frozen panes and view persistence (Phase 6)
- [x] Styled Dialog for destructive actions, no browser dialogs (Phase 6)

### Active

#### Roles & Auth
- [ ] Three user roles: Admin (Jaden), Coaches, and Clients/Members
- [ ] Admin has full oversight and can do everything coaches can
- [ ] Coaches self-manage their own sessions and invite their own clients
- [ ] Clients see only sessions from coaches who invited them
- [ ] Supabase-based auth with client-side flows (future React Native compatibility)

#### Session Management
- [ ] Recurring session templates (e.g. "Every Tuesday 6pm at Moore Park") that auto-generate individual sessions
- [ ] Individual sessions are adjustable after generation (time, venue, capacity changes)
- [ ] Sessions have venue/court, time, capacity, and assigned coach(es)
- [ ] Multiple coaches can co-coach a single session
- [ ] RSVP system with capacity limits
- [ ] Waitlist when sessions are full, with manual promotion by coaches/admin

#### Player Profiles & History
- [ ] Player profile: name, contact, skill level (self-assessed + coach-assessed), playing style, goals
- [ ] Lesson history: record of all sessions attended, coaches worked with
- [ ] Match history: results from community matches and events
- [ ] Coach progress notes: coach can add notes after each session, visible to the player

#### Community Events
- [ ] Three event types: Tournaments, Social events (fun days, BBQs), Open sessions (drop-in)
- [ ] Community events are open to all members (unlike coaching sessions which are coach-scoped)
- [ ] Tournament support: RSVP/registration + manual draw management (brackets posted by organiser)
- [ ] Social events: RSVP with details and capacity
- [ ] Open sessions: drop-in sessions visible to all community members

#### Coach Dashboard
- [ ] Daily/weekly schedule view
- [ ] Attendance view: who's coming to each session
- [ ] Player management: view all assigned players, their progress, attendance patterns

#### Announcements & Notifications
- [ ] Coaches/admin can post announcements to their community
- [ ] In-app notifications only for MVP (session reminders, waitlist updates, announcements)

#### Community Chat
- [ ] Any community member can create chatrooms
- [ ] Chatroom creator is automatically a manager; multiple managers supported
- [ ] Managers can rename chatroom, add/remove members, promote/demote managers
- [ ] Realtime messaging via Supabase Realtime (postgres_changes)
- [ ] Messages support text and photos (JPEG/PNG/WebP, 10MB max)
- [ ] Unread tracking with cursor-based read receipts (per-user per-room)
- [ ] Unread badge on Chat nav tab + per-chatroom counts in list
- [ ] Member picker to add community members to chatrooms

#### Member Management & Invites
- [ ] Admin can send invite links specifying coach or client role
- [ ] Admin can add/remove coaches and grant admin privilege to any member
- [ ] New sign-up without invite link is assigned client role with no coach
- [ ] Coach can view all community members with filter for own assigned clients
- [ ] Coach can assign/remove members to/from their own client list
- [ ] Members without completed profiles visible in roster with "profile pending" state

#### Community Navigation
- [ ] Post-login community picker for users in multiple communities
- [ ] Auto-redirect for users in a single community
- [ ] Community browser for new sign-ups — all communities visible, request to join
- [ ] Join request requires coach/admin approval before member gains access
- [ ] Admin can create a new community (future: paid feature for non-admins)
- [ ] Routing restructured with community context in navigation

### Out of Scope

- Payments / revenue tracking — handled outside the app for MVP; premium subscriptions, pro shop planned for post-MVP
- AI-assisted coaching (video/photo analysis) — Phase 2 feature per PRD
- Progress analytics dashboards — Phase 2 feature
- Community activity feed / social wall — deferred (community chat addresses core messaging need)
- Live scoring / automated bracket generation for tournaments — deferred; manual draws for MVP
- Automated match scheduling based on availability — deferred
- Multi-sport support — Phase 3 per PRD
- Native mobile app — web-first with mobile-responsive design; architecture kept compatible for future React Native
- OAuth / magic link login — email/password sufficient for MVP
- Email notifications — in-app only for MVP
- Community health metrics / engagement analytics — deferred

## Context

- **First customer:** Jaden, head coach of a Sydney-based tennis community. Currently manages via WhatsApp groups and spreadsheets.
- **Co-founders:** Joon Park (builder) and Jaden (domain expert, head coach). Co-ownership model.
- **Business model:** Freemium subscription planned (free tier: basic booking/profiles; premium: analytics, AI coaching, priority registration). Not implemented in MVP.
- **PRD phases:** Phase 1 (MVP — core booking, profiles, events), Phase 2 (AI coaching, analytics), Phase 3 (multi-community, multi-sport).
- **Coaching hierarchy:** Jaden is head coach/admin. Multiple coaches report to him. Coaches invite and manage their own clients independently.
- **Stack decision:** Next.js (App Router), Supabase (cloud — auth, database, storage), Vercel deployment. Client-side auth flows preferred over cookie-only for future React Native compatibility.
- **Multi-tenancy:** Data model supports multiple communities from day one, even though MVP targets one community.

## Constraints

- **Tech stack**: Next.js App Router + Supabase + Vercel — decided, non-negotiable
- **Architecture**: Must keep API layer clean for future React Native frontend; prefer client-side auth flows
- **Multi-tenancy**: Data model must support multiple communities from the start
- **Mobile**: Web-first, mobile-responsive from day one; no native app for MVP
- **Payments**: No payment processing in MVP
- **Design direction**: AceHub (Base44 prototype) — see `.planning/DESIGN-REF.md`. All frontend phases must reference this file for color tokens, fonts, card patterns, animations, and component styles

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over custom backend | Faster development, built-in auth/storage/realtime, generous free tier | — Pending |
| Client-side auth flows | Future React Native compatibility; avoid cookie-only patterns | — Pending |
| Multi-tenancy from day one | Avoid costly migration later; PRD envisions multi-community | — Pending |
| Manual waitlist promotion | Coaches know their players; auto-promote could cause issues | — Pending |
| In-app notifications only | Simpler for MVP; email/push can layer on later | — Pending |
| RSVP + manual draws for tournaments | Full bracket automation is complex; manual sufficient for MVP | — Pending |
| Community creation admin-only for now | Future: paid feature for anyone to create communities | — Decided 2026-04-09 |
| Open sign-up → community browser → approval | New users without invite pick a community and request to join; coach/admin approves | — Decided 2026-04-09 |
| Post-login community picker | Users in multiple communities choose which to enter; single-community auto-redirects | — Decided 2026-04-09 |
| Coaches see all members, filter own clients | Coaches can assign/remove members to themselves from full roster | — Decided 2026-04-09 |
| Multi-manager chatrooms | Any member can be promoted to manager; avoids single-point ownership | — Decided 2026-04-12 |
| Cursor-based unread tracking | One row per user per chatroom vs per-message read receipts; scales better | — Decided 2026-04-12 |
| Polling for chat nav badge (not realtime) | Supabase Realtime postgres_changes doesn't filter by RLS server-side; polling is safer | — Decided 2026-04-12 |
| Invite links: logged-in users only for MVP | Logged-out/new-user invite flow deferred; token threading through email verification unreliable | — Decided 2026-04-13 |
| Service client for invite processing | invite_links RLS requires membership but user isn't a member yet; service client bypasses | — Decided 2026-04-13 |
| Domain: tennicircle.app | Namecheap registration, Vercel hosting, Resend SMTP for auth emails | — Decided 2026-04-12 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-12 — added Community Chat feature (Phase 9)*
