---
phase: 4
slug: coach-dashboard-community-events
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (or Next.js built-in test runner if configured) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx next build` |
| **Full suite command** | `npx next build && npx next lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx next build`
- **After every plan wave:** Run `npx next build && npx next lint`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | DASH-01 | T-04-01 / — | Calendar view shows only coach's community sessions | build | `npx next build` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | DASH-02 | T-04-02 / — | Session detail shows confirmed/waitlisted attendees | build | `npx next build` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | DASH-03 | — | Player roster with attendance patterns | build | `npx next build` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | EVNT-01 | T-04-03 / — | Events table with RLS community scoping | build | `npx next build` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | EVNT-02 | T-04-04 / — | RSVP creation validates member role | build | `npx next build` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 2 | EVNT-03 | — | Event types: tournament, social, open session | build | `npx next build` | ❌ W0 | ⬜ pending |
| 04-02-04 | 02 | 2 | EVNT-04 | — | Member can create events | build | `npx next build` | ❌ W0 | ⬜ pending |
| 04-02-05 | 02 | 2 | EVNT-05 | T-04-05 / — | is_official derived from JWT, not formData | build | `npx next build` | ❌ W0 | ⬜ pending |
| 04-02-06 | 02 | 2 | EVNT-06 | — | Official/community tabs separated | build | `npx next build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test infrastructure setup (if vitest not already configured)
- [ ] Build verification passes with existing codebase before modifications

*Existing build infrastructure covers basic verification. Phase-specific tests to be defined in plans.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendar visual layout renders correctly | DASH-01 | Visual UI verification | Navigate to /coach, verify day/week toggle and session cards render |
| RSVP flow completes end-to-end | EVNT-02 | Requires authenticated user interaction | Sign in as member, navigate to events, RSVP to event, verify confirmation |
| Announcement visibility scoping | EVNT-06 | Role-dependent content display | Sign in as coach, post announcement; sign in as member, verify visibility |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
