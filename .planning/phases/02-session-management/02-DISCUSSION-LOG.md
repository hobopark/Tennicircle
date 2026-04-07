# Phase 2: Session Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 02-session-management
**Areas discussed:** Session creation UX, Schedule & calendar view, RSVP & waitlist flow, Session detail & editing

---

## Session creation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Simple form | Single-page form: day of week, time, venue, capacity, recurrence | ✓ |
| Step-by-step wizard | Multi-step flow: Basic info → Recurrence → Capacity → Review | |
| You decide | Claude picks the approach | |

**User's choice:** Simple form
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Weekly only | Pick a day + time, repeats every week | ✓ |
| Weekly + biweekly | Add every 2 weeks option | |
| Flexible recurrence | Weekly, biweekly, monthly, custom days | |

**User's choice:** Weekly only
**Notes:** Covers 90% of Jaden's use case

---

| Option | Description | Selected |
|--------|-------------|----------|
| 4 weeks ahead | Rolling 4-week window | |
| 8 weeks ahead | Two months of visibility | |
| Coach sets the range | Coach picks start/end dates or number of weeks | ✓ |

**User's choice:** Coach sets the range
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Free text field | Coach types venue name, no autocomplete | |
| Predefined venue list | Admin creates venues, coaches pick from dropdown | |
| Free text with suggestions | Coach types, previously used venues autocomplete | ✓ |

**User's choice:** Free text with suggestions
**Notes:** None

---

**Additional input:** Court number should be adjustable anytime before the lesson (same-day edits). Coaches often don't know the court until they arrive.

---

## Schedule & calendar view

| Option | Description | Selected |
|--------|-------------|----------|
| Weekly calendar grid | Traditional calendar with time slots on Y-axis, days on X-axis | ✓ |
| List view by day | Vertical list grouped by date | |
| Card grid by day | Session cards in a day-by-day layout | |

**User's choice:** Weekly calendar grid (for coaches)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Same calendar as coaches | Weekly grid filtered to assigned coach sessions | |
| Simplified list view | List of upcoming joinable sessions | |
| Card-based upcoming sessions | Session cards with RSVP buttons | ✓ |

**User's choice:** Card-based upcoming sessions (for clients)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Assigned coach(es) only | Sessions from coach who invited them | ✓ |
| All community sessions | Sessions from any coach | |
| Assigned by default, browse all | Default assigned, toggle for all | |

**User's choice:** Assigned coach(es) only
**Notes:** Matches coach-scoped relationship model from Phase 1

---

| Option | Description | Selected |
|--------|-------------|----------|
| Essential only | Date, time, venue, coach name, spots remaining | |
| Essential + attendees | Above plus preview of who else is going | ✓ |
| Rich cards | All above plus session type, duration, coach notes | |

**User's choice:** Essential + attendees
**Notes:** None

---

## RSVP & waitlist flow

| Option | Description | Selected |
|--------|-------------|----------|
| One-tap RSVP on card | Single button, no confirmation | |
| RSVP with confirmation | Tap RSVP, see confirmation dialog, then confirm | ✓ |
| RSVP from detail page | Open detail page first, then RSVP | |

**User's choice:** RSVP with confirmation
**Notes:** Prevents accidental RSVPs

---

| Option | Description | Selected |
|--------|-------------|----------|
| Join waitlist button | Button changes to "Join Waitlist" with position shown | ✓ |
| Full indicator only | "Session Full" badge, no waitlist from client side | |
| Waitlist + notification | Join waitlist with "you'll be notified" note | |

**User's choice:** Join waitlist button
**Notes:** Client sees their position (e.g. "3rd on waitlist")

---

| Option | Description | Selected |
|--------|-------------|----------|
| Cancel anytime, no restriction | Cancel at any point before session | ✓ (modified) |
| Cancel with cutoff warning | Warning if within X hours | |
| Cancel with coach-set cutoff | Coach sets cancellation deadline | |

**User's choice:** Cancel anytime with courtesy prompt
**Notes:** User specified: cancel anytime, no hard block, but prompt reminding client to discuss cancellations with their coach. Most clients are regulars with recurring bookings — cancellation should be pre-discussed with coach.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Manual promotion only | Coach decides who gets freed spot | ✓ |
| Auto-promote first in queue | First waitlisted person auto-gets spot | |
| Coach chooses within 24h, then auto | Coach window then auto-promote | |

**User's choice:** Manual promotion only
**Notes:** Aligns with PROJECT.md decision: "Coaches know their players; auto-promote could cause issues"

---

## Session detail & editing

| Option | Description | Selected |
|--------|-------------|----------|
| Edit this instance only | Changes to single session, template unaffected | |
| Edit this and future | Changes to this and all future instances | |
| Ask every time | Coach chooses: "This only" or "This and future" | ✓ |

**User's choice:** Ask every time (Google Calendar style)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Attendee list + edit button | Confirmed, waitlist, edit button | ✓ |
| Full dashboard view | Attendees, notes area, attendance history | |
| You decide | Claude picks based on requirements | |

**User's choice:** Attendee list + edit button
**Notes:** Focused on management for MVP

---

| Option | Description | Selected |
|--------|-------------|----------|
| Template creator adds co-coaches | Coach adds co-coaches when creating/editing | ✓ |
| Admin assigns coaches | Only admin assigns multiple coaches | |
| Any coach can join | Coaches self-assign to sessions | |

**User's choice:** Template creator adds co-coaches
**Notes:** Co-coaches see the session on their schedule

---

| Option | Description | Selected |
|--------|-------------|----------|
| Cancel with notification | Cancel, clients see "Cancelled" | |
| Cancel silently | Session disappears | |
| Cancel with reason | Cancel with reason displayed on card | ✓ |

**User's choice:** Cancel with reason
**Notes:** Reason displayed on cancelled session card (e.g. "Rain", "Public holiday")

---

## Claude's Discretion

- Loading states and skeleton designs
- Calendar grid component implementation
- Session card layout details
- Waitlist position display format
- Attendee preview implementation
- Empty state designs
- Form validation patterns (follow Phase 1 Zod 4 + useActionState)

## Deferred Ideas

None — discussion stayed within phase scope.
