# Phase 4: Coach Dashboard & Community Events - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 04-coach-dashboard-community-events
**Areas discussed:** Coach dashboard enhancements, Event types & creation flow, Event discovery & navigation, Announcements & draws, Client dashboard UX

---

## Coach Dashboard Enhancements

| Option | Description | Selected |
|--------|-------------|----------|
| Daily + weekly toggle | Add day view alongside existing week view. Day shows time blocks with attendee counts. | :heavy_check_mark: |
| Weekly only with summary cards | Keep week grid, add summary cards above. | |
| Full calendar (day/week/month) | Add day, week, and month views. | |

**User's choice:** Daily + weekly toggle
**Notes:** None

### Player Roster

| Option | Description | Selected |
|--------|-------------|----------|
| Attendance streak + rate | Total sessions, attendance rate %, streak, last attended. | |
| Session frequency heatmap | Visual heatmap of activity. | |
| Simple count + last seen | Total sessions and last session date. | |

**User's choice:** Other -- last attended date and first lesson date
**Notes:** User wants simple practical fields: last attended date and first lesson date.

### Inline Attendance Preview

| Option | Description | Selected |
|--------|-------------|----------|
| Yes -- inline preview | Today's sessions show confirmed/capacity and attendee names on dashboard card. | :heavy_check_mark: |
| No -- tap to see | Keep current tap-into-session flow. | |

**User's choice:** Yes -- inline preview
**Notes:** None

---

## Event Types & Creation Flow

### Creation Method

| Option | Description | Selected |
|--------|-------------|----------|
| Single form + type selector | One "Create Event" button, type picker first, form adapts. | :heavy_check_mark: |
| Separate buttons per type | Three distinct create buttons. | |

**User's choice:** Single form + type selector
**Notes:** None

### Permissions

| Option | Description | Selected |
|--------|-------------|----------|
| Any member | Matches roadmap: community-driven. | :heavy_check_mark: |
| Coaches and admin only | More curated. | |
| Coaches/admin + approved members | Middle ground with moderation. | |

**User's choice:** Any member
**Notes:** None

### Tournament Draws

| Option | Description | Selected |
|--------|-------------|----------|
| Image upload | Organiser uploads photo/image of bracket. | :heavy_check_mark: |
| Structured text list | Text field for match pairings. | |
| Built-in bracket builder | Interactive bracket UI. | |

**User's choice:** Image upload (for now)
**Notes:** User wants image upload for MVP but ultimately aims to build interactive bracket UI in later stages.

---

## Event Discovery & Navigation

### Nav Location

| Option | Description | Selected |
|--------|-------------|----------|
| New "Events" nav tab | Dedicated top-level nav item for all roles. | :heavy_check_mark: |
| Sub-tab under existing pages | Events within Sessions or Schedule page. | |
| Combined community hub | "Community" tab with events + announcements. | |

**User's choice:** New "Events" nav tab
**Notes:** None

### Official vs Community Separation

| Option | Description | Selected |
|--------|-------------|----------|
| Two tabs on events page | "Official" and "Community" tabs. Default to Official. | :heavy_check_mark: |
| Single list with badges | All events in one feed with "Official" badge. | |
| Two separate pages | Separate nav items for each. | |

**User's choice:** Two tabs on events page
**Notes:** None

---

## Announcements

| Option | Description | Selected |
|--------|-------------|----------|
| Banner on events page | Pinned cards at top of Official events tab. | :heavy_check_mark: |
| Dedicated announcements page | Separate /announcements page. | |
| Homepage/welcome banner | Show on landing page. | |

**User's choice:** Banner on events page
**Notes:** None

### Event Cards

| Option | Description | Selected |
|--------|-------------|----------|
| Type badge + title + date + spots | Badge, title, date/time, venue, spots, RSVP button. | :heavy_check_mark: |
| Rich preview with description | Above plus description preview and organiser name. | |
| Minimal -- title + date only | Title and date with tap-to-expand. | |

**User's choice:** Type badge + title + date + spots
**Notes:** None

---

## Client Dashboard UX

User raised concern that current client experience (bare calendar grid) feels too simple and sloppy. No later phase addresses this, so addressed in Phase 4.

### Dashboard Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Action-oriented home | Greeting + upcoming sessions + events + announcements as cards. | :heavy_check_mark: |
| Card feed with calendar toggle | Scrollable feed of cards with calendar as secondary. | |
| Keep calendar but polish | Upgrade existing calendar grid with additions. | |

**User's choice:** Action-oriented home
**Notes:** User selected the preview mockup showing sections for upcoming sessions, events, and announcements.

### Personalisation

| Option | Description | Selected |
|--------|-------------|----------|
| Name + stats | "Welcome back, [Name]" with sessions this month, upcoming RSVPs, member since. | :heavy_check_mark: |
| Name only | Just greeting header. | |
| No greeting | Straight to content. | |

**User's choice:** Name + stats
**Notes:** None

---

## Claude's Discretion

- Event form fields per type
- Event detail page layout
- Event RSVP flow (follow session pattern)
- Open session vs coaching session differentiation
- Empty states, loading states, mobile layouts
- Announcement card formatting

## Deferred Ideas

- Interactive bracket builder for tournaments -- future phase (user explicitly wants this eventually)
