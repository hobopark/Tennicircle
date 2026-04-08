---
phase: 4
slug: coach-dashboard-community-events
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (configured in vitest.config.ts) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/lib` |
| **Full suite command** | `npx vitest run && npx next build && npx next lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx next build`
- **After every plan wave:** Run `npx vitest run && npx next build && npx next lint`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Wave 0 Plan

Plan `04-00-PLAN.md` creates 4 test stub files with `.todo()` tests:

| File | Requirements Covered | Status |
|------|---------------------|--------|
| `src/lib/actions/events.test.ts` | EVNT-01 through EVNT-05 | Wave 0 |
| `src/lib/actions/announcements.test.ts` | EVNT-05 | Wave 0 |
| `src/components/calendar/WeekCalendarGrid.test.tsx` | DASH-01, DASH-02 | Wave 0 |
| `src/components/events/EventCard.test.tsx` | EVNT-06 | Wave 0 |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-00-01 | 00 | 1 | EVNT-01-05 | — | Test stubs for event actions | unit | `npx vitest run src/lib/actions` | W0 creates | pending |
| 04-00-02 | 00 | 1 | DASH-01,02,EVNT-06 | — | Test stubs for components | unit | `npx vitest run src/components` | W0 creates | pending |
| 04-01-01 | 01 | 1 | EVNT-01-06 | T-04-01 | Events schema with RLS | build | `npx next build` | N/A (SQL) | pending |
| 04-01-02 | 01 | 1 | EVNT-01-06 | T-04-02 | Types and validations | build | `npx next build` | N/A (types) | pending |
| 04-02-01 | 02 | 2 | EVNT-01-05 | T-04-02,06 | Server actions with is_official from JWT | unit+build | `npx vitest run src/lib/actions && npx next build` | via W0 | pending |
| 04-02-02 | 02 | 2 | EVNT-01-06 | T-04-07 | Event UI components | unit+build | `npx vitest run src/components/events && npx next build` | via W0 | pending |
| 04-03-01 | 03 | 2 | DASH-01,02 | T-04-09 | Day/week toggle with attendance | unit+build | `npx vitest run src/components/calendar && npx next build` | via W0 | pending |
| 04-03-02 | 03 | 2 | DASH-03 | T-04-10 | Player roster with attendance dates | build | `npx next build` | N/A | pending |
| 04-04-01 | 04 | 3 | EVNT-04,06 | T-04-11,12 | Events page + route config | build | `npx next build` | N/A | pending |
| 04-04-02 | 04 | 3 | DASH-01 | T-04-13 | Client dashboard + calendar + bottom nav | build+grep | `npx next build && grep "fixed bottom-0" src/components/nav/AppNav.tsx` | N/A | pending |
| 04-05-01 | 05 | 4 | ALL | T-04-14 | Schema push + E2E verify | manual | `supabase db push && npx next build` | N/A | pending |

*Status: pending · green · red · flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendar visual layout renders correctly | DASH-01 | Visual UI verification | Navigate to /coach, verify day/week toggle and session cards render |
| RSVP flow completes end-to-end | EVNT-02 | Requires authenticated user interaction | Sign in as member, navigate to events, RSVP to event, verify confirmation |
| Announcement visibility scoping | EVNT-06 | Role-dependent content display | Sign in as coach, post announcement; sign in as member, verify visibility |
| Calendar secondary view accessible | D-13 | Navigation flow verification | Sign in as client, navigate to /sessions, tap "See all" on sessions, verify calendar renders at /sessions/calendar |
| Bottom nav renders correctly | D-07 | Visual layout verification | Check all roles show correct tabs, no double navigation |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (04-00-PLAN.md)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
