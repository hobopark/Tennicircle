# Phase 6: Polish & Launch Readiness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 06-polish-launch-readiness
**Areas discussed:** Capacity & waitlist display, Calendar defaults & timezone, Race condition handling, RLS audit scope, UI fixes and improvements

---

## Capacity & Waitlist Display

### Spots remaining format

| Option | Description | Selected |
|--------|-------------|----------|
| Fraction format | Show '4/8 spots' with color coding: green (open), orange (>=75%), red (full) | ✓ |
| Countdown only | Show '4 spots left' — simpler, no total capacity shown | |
| Progress bar + number | Visual fill bar alongside '4/8' — most visual but takes more card space | |

**User's choice:** Fraction format
**Notes:** Color-coded by fill level for visual urgency

### Waitlist position display

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on card | Card shows 'Waitlisted — #3 in line' where RSVP button normally is | ✓ |
| Badge only, detail on tap | Card shows 'Waitlisted' badge, position only on detail page | |
| Position + estimate | Show position + rough estimate based on no-show rate | |

**User's choice:** Inline on card
**Notes:** Client always knows their position without tapping in

---

## Calendar Defaults & Timezone

### Calendar view switching

| Option | Description | Selected |
|--------|-------------|----------|
| Auto by breakpoint | Desktop defaults to week, mobile to day. Manual toggle available | |
| Auto only, no toggle | Strictly responsive, no manual override | |
| Always user choice | User picks view on first visit, persists in localStorage | ✓ |

**User's choice:** Always user choice
**Notes:** User preferred giving control to the user rather than auto-switching

### Timezone display

| Option | Description | Selected |
|--------|-------------|----------|
| Implicit AEST/AEDT | No label unless browser is different timezone, then show suffix | ✓ |
| Always show timezone | Every time displays with AEST/AEDT suffix | |
| User's local timezone | Convert all times to browser timezone | |

**User's choice:** Implicit AEST/AEDT
**Notes:** Clean for Sydney community; suffix only for travelers

---

## Race Condition Handling

### Database-level protection

| Option | Description | Selected |
|--------|-------------|----------|
| DB function with row lock | Supabase RPC with FOR UPDATE, atomic check+insert | ✓ |
| Check-then-insert with constraint | App checks capacity, unique constraint prevents duplicates | |
| Optimistic UI with server validation | Client assumes success, server rejects if over capacity | |

**User's choice:** DB function with row lock
**Notes:** Bulletproof, single round-trip

### Race condition UX

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-waitlist with toast | Silently add to waitlist, show toast notification | ✓ |
| Error with retry option | Show error, offer 'Join Waitlist' button | |
| Redirect to confirmation | Navigate to waitlist confirmation page | |

**User's choice:** Auto-waitlist with toast
**Notes:** Minimal friction for the user

---

## RLS Audit Scope

### Audit thoroughness

| Option | Description | Selected |
|--------|-------------|----------|
| Automated test suite | Write RLS tests, run as part of build, catches regressions | ✓ |
| Manual review + checklist | Document and manually verify in Supabase dashboard | |
| Both automated + manual | Automated tests plus one-time manual audit with report | |

**User's choice:** Automated test suite
**Notes:** Regression prevention going forward

### Handling gaps

| Option | Description | Selected |
|--------|-------------|----------|
| Fix immediately, block launch | Any table without RLS is a launch blocker | ✓ |
| Fix critical, track rest | Fix user data tables, track low-risk as follow-up | |
| Enable RLS on all, refine later | Deny by default, refine permissions over time | |

**User's choice:** Fix immediately, block launch
**Notes:** Security is non-negotiable

---

## UI Fixes and Improvements

User provided specific fixes rather than selecting from categories:

1. **Profile edit cancel** — Add cancel button to exit profile editing without completing all steps
2. **Logout confirmation dialog** — Styled Dialog component (not browser confirm()) for logout
3. **Session grouping** — Split upcoming sessions into "Today" and "This Week" sections
4. **Calendar frozen panes** — Sticky date header row and time column when scrolling calendar grid

---

## Claude's Discretion

- RLS test framework choice
- Exact color values for capacity indicators
- Toast component implementation details
- Calendar frozen pane CSS approach
- Loading states for new UI additions

## Deferred Ideas

None — discussion stayed within phase scope
