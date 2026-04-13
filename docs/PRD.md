# TenniCircle — Product Reference Document

> Living blueprint of the TenniCircle codebase as of April 2026.
> Only documents what exists in code today — no aspirational features.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Feature Map](#3-feature-map)
4. [Page & Route Inventory](#4-page--route-inventory)
5. [Data Model](#5-data-model)
6. [API / Server Actions](#6-api--server-actions)
7. [Tech Stack & Architecture](#7-tech-stack--architecture)
8. [Auth Flow](#8-auth-flow)
9. [UI & Design System](#9-ui--design-system)
10. [Current Limitations / Known Gaps](#10-current-limitations--known-gaps)

---

## 1. Product Overview

**TenniCircle** is a tennis community management platform that replaces the fragmented spreadsheet-and-group-chat workflow used by tennis coaches and community organisers. It provides integrated session booking, player management, and community event organisation in one place.

**First customer:** Jaden, a head coach running a Sydney-based tennis community.

**Core value proposition:** Coaches can schedule sessions and members can RSVP — replacing spreadsheets entirely. If Jaden stops needing his spreadsheet, it's working.

**Multi-tenancy:** A single deployment supports multiple communities. Users can belong to more than one community, each with an independent role.

---

## 2. User Roles & Permissions

Three roles exist in `community_members.role`, plus a transient auth state:

| Role | Description |
|------|-------------|
| `admin` | Full community control. Typically the head coach / community owner. |
| `coach` | Session management, client roster, progress tracking. |
| `client` | Session attendance, event participation, personal profile. |
| `pending` | Auth-only state (not stored in DB) — user exists in `auth.users` but has no `community_members` row yet. |

### Permission Matrix

| Capability | Admin | Coach | Client |
|------------|:-----:|:-----:|:------:|
| View own dashboard | Admin dashboard | Coach dashboard | Client sessions dashboard |
| Create session templates | Yes | Yes (own clients only) | No |
| Edit/cancel sessions | Yes (any) | Yes (own sessions) | No |
| RSVP to sessions | No | No | Yes (if invited) |
| Create events | Yes (official) | Yes (official) | Yes (unofficial) |
| RSVP to events | Yes | Yes | Yes |
| Edit/delete events | Yes (any) | Own events only | Own events only |
| Create announcements | Yes | Yes | No |
| Approve/reject join requests | Yes | Yes | No |
| Manage member roles | Yes | No | No |
| Remove members | Yes | No | No |
| Create invite links (coach role) | Yes | No | No |
| Create invite links (client role) | Yes | Yes | No |
| Assign coaches to clients | Yes | Yes (self as coach) | No |
| Set coach assessments | Yes | Yes | No |
| Add progress notes | Yes | Yes | No |
| Create chat rooms | Yes | Yes | Yes |
| Manage chat room members | Room managers only | Room managers only | Room managers only |
| View all members | Yes | Yes | Yes |
| View notifications | Yes | Yes | Yes |
| Browse communities | Yes | Yes | Yes |
| Create communities | Any authenticated user | Any authenticated user | Any authenticated user |

### Route Access by Role

```
admin  → /admin, /coach, /sessions, /events, /notifications, /members, /chat
coach  → /coach, /events, /notifications, /members, /chat
client → /sessions, /events, /notifications, /members, /chat
```

### Role Home Routes

```
admin  → /c/{slug}/admin
coach  → /c/{slug}/coach
client → /c/{slug}/sessions
```

---

## 3. Feature Map

### Auth & Onboarding
- Email/password signup with email verification
- Email/password login
- Invite link signup (token-based, role-preserving)
- Profile setup wizard (global profile, pre-community)
- Community-specific profile creation (auto-copied from global on join approval)

### Communities
- Create community (auto-generates slug, creator becomes admin)
- Browse available communities (shows member counts)
- Request to join community (pending approval)
- Cancel pending join request
- Approve/reject join requests (coach/admin)
- Community selector page (`/communities`)
- Open sign-up flow (join as client directly)

### Sessions
- Create recurring session templates (day-of-week, start time, venue, capacity)
- Auto-generate session instances from templates (via Supabase RPC)
- Edit session (single instance or all future instances)
- Cancel session with reason
- Co-coach assignment on templates
- Client invitation system (invite specific clients to templates)
- Court number assignment
- Session calendar view (month calendar)
- Session list view (upcoming and all/past)

### RSVPs (Sessions)
- RSVP to session (auto-confirm if capacity available, else waitlist)
- Cancel RSVP
- Waitlist with position tracking (FIFO)
- Coach promotes waitlisted member to confirmed
- Coach removes waitlisted member
- Waitlist auto-resequencing on changes

### Events
- Create event (tournament, social, open_session types)
- Official vs unofficial events (derived from creator's role)
- RSVP to event (confirmed or waitlisted based on capacity)
- Cancel event RSVP (auto-promotes first waitlisted)
- Edit event (creator or admin)
- Delete event (creator or admin)
- Draw image upload for tournament events
- Event filtering and search

### Announcements
- Create announcement (coach/admin)
- Edit announcement
- Delete announcement
- Announcement feed on dashboards

### Profiles & Progress Tracking
- Global player profile (display name, phone, bio, avatar, skill level, UTR)
- Community-specific player profile
- Coach assessment (skill level rating per player)
- Progress notes (per session, per player, by coach)
- Lesson history with pagination
- Lesson history summary (total sessions, unique coaches, member since)
- Avatar upload to Supabase Storage

### Chat
- Create chat rooms (any member)
- Manager/member roles within chat rooms
- Real-time messaging (Supabase Realtime)
- Image/photo messages (Supabase Storage)
- Unread message tracking (per-member read cursors)
- Total unread count badge in navigation
- Paginated message history
- Rename chat room (managers)
- Add/remove chat room members (managers)
- Toggle manager role (managers)

### Notifications
- Real-time notification feed (Supabase Realtime)
- Notification types: session_reminder, announcement, rsvp_confirmed, waitlist_promoted, event_updated, session_updated, session_cancelled, rsvp_cancelled, join_approved, join_rejected
- Mark single notification as read
- Mark all notifications as read
- Unread count badge in navigation
- Cron-based session reminders (24-hour advance)

### Navigation & Layout
- Fixed bottom tab navigation (mobile-first)
- Role-aware navigation tabs
- Unread badges for chat and notifications
- Pending request count badge for coaches
- Community context throughout all `/c/[slug]/*` routes

### Member Management
- View all community members
- View individual member profiles
- Coach-client assignment system
- Remove member from community (admin)
- Update member role (admin)
- Invite links with role assignment

---

## 4. Page & Route Inventory

### Root Routes

| Route | File | Description | Access |
|-------|------|-------------|--------|
| `/` | `src/app/page.tsx` | Redirects: authenticated → `/communities`, unauthenticated → `/auth` | Public |
| `/auth` | `src/app/auth/page.tsx` | Login/signup form with tab toggle | Public |
| `/auth/confirm` | `src/app/auth/confirm/route.ts` | Email verification callback (API route) | Public |
| `/profile` | `src/app/profile/page.tsx` | Own profile view with lesson history, stats, coach assessment | Authenticated |
| `/profile/setup` | `src/app/profile/setup/page.tsx` | Profile creation/edit wizard | Authenticated |
| `/communities` | `src/app/communities/page.tsx` | Browse and manage communities, member counts, pending requests | Authenticated |
| `/invite` | `src/app/invite/page.tsx` | Process invite token, join community | Authenticated |

### Community Routes (`/c/[slug]/*`)

All community routes require authentication + community membership. The layout at `src/app/c/[slug]/layout.tsx` verifies membership and provides `CommunityProviderWrapper` context.

#### Client Pages

| Route | File | Description | Access |
|-------|------|-------------|--------|
| `/c/[slug]/sessions` | `src/app/c/[slug]/sessions/page.tsx` | Client dashboard: upcoming sessions, events, announcements, stats | All members |
| `/c/[slug]/sessions/[sessionId]` | `src/app/c/[slug]/sessions/[sessionId]/page.tsx` | Session detail with RSVP controls, attendee list, waitlist | All members |
| `/c/[slug]/sessions/all` | `src/app/c/[slug]/sessions/all/page.tsx` | All sessions including past | All members |
| `/c/[slug]/sessions/calendar` | `src/app/c/[slug]/sessions/calendar/page.tsx` | Calendar view of sessions (month) | All members |

#### Coach Pages

| Route | File | Description | Access |
|-------|------|-------------|--------|
| `/c/[slug]/coach` | `src/app/c/[slug]/coach/page.tsx` | Coach dashboard: stats, my sessions, events, announcements | Coach, Admin |
| `/c/[slug]/coach/schedule` | `src/app/c/[slug]/coach/schedule/page.tsx` | Coach's session schedule (owned + co-coached) | Coach, Admin |
| `/c/[slug]/coach/sessions/new` | `src/app/c/[slug]/coach/sessions/new/page.tsx` | Create new session template form | Coach, Admin |
| `/c/[slug]/coach/sessions/[sessionId]` | `src/app/c/[slug]/coach/sessions/[sessionId]/page.tsx` | Session detail/edit view | Coach, Admin |
| `/c/[slug]/coach/sessions/[sessionId]/edit` | `src/app/c/[slug]/coach/sessions/[sessionId]/edit/page.tsx` | Session edit form | Coach, Admin |
| `/c/[slug]/coach/clients` | `src/app/c/[slug]/coach/clients/page.tsx` | Client roster + pending join requests | Coach, Admin |
| `/c/[slug]/coach/clients/[memberId]` | `src/app/c/[slug]/coach/clients/[memberId]/page.tsx` | Individual client profile, lessons taught, coach notes | Coach, Admin |

#### Admin Pages

| Route | File | Description | Access |
|-------|------|-------------|--------|
| `/c/[slug]/admin` | `src/app/c/[slug]/admin/page.tsx` | Admin dashboard: community stats, role breakdown, pending requests, quick actions | Admin |

#### Shared Community Pages

| Route | File | Description | Access |
|-------|------|-------------|--------|
| `/c/[slug]/events` | `src/app/c/[slug]/events/page.tsx` | Browse community events, filter/search, create button | All members |
| `/c/[slug]/events/[eventId]` | `src/app/c/[slug]/events/[eventId]/page.tsx` | Event detail: RSVP, attendee list, draw image | All members |
| `/c/[slug]/events/[eventId]/edit` | `src/app/c/[slug]/events/[eventId]/edit/page.tsx` | Edit event form | Creator or Admin |
| `/c/[slug]/chat` | `src/app/c/[slug]/chat/page.tsx` | Chat room list with unread counts | All members |
| `/c/[slug]/chat/[chatroomId]` | `src/app/c/[slug]/chat/[chatroomId]/page.tsx` | Chat conversation with messages | Room members |
| `/c/[slug]/members/[memberId]` | `src/app/c/[slug]/members/[memberId]/page.tsx` | Member profile detail | All members |
| `/c/[slug]/notifications` | `src/app/c/[slug]/notifications/page.tsx` | Notification feed | All members |

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/cron/session-reminders` | GET | Cron job: creates session reminder notifications 24h before sessions. Requires `CRON_SECRET` header. Uses service-role client. |

### Special Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout: fonts, metadata, Sonner toast provider |
| `src/app/loading.tsx` | Root loading skeleton |
| `src/app/error.tsx` | Root error boundary |
| `src/app/global-error.tsx` | Global error handler |
| `src/app/not-found.tsx` | 404 page |
| `src/app/c/[slug]/layout.tsx` | Community layout: auth guard, membership check, context provider |

---

## 5. Data Model

### Entity Relationship Overview

```
auth.users (Supabase Auth)
  ├── player_profiles (1:many, global + per-community)
  ├── community_members (1:many, one per community)
  │     ├── coach_client_assignments (coach_member ↔ client_member)
  │     ├── session_coaches (member → session)
  │     ├── session_invitations (member → template)
  │     ├── session_rsvps (member → session)
  │     ├── event_rsvps (member → event)
  │     ├── notifications (member receives)
  │     ├── chatroom_members (member → chatroom)
  │     ├── chat_messages (sender)
  │     ├── chat_read_cursors (per chatroom)
  │     ├── coach_assessments (coach ↔ subject)
  │     └── progress_notes (coach ↔ subject per session)
  ├── join_requests (user → community)
  └── invite_links (created_by member)
  
communities
  ├── community_members
  ├── session_templates → sessions
  ├── events
  ├── announcements
  ├── chatrooms → chat_messages
  ├── notifications
  └── join_requests
```

### Tables

#### `communities`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `name` | text | NOT NULL |
| `slug` | text | UNIQUE, NOT NULL |
| `description` | text | nullable |
| `created_at` | timestamptz | default `now()` |

RLS: Enabled.

#### `community_members`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `user_id` | uuid | FK → auth.users.id ON DELETE CASCADE, NOT NULL |
| `role` | text | CHECK: `admin`, `coach`, `client`. NOT NULL |
| `coach_id` | uuid | FK → community_members.id. **DEPRECATED** (replaced by coach_client_assignments) |
| `display_name` | text | nullable |
| `joined_at` | timestamptz | default `now()` |

Unique: `(community_id, user_id)`. RLS: Enabled.

#### `invite_links`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id, NOT NULL |
| `created_by` | uuid | FK → community_members.id, NOT NULL |
| `role` | text | CHECK: `coach`, `client`. NOT NULL |
| `token` | text | UNIQUE, default `encode(gen_random_bytes(32), 'hex')` |
| `revoked_at` | timestamptz | nullable |
| `created_at` | timestamptz | default `now()` |

RLS: Enabled.

#### `coach_client_assignments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `coach_member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `client_member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `assigned_at` | timestamptz | default `now()` |

Unique: `(coach_member_id, client_member_id)`. RLS: Enabled.

#### `session_templates`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `coach_id` | uuid | FK → community_members.id, NOT NULL |
| `title` | text | NOT NULL |
| `venue` | text | NOT NULL |
| `capacity` | int | CHECK > 0, NOT NULL |
| `day_of_week` | int | CHECK 0–6 (0=Sun), NOT NULL |
| `start_time` | time | NOT NULL |
| `duration_minutes` | int | default 60, NOT NULL |
| `starts_on` | date | NOT NULL |
| `ends_on` | date | nullable |
| `is_active` | boolean | default true, NOT NULL |
| `created_at` | timestamptz | default `now()` |

Indexes: `coach_id`, `community_id`. RLS: Enabled.

#### `sessions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `template_id` | uuid | FK → session_templates.id, nullable |
| `venue` | text | NOT NULL |
| `capacity` | int | CHECK > 0, NOT NULL |
| `scheduled_at` | timestamptz | NOT NULL |
| `duration_minutes` | int | default 60, NOT NULL |
| `cancelled_at` | timestamptz | nullable |
| `cancellation_reason` | text | nullable |
| `court_number` | text | nullable |
| `created_at` | timestamptz | default `now()` |

Unique: `(template_id, scheduled_at)`. Indexes: `template_id`, `community_id`, `scheduled_at`. Trigger: `enforce_session_capacity`. RLS: Enabled.

#### `session_rsvps`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `session_id` | uuid | FK → sessions.id ON DELETE CASCADE, NOT NULL |
| `member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `rsvp_type` | text | CHECK: `confirmed`, `waitlisted`. NOT NULL |
| `waitlist_position` | int | nullable |
| `cancelled_at` | timestamptz | nullable |
| `created_at` | timestamptz | default `now()` |

Unique: `(session_id, member_id)`. Indexes: `session_id`, `member_id`. RLS: Enabled.

#### `session_coaches`

| Column | Type | Constraints |
|--------|------|-------------|
| `session_id` | uuid | FK → sessions.id ON DELETE CASCADE, NOT NULL |
| `member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `is_primary` | boolean | default false, NOT NULL |

PK: `(session_id, member_id)`. RLS: Enabled.

#### `session_invitations`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `template_id` | uuid | FK → session_templates.id ON DELETE CASCADE, NOT NULL |
| `member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `created_at` | timestamptz | default `now()` |

Unique: `(template_id, member_id)`. Indexes: `template_id`, `member_id`. RLS: Enabled.

#### `player_profiles`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, nullable (null = global profile) |
| `user_id` | uuid | FK → auth.users.id ON DELETE CASCADE, NOT NULL |
| `display_name` | text | nullable |
| `phone` | text | nullable |
| `bio` | text | nullable |
| `avatar_url` | text | nullable |
| `self_skill_level` | text | CHECK: `beginner`, `intermediate`, `advanced`. nullable |
| `utr` | numeric(5,2) | nullable (Universal Tennis Rating) |
| `coaching_bio` | text | nullable |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

Unique: `(community_id, user_id)` when community_id NOT NULL. Unique index: `player_profiles_global_unique ON (user_id) WHERE community_id IS NULL`. RLS: Enabled.

#### `coach_assessments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `subject_member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `coach_member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `skill_level` | text | CHECK: `beginner`, `intermediate`, `advanced`. NOT NULL |
| `assessed_at` | timestamptz | default `now()` |

Unique: `(community_id, subject_member_id, coach_member_id)`. RLS: Enabled.

#### `progress_notes`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `session_id` | uuid | FK → sessions.id ON DELETE CASCADE, NOT NULL |
| `subject_member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `coach_member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `note_text` | text | NOT NULL |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

Unique: `(session_id, subject_member_id, coach_member_id)`. RLS: Enabled.

#### `events`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `created_by` | uuid | FK → community_members.id, NOT NULL |
| `event_type` | text | CHECK: `tournament`, `social`, `open_session`. NOT NULL |
| `title` | text | NOT NULL |
| `description` | text | nullable |
| `venue` | text | NOT NULL |
| `starts_at` | timestamptz | NOT NULL |
| `duration_minutes` | int | nullable |
| `capacity` | int | CHECK > 0, nullable |
| `is_official` | boolean | default false, NOT NULL |
| `draw_image_url` | text | nullable |
| `cancelled_at` | timestamptz | nullable |
| `created_at` | timestamptz | default `now()` |

Indexes: `(community_id, starts_at)`. RLS: Enabled.

#### `event_rsvps`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `event_id` | uuid | FK → events.id ON DELETE CASCADE, NOT NULL |
| `member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `rsvp_type` | text | default `confirmed`, CHECK: `confirmed`, `waitlisted`. NOT NULL |
| `waitlist_position` | int | nullable |
| `cancelled_at` | timestamptz | nullable |
| `created_at` | timestamptz | default `now()` |

Unique: `(event_id, member_id)`. Indexes: `event_id`, `member_id`. RLS: Enabled.

#### `announcements`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `created_by` | uuid | FK → community_members.id, NOT NULL |
| `title` | text | NOT NULL |
| `body` | text | NOT NULL |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

Indexes: `(community_id, created_at DESC)`. RLS: Enabled.

#### `notifications`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `notification_type` | text | CHECK: see types below. NOT NULL |
| `title` | text | NOT NULL |
| `body` | text | NOT NULL |
| `metadata` | jsonb | default `'{}'`, NOT NULL |
| `read_at` | timestamptz | nullable |
| `created_at` | timestamptz | default `now()` |

Notification types: `session_reminder`, `announcement`, `rsvp_confirmed`, `waitlist_promoted`, `event_updated`, `session_updated`, `session_cancelled`, `rsvp_cancelled`, `join_approved`, `join_rejected`.

Indexes: `(member_id, created_at DESC)`, `community_id`, unread index `(member_id) WHERE read_at IS NULL`. Unique: `(member_id, notification_type, metadata->>'session_id') WHERE notification_type = 'session_reminder'`. Realtime: Published. RLS: Enabled (authenticated read own, service_role insert).

#### `join_requests`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `user_id` | uuid | FK → auth.users.id ON DELETE CASCADE, NOT NULL |
| `status` | text | default `pending`, CHECK: `pending`, `approved`, `rejected`. NOT NULL |
| `created_at` | timestamptz | default `now()` |
| `resolved_at` | timestamptz | nullable |
| `resolved_by` | uuid | FK → auth.users.id, nullable |

Unique index: `(community_id, user_id) WHERE status = 'pending'`. RLS: Enabled.

#### `chatrooms`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `community_id` | uuid | FK → communities.id ON DELETE CASCADE, NOT NULL |
| `name` | text | NOT NULL |
| `created_by` | uuid | FK → community_members.id ON DELETE SET NULL, nullable |
| `created_at` | timestamptz | default `now()` |

Indexes: `community_id`. RLS: Enabled.

#### `chatroom_members`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `chatroom_id` | uuid | FK → chatrooms.id ON DELETE CASCADE, NOT NULL |
| `member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `role` | text | `'manager'` or `'member'` |
| `joined_at` | timestamptz | default `now()` |

Unique: `(chatroom_id, member_id)`. Indexes: `chatroom_id`, `member_id`. RLS: Enabled.

#### `chat_messages`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `chatroom_id` | uuid | FK → chatrooms.id ON DELETE CASCADE, NOT NULL |
| `sender_id` | uuid | FK → community_members.id ON DELETE SET NULL, nullable |
| `content` | text | nullable |
| `image_url` | text | nullable |
| `created_at` | timestamptz | default `now()` |

Constraint: `content IS NOT NULL OR image_url IS NOT NULL`. Indexes: `(chatroom_id, created_at DESC)`. Realtime: Published. RLS: Enabled.

#### `chat_read_cursors`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `chatroom_id` | uuid | FK → chatrooms.id ON DELETE CASCADE, NOT NULL |
| `member_id` | uuid | FK → community_members.id ON DELETE CASCADE, NOT NULL |
| `last_read_at` | timestamptz | default `now()`, NOT NULL |

Unique: `(chatroom_id, member_id)`. Indexes: `member_id`. RLS: Enabled.

### Storage Buckets

| Bucket | Access | Path Pattern | Notes |
|--------|--------|--------------|-------|
| `avatars` | Public read, auth write to own path | `avatars/{user_id}/{filename}` | Profile photos |
| `event-draws` | Public read, auth write | — | Tournament draw images |
| `chat-media` | Public read, auth write | — | Chat photo messages, 10MB limit |

### RLS Architecture

All tables have RLS enabled. Key patterns:

- **Helper function:** `has_membership(p_community_id, p_role DEFAULT NULL)` — SECURITY DEFINER function that checks `community_members` directly, avoiding self-referential RLS recursion (error 42P17).
- **SELECT policies:** `EXISTS (SELECT 1 FROM community_members WHERE user_id = auth.uid() AND community_id = target.community_id)`
- **INSERT/UPDATE/DELETE:** Same membership check plus role verification in WITH CHECK clause.
- **Notifications:** Authenticated users read own only; service_role inserts only.
- **Service client bypass:** Used for invite processing, notification creation, cron jobs, and cross-community queries.

### Database Functions

| Function | Purpose |
|----------|---------|
| `generate_sessions_from_templates(...)` | RPC: generates session instances from a template for a date range |
| `has_membership(community_id, role?)` | SECURITY DEFINER: checks membership without RLS recursion |
| `enforce_session_capacity` | Trigger: prevents confirmed RSVPs beyond capacity |

### Migrations

| File | Content |
|------|---------|
| `00001_foundation_schema.sql` | Communities, members, invites, RLS, custom hook |
| `00002_session_schema.sql` | Sessions, templates, RSVPs, coaches |
| `00003_session_invitations.sql` | Private session invitations |
| `00004_player_profiles.sql` | Profiles, assessments, notes |
| `00005_events_schema.sql` | Events, event RSVPs, announcements |
| `00006_notifications_schema.sql` | Notifications + Realtime |
| `00007_atomic_rsvp_rpc.sql` | Atomic RSVP function |
| `00008_coach_client_assignments.sql` | Coach-client junction table |
| `00009_phase8_community_selector.sql` | Membership-based RLS rewrite |
| `00010_phase8_uat_fixes.sql` | RLS fixes for multi-community |
| `00011_chat_schema.sql` | Chat tables + Realtime |

---

## 6. API / Server Actions

All server actions are in `src/lib/actions/` and use the `'use server'` directive. They return structured `{ success, data?, error? }` results unless otherwise noted.

### Auth (`src/lib/actions/auth.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `login` | `(prevState, formData) → AuthFormState` | Email/password login. Validates with `LoginSchema`. Handles invite token. Redirects to `/communities`. |
| `signup` | `(prevState, formData) → AuthFormState` | Email/password signup. Validates with `SignUpSchema`. Returns success with email verification message. |

### Communities (`src/lib/actions/communities.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `getUserCommunities` | `() → {community, role, memberId}[]` | Fetch all communities user belongs to. |
| `getCommunityBySlug` | `(slug) → Community` | Lookup community by slug. |
| `createCommunity` | `(name, description?) → {id, slug}` | Create community. Auto-generates slug (handles collisions). Creator becomes admin. Uses service client. |
| `requestToJoin` | `(communityId) → result` | Create pending join request. Checks not already member. |
| `cancelJoinRequest` | `(requestId) → result` | Cancel own pending request. |
| `approveJoinRequest` | `(requestId, communitySlug) → result` | Admin/coach approves request. Creates member row (client role). Auto-copies global profile. Sends `join_approved` notification. |
| `rejectJoinRequest` | `(requestId, communitySlug) → result` | Admin/coach rejects request. Updates status to `rejected`. |
| `getPendingRequests` | `(communityId) → {id, user_id, created_at, display_name, avatar_url}[]` | Fetch pending join requests with profile info. |
| `getBrowseCommunities` | `() → Community[]` | Communities user hasn't joined (with member counts). |

### Members (`src/lib/actions/members.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `updateMemberRole` | `(communityId, communitySlug, memberId, newRole) → result` | Admin updates member role. |
| `processInviteSignup` | `(userId, inviteToken) → result` | Process invite link after email verification. Creates membership with invite's role. Creates coach_client_assignments if client. Uses service client. |
| `removeMember` | `(communityId, communitySlug, memberId) → result` | Admin removes member from community. |
| `assignCoachToClient` | `(communityId, communitySlug, clientMemberId) → result` | Coach/admin assigns client to themselves. |
| `removeCoachFromClient` | `(communityId, communitySlug, clientMemberId) → result` | Coach/admin unassigns client. |
| `joinCommunityAsClient` | `(communityId) → result` | Open sign-up: user joins as client directly. |

### Sessions (`src/lib/actions/sessions.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `createSessionTemplate` | `(communityId, communitySlug, prevState, formData) → SessionActionResult` | Coach creates recurring template. Validates invited clients are assigned. Calls `generate_sessions_from_templates` RPC. Assigns co-coaches. Creates session_invitations. |
| `editSession` | `(communityId, communitySlug, sessionId, scope:'this'\|'future', formData) → SessionActionResult` | Edit single session or all future. Recalculates `scheduled_at` for time changes (Sydney timezone). Notifies RSVP'd members. |
| `cancelSession` | `(communityId, communitySlug, sessionId, formData) → SessionActionResult` | Cancel session with reason. Notifies active RSVPs. Cascade-cancels all RSVPs. |

### RSVPs (`src/lib/actions/rsvps.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `rsvpSession` | `(communityId, communitySlug, sessionId) → RsvpActionResult` | RSVP to session. Auto-confirm or waitlist based on capacity. Verifies client is invited to template. Reactivates cancelled RSVP if exists. Notifies coaches. |
| `cancelRsvp` | `(communityId, communitySlug, sessionId) → SessionActionResult` | Cancel own session RSVP. Resequences waitlist. Notifies coaches. |
| `promoteFromWaitlist` | `(communityId, communitySlug, rsvpId) → SessionActionResult` | Coach promotes waitlisted member to confirmed. Checks capacity. Resequences remaining waitlist. |
| `removeFromWaitlist` | `(communityId, communitySlug, rsvpId) → SessionActionResult` | Coach removes waitlisted member. Resequences waitlist. |

### Events (`src/lib/actions/events.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `createEvent` | `(communityId, communitySlug, prevState, formData) → EventActionResult` | Create event. `is_official` derived from role. Converts Sydney local time to UTC. |
| `rsvpEvent` | `(communityId, communitySlug, eventId) → EventRsvpActionResult` | RSVP to event. Confirmed or waitlisted based on capacity. Reactivates cancelled RSVP. |
| `cancelEventRsvp` | `(communityId, communitySlug, eventId) → EventRsvpActionResult` | Cancel event RSVP. Auto-promotes first waitlisted member. |
| `updateEvent` | `(communityId, communitySlug, eventId, prevState, formData) → EventActionResult` | Update event (creator or admin). Notifies RSVPs. |
| `deleteEvent` | `(communityId, communitySlug, eventId) → EventActionResult` | Delete event (creator or admin). Notifies RSVPs. |

### Announcements (`src/lib/actions/announcements.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `createAnnouncement` | `(communityId, communitySlug, prevState, formData) → AnnouncementActionResult` | Coach/admin creates announcement. Notifies all other members. |
| `updateAnnouncement` | `(communityId, communitySlug, announcementId, prevState, formData) → AnnouncementActionResult` | Update announcement (coach/admin). |
| `deleteAnnouncement` | `(communityId, communitySlug, announcementId) → AnnouncementActionResult` | Delete announcement (coach/admin). |

### Profiles (`src/lib/actions/profiles.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `getProfile` | `(communityId, userId?) → {profile, latestAssessment}` | Fetch player profile + latest coach assessment. Community-scoped. |
| `upsertProfile` | `(communityId\|null, input) → ProfileActionResult` | Create/update profile. `null` communityId = global profile. Syncs display_name to community_members. |
| `setCoachAssessment` | `(communityId, communitySlug, input) → ProfileActionResult` | Coach sets skill assessment for a player. |
| `addProgressNote` | `(communityId, communitySlug, input) → ProfileActionResult` | Coach adds progress note for session attendee. |
| `updateProgressNote` | `(communityId, communitySlug, noteId, noteText) → ProfileActionResult` | Update existing progress note. |
| `getLessonHistory` | `(communityId, memberId, limit?, offset?) → {entries, summary}` | Paginated lesson history with coaches and notes per session. |

### Chat (`src/lib/actions/chat.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `createChatRoom` | `(communityId, communitySlug, name, memberIds) → {chatroomId}` | Create room. Creator becomes manager. Initializes read cursors. |
| `renameChatRoom` | `(communitySlug, chatroomId, newName) → result` | Rename room (manager only via RLS). |
| `toggleChatRoomManager` | `(communitySlug, chatroomId, memberId, makeManager) → result` | Toggle member's manager status. |
| `addChatRoomMembers` | `(communitySlug, chatroomId, memberIds) → result` | Add members to room (manager only). |
| `removeChatRoomMember` | `(communitySlug, chatroomId, memberId) → result` | Remove member from room (manager only, no self-removal). |
| `sendMessage` | `(chatroomId, content, imageUrl) → {message}` | Send text or image message. |
| `getChatRoomMessages` | `(chatroomId, before?, limit?) → {messages}` | Paginated message history (50 per page). |
| `updateReadCursor` | `(chatroomId) → result` | Update read position for unread tracking. |
| `getTotalUnreadChatCount` | `(communityId) → number` | Sum of unread messages across all chatrooms. |
| `getChatRooms` | `(communityId) → {chatrooms}` | All rooms with member count, last message, unread count. |
| `getChatRoomDetails` | `(chatroomId) → {chatroom, members}` | Room details with enriched member list. |
| `getCommunityMembersForPicker` | `(communityId) → {members}` | All members for chat creation picker. |

### Session Invitations (`src/lib/actions/invitations.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `addInvitation` | `(communityId, communitySlug, templateId, memberId) → SessionActionResult` | Coach/admin adds a client to a session template's invitation list. |
| `removeInvitation` | `(communityId, communitySlug, templateId, memberId) → SessionActionResult` | Coach/admin removes a client from a session template's invitation list. |

### Invites (`src/lib/actions/invites.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `createInviteLink` | `(communityId, communitySlug, role) → {data: InviteLink}` | Create invite link. Admins can create coach invites; coaches can create client invites. |
| `revokeInviteLink` | `(communityId, communitySlug, inviteLinkId) → result` | Revoke invite link (sets `revoked_at`). |

### Notifications (`src/lib/actions/notifications.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `markAllNotificationsRead` | `(communityId, communitySlug) → NotificationActionResult` | Mark all unread as read for current member. |
| `markNotificationRead` | `(communityId, communitySlug, notificationId) → NotificationActionResult` | Mark single notification as read. Verifies ownership. |

### API Route

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/cron/session-reminders` | GET | Cron job: finds sessions 24–25h from now, creates `session_reminder` notifications for confirmed RSVPs. Requires `CRON_SECRET` header. Uses service-role client. Idempotent via unique index. |

---

## 7. Tech Stack & Architecture

### Core Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.2 |
| UI Library | React | 19.2.4 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| Database & Auth | Supabase | Client SDK 2.101.1 |
| SSR Support | @supabase/ssr | 0.10.0 |
| Hosting | Vercel | — |
| Runtime | Node.js | 25.x |

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Database client, auth, storage, realtime |
| `@supabase/ssr` | Server-side rendering with cookie-based sessions |
| `class-variance-authority` | Component variant management (CVA) |
| `lucide-react` | Icon library |
| `sonner` | Toast notifications |
| `zod` | Runtime schema validation |
| `@base-ui-components/react` | Accessible UI primitives (dialog, tabs, select) |

### Folder Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes (cron)
│   ├── auth/                     # Login/signup pages
│   ├── c/[slug]/                 # Community-scoped pages
│   │   ├── admin/                # Admin dashboard
│   │   ├── coach/                # Coach pages (dashboard, schedule, clients)
│   │   ├── sessions/             # Client session views
│   │   ├── events/               # Event pages
│   │   ├── chat/                 # Chat rooms
│   │   ├── members/              # Member profiles
│   │   └── notifications/        # Notification feed
│   ├── communities/              # Community browser
│   ├── invite/                   # Invite processing
│   ├── profile/                  # Profile setup/view
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Design tokens & global styles
│   └── page.tsx                  # Root redirect
├── components/                   # React components
│   ├── auth/                     # Auth forms
│   ├── calendar/                 # Calendar UI
│   ├── chat/                     # Chat components
│   ├── communities/              # Community cards
│   ├── dashboard/                # Dashboard layouts
│   ├── events/                   # Event components
│   ├── members/                  # Member cards
│   ├── nav/                      # Navigation (AppNav)
│   ├── notifications/            # Notification feed
│   ├── profile/                  # Profile components
│   ├── sessions/                 # Session components
│   ├── ui/                       # Shared UI primitives (button, badge, dialog, etc.)
│   └── welcome/                  # Welcome page
├── lib/
│   ├── actions/                  # Server actions (use server)
│   ├── constants/                # App constants (event colors)
│   ├── context/                  # React context (CommunityProvider)
│   ├── supabase/                 # Supabase clients & middleware
│   ├── types/                    # TypeScript interfaces
│   ├── utils/                    # Utilities (timezone, dates)
│   └── validations/              # Zod schemas
├── proxy.ts                      # Next.js middleware entry
└── __tests__/                    # Tests (actions, RLS audit)
```

### Data Flow Patterns

1. **Server Components (default)** — Pages fetch data server-side via Supabase server client, pass to client components as props.
2. **Server Actions** — Form submissions and mutations use `'use server'` actions with structured return types.
3. **Client Components** — Interactive elements (forms, chat, RSVP buttons) use `'use client'` with `useActionState` for form handling.
4. **Realtime** — Chat messages and notifications use Supabase Realtime subscriptions in client components.
5. **Service Client** — Background operations (cron, invite processing, cross-community queries) bypass RLS with service-role key.

### Supabase Client Architecture

| Client | File | Key | Used By |
|--------|------|-----|---------|
| Browser | `src/lib/supabase/client.ts` | Anon key | `'use client'` components |
| Server | `src/lib/supabase/server.ts` | Anon key + cookies | Server components, server actions |
| Service | `src/lib/supabase/server.ts` / `service.ts` | Service-role key | Cron jobs, invite processing, notifications |

### Middleware Chain

`src/proxy.ts` → `src/lib/supabase/middleware.ts` (updateSession)

The middleware runs on every request (except static assets) and implements a step-by-step routing flow:
1. Validate JWT via `supabase.auth.getUser()` (not `getSession()`)
2. Check email verification
3. Check profile existence → redirect to `/profile/setup` if missing
4. Check community membership for `/c/[slug]/*` routes
5. Enforce role-based route access

---

## 8. Auth Flow

### Sign Up (New User)

```
User fills email + password on /auth
  → signup() server action validates with SignUpSchema
  → supabase.auth.signUp() with emailRedirectTo = /auth/confirm?invite=TOKEN
  → Supabase sends verification email
  → UI shows "Check your email" message

User clicks email link
  → GET /auth/confirm?token_hash=...&type=email&invite=TOKEN
  → supabase.auth.verifyOtp({ token_hash, type })
  → If invite token present: processInviteSignup(userId, token)
      → Service client looks up invite_links by token
      → Creates community_members row with invite's role
      → Creates coach_client_assignments if client role
  → Redirect to /communities
```

### Login (Existing User)

```
User fills email + password on /auth
  → login() server action validates with LoginSchema
  → supabase.auth.signInWithPassword()
  → If invite token in formData: processInviteSignup()
  → Redirect to /communities
```

### Invite Link Flow

```
Coach/admin creates invite link
  → createInviteLink(communityId, slug, role)
  → Returns URL with ?invite=TOKEN

User receives link, visits /auth?invite=TOKEN
  → Token stored in hidden form field
  → User signs up or logs in (token preserved through flow)
  → After email verification: processInviteSignup() creates membership
  → Redirect to community based on role
```

### Open Sign-Up Flow (No Invite)

```
User signs up without invite
  → Email verification
  → Redirect to /profile/setup (global profile, community_id = null)
  → User creates profile
  → Redirect to /communities
  → User browses communities
  → requestToJoin(communityId) or joinCommunityAsClient(communityId)
  → If request: admin/coach approves → auto-copies global profile to community-specific
  → User redirected to community dashboard
```

### Session Management

- JWT validated server-side on every request via middleware (`getUser()`, not `getSession()`)
- Cookies managed by `@supabase/ssr` package
- Role determined by querying `community_members` table (not JWT claims)
- No JWT custom claims — all authorization is membership-based RLS

---

## 9. UI & Design System

### Color Palette

#### Light Theme

| Token | Hex | Role |
|-------|-----|------|
| `--background` | `#FEFCF6` | Warm off-white page background |
| `--foreground` | `#0C0A09` | Dark brown primary text |
| `--card` | `#FFFFFF` | Card surfaces |
| `--card-foreground` | `#1C1917` | Card text |
| `--primary` | `#1B4332` | Tennis green — buttons, links, active states |
| `--primary-foreground` | `#FEFCF6` | Text on primary |
| `--secondary` | `#E8F0E8` | Light green tint |
| `--secondary-foreground` | `#1B4332` | Text on secondary |
| `--muted` | `#F0F4F0` | Subtle backgrounds |
| `--muted-foreground` | `#57726B` | Muted text (greenish gray) |
| `--accent` | `#C9A84C` | Warm gold — premium/featured elements |
| `--accent-foreground` | `#1C1917` | Text on accent |
| `--destructive` | `#DC2626` | Error red |
| `--border` | `#D4DDD4` | Subtle borders |
| `--input` | `#D4DDD4` | Input borders |
| `--ring` | `#1B4332` | Focus ring |

#### Dark Theme

| Token | Hex | Role |
|-------|-----|------|
| `--background` | `#0C1A14` | Dark green background |
| `--foreground` | `#F0F4F0` | Light text |
| `--card` | `#152820` | Dark card surface |
| `--primary` | `#52B788` | Lighter green |
| `--accent` | `#D4B85C` | Brighter gold |
| `--border` | `rgba(255,255,255,0.1)` | Subtle border |

#### Shadows

```css
--shadow-card: 0 1px 3px rgba(27,67,50,0.04), 0 4px 12px rgba(27,67,50,0.03);
--shadow-card-hover: 0 2px 8px rgba(27,67,50,0.08), 0 12px 40px rgba(27,67,50,0.06);
```

#### Stat/Chart Colors

```css
--stat-1: #1B4332    --stat-2: #2D6A4F    --stat-3: #C9A84C    --stat-4: #40916C
```

#### Role Badge Colors

| Role | Classes |
|------|---------|
| Admin | `bg-amber-100 text-amber-800` |
| Coach | `bg-blue-100 text-blue-800` |
| Client | `bg-emerald-100 text-emerald-800` |

#### Event Type Colors

| Type | Border | Badge |
|------|--------|-------|
| Tournament | `border-l-blue-500` | Blue scheme |
| Social | `border-l-[#c8e030]` | Lime scheme |
| Open Session | `border-l-orange-500` | Orange scheme |

### Typography

#### Font Families

| Token | Stack | Usage |
|-------|-------|-------|
| `--font-cormorant` | Cormorant Garamond, Georgia, serif | Headings (`font-heading`) |
| `--font-montserrat` | Montserrat, ui-sans-serif, system-ui, sans-serif | Body text (default) |
| `--font-mono` | Geist Mono, ui-monospace, monospace | Code (unused in UI) |

#### Font Weights

- Cormorant Garamond: 400, 500, 600, 700
- Montserrat: 300, 400, 500, 600, 700

#### Type Scale

| Usage | Classes |
|-------|---------|
| Display/hero | `text-2xl font-bold font-heading` |
| Section title | `text-base font-bold font-heading` |
| Body | `text-sm` |
| Small/meta | `text-xs` |
| Micro (badges, timestamps) | `text-[10px]` |
| Stat value | `text-2xl font-bold font-heading` |
| Stat label | `text-[10px] uppercase tracking-wide` |

### Component Patterns

#### Buttons (`src/components/ui/button.tsx`)

Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`.
Sizes: `xs` (h-6), `sm` (h-7), `default` (h-8), `lg` (h-9), `icon` (size-8), `icon-xs` (size-6), `icon-sm` (size-7), `icon-lg` (size-9).

Base: `rounded-lg`, `active:scale-[0.97] transition-all`, `disabled:opacity-50`.

#### Badges (`src/components/ui/badge.tsx`)

Variants: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`.
Base: `h-5 px-2 py-0.5 rounded-4xl text-xs font-medium`.

#### Cards

Common pattern: `bg-card rounded-2xl border border-border/50 p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98] transition-all duration-200`.

Event cards add a left accent border: `border-l-[3px]` colored by event type.

#### Dialogs (`src/components/ui/dialog.tsx`)

Overlay: `bg-black/10 backdrop-blur-xs`.
Content: `rounded-xl p-4 bg-popover ring-1 ring-foreground/10`.
Animation: Fade + zoom with `data-open`/`data-closed` states.

#### Tabs (`src/components/ui/tabs.tsx`)

Two variants: `default` (background tabs) and `line` (underline indicator).
Active: Background color + shadow (default) or underline via `after:` pseudo-element (line).

#### Inputs (`src/components/ui/input.tsx`)

Base: `h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base`.
Focus: `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`.
Invalid: `aria-invalid:border-destructive`.

#### Avatars (`src/components/ui/avatar.tsx`)

Sizes: `sm` (size-6), `default` (size-8), `lg` (size-10).
Shape: `rounded-full`. Groups use `-space-x-2` with `ring-2 ring-background`.

#### Bottom Navigation (`src/components/nav/AppNav.tsx`)

Fixed: `fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border h-16`.
Safe area: `pb-[env(safe-area-inset-bottom)]`.
Active tab icon: `bg-primary text-primary-foreground shadow-md shadow-primary/25 rounded-xl`.
Inactive: `text-muted-foreground`.
Badge (unread): Lime `#c8e030` circle, `absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold`.

### Layout Patterns

| Pattern | Classes |
|---------|---------|
| Page padding | `px-5 pt-14 pb-24` (accommodates bottom nav) |
| Max width | `max-w-[640px] mx-auto` |
| Section gap | `gap-3` to `gap-6` |
| Stats grid | `grid grid-cols-3 gap-3` |
| Card list | `flex flex-col gap-3` |
| Card padding | `p-4` |

**Responsive:** Mobile-first design. No tablet/desktop breakpoints beyond max-width centering. Hidden scrollbars via `.scrollbar-hide`.

### Animations & Effects

#### Keyframe Animations

| Name | Duration | Usage |
|------|----------|-------|
| `fade-in-up` | 0.35s ease-out | Dashboard cards with staggered delays |
| `shimmer` | 1.5s infinite | Loading skeletons |
| `pulse-slow` | 6s infinite | Ambient background effects |
| `gradient-shift` | 8s infinite | Background gradient animation |

#### Special Effects

**Gold Gradient Text:**
```css
.text-gradient-gold {
  background: linear-gradient(135deg, #C9A84C 0%, #E8D48B 50%, #C9A84C 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

**Court Pattern Background:**
```css
.court-pattern {
  background-image:
    linear-gradient(rgba(27,67,50,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(27,67,50,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

**Glassmorphic Navigation:** `backdrop-blur-xl` on `bg-card/80`.

**Reduced Motion:** All custom animations respect `prefers-reduced-motion: reduce` (set to `animation: none`).

### Radius Scale

```
--radius: 0.625rem (10px)
--radius-sm: ~6px    --radius-md: ~8px    --radius-lg: 10px
--radius-xl: ~14px   --radius-2xl: ~11px  --radius-3xl: ~14px   --radius-4xl: ~16px
```

### Design Reference

The design reference at `.planning/DESIGN-REF.md` documents the AceHub visual direction. The current implementation diverges in:
- **Fonts:** Cormorant Garamond + Montserrat (vs. AceHub's Space Grotesk + Inter)
- **Color tone:** More muted, premium earthy greens (vs. bright/sporty)
- **Card rounding:** 2xl/16px (vs. 3xl)
- **Overall feel:** Mature and professional (vs. young and sporty)

### Key UI Decisions

| Decision | Details |
|----------|---------|
| No red for cancel actions | Use Roland Garros orange (`--accent` or orange shades) instead of destructive red for cancel/remove actions |
| No browser dialogs | Never use `confirm()` / `alert()` — always use styled Dialog components |
| Grand Slam accent colors | Event type colors reference Grand Slam tournaments (blue, lime, orange) |
| `data-active` attribute | Use `data-active` not `data-[state=active]` for active states in custom components |
| Plain inputs for inline edit | Inline-edit fields use plain inputs (no border until focused) |
| Longest-match nav highlighting | Navigation active state uses longest prefix match for route highlighting |

---

## 10. Current Limitations / Known Gaps

### Auth & Onboarding
- **Invite links only work for logged-in users** — logged-out or new users clicking an invite link must complete the full signup/verification flow first; no streamlined "click and join" experience.
- **No password reset flow** — no forgot-password page or server action exists.
- **No OAuth/social login** — only email/password.

### Sessions
- **No session title on generated instances** — `sessions` table has no `title` column; title comes from the template relationship.
- **Recurring sessions depend on Supabase RPC** — `generate_sessions_from_templates` runs on template creation but there's no automated re-generation cron for long-running templates.
- **Edit scope limited to "this" or "future"** — no "all" (including past) edit option.

### Community Management
- **`community_members.coach_id` is deprecated but still exists** — replaced by `coach_client_assignments` junction table, but the column hasn't been dropped.
- **`community_members` has no `created_at` or `avatar_url`** — use `joined_at` for membership date; avatar comes from `player_profiles`.

### Data Model
- **Several FKs were missing `ON DELETE CASCADE`** — fixed in migration 00010 but some edge cases may remain.
- **No soft-delete for members** — `removeMember` hard-deletes the `community_members` row.
- **`coach_id` on `community_members` is deprecated** — still present in schema.

### Payments
- **No payment processing** — explicitly deferred from MVP.

### Notifications
- **Session reminders require cron job** — must be configured externally (Vercel Cron).
- **No push notifications** — web-only, no service worker or push API integration.
- **No email notifications** — all notifications are in-app only.

### Chat
- **No typing indicators** — messages appear on send only.
- **No message editing or deletion** — messages are immutable once sent.
- **No read receipts** — only unread count tracking, not per-message read status.

### Profiles
- **Schema push via SQL Editor** — migrations are applied manually, not via Supabase CLI.

### UI & Design
- **Mobile-only layout** — no dedicated tablet or desktop breakpoints (content centered with max-width).
- **Dark mode defined but not actively toggled** — CSS variables exist but no theme toggle in UI.
- **No skeleton loading for all pages** — some pages have loading.tsx, some don't.

### Testing
- **Limited test coverage** — `src/__tests__/` contains some action tests and RLS audit tests but no comprehensive suite.
- **No E2E tests** — no Playwright/Cypress setup.

### Timezone
- **Hardcoded to Sydney (Australia/Sydney)** — all time handling assumes AEST/AEDT. Not configurable per community.
