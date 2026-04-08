---
phase: 5
slug: notifications
status: draft
nyquist_compliant: true
wave_0_complete: true
nyquist_rationale: "No test framework exists in this project (no vitest, jest, or __tests__). Adding test infrastructure would be a significant scope addition for MVP notifications. All verify blocks use tsc + lint + build gates which catch type errors, import failures, and compilation issues. Manual verification checkpoint in Plan 04 covers runtime behavior. This is an accepted tradeoff for MVP."
created: 2026-04-08
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — project has no test framework installed |
| **Config file** | N/A |
| **Quick run command** | `npm run lint && npx tsc --noEmit` |
| **Full suite command** | `npm run lint && npx tsc --noEmit && npm run build` |
| **Estimated runtime** | ~30 seconds |

### Nyquist Compliance Rationale

This project has no test framework (no `vitest.config.*`, `jest.config.*`, or `__tests__/` directory). RESEARCH.md identified Wave 0 test stubs as a gap, but installing a test framework and writing unit tests is out of scope for this notifications phase.

**Accepted gates instead of unit tests:**
- `npx tsc --noEmit` — catches type mismatches, missing imports, incorrect function signatures
- `npm run lint` — catches code quality issues
- `npm run build` — catches SSR/RSC boundary violations, missing exports, runtime-detectable issues
- Plan 04 checkpoint — manual end-to-end verification of all notification flows

These gates provide sufficient confidence for MVP. Unit test infrastructure is a candidate for a future dedicated phase.

---

## Sampling Rate

- **After every task commit:** Run `npm run lint && npx tsc --noEmit`
- **After every plan wave:** Run `npm run lint && npx tsc --noEmit && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 05-01-01 | 01 | 1 | NOTF-01 | T-05-03 | service_role-only INSERT | build | `npx tsc --noEmit` | pending |
| 05-01-02 | 01 | 1 | NOTF-02/03 | T-05-01/02 | member-scoped actions | build | `npx tsc --noEmit` | pending |
| 05-02-01 | 02 | 2 | NOTF-02/03 | T-05-05 | service_role inserts | build | `npx tsc --noEmit` | pending |
| 05-02-02 | 02 | 2 | NOTF-01 | T-05-04 | CRON_SECRET auth | build | `npx tsc --noEmit` | pending |
| 05-03-01 | 03 | 2 | NOTF-01/02/03 | T-05-08 | member-scoped Realtime | build | `npx tsc --noEmit` | pending |
| 05-03-02 | 03 | 2 | NOTF-01/02/03 | — | bell badge | build | `npx tsc --noEmit` | pending |
| 05-04-01 | 04 | 3 | NOTF-01/02/03 | T-05-10 | schema push + RLS | build | `npx tsc --noEmit && npm run build` | pending |
| 05-04-02 | 04 | 3 | NOTF-01/02/03 | — | e2e verification | manual | checkpoint | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] TypeScript compilation passes with new notification types (covered by `npx tsc --noEmit`)
- [x] Supabase migration applies cleanly (verified in Plan 04 Task 1)
- [x] No unit test framework needed — tsc + lint + build gates accepted (see rationale above)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Realtime notification appears in-app | NOTF-01 | Requires browser with active Supabase Realtime subscription | Open app, trigger session reminder, verify bell badge updates |
| Cron fires session reminders | NOTF-01 | Requires Vercel cron or manual API call | Call /api/cron/session-reminders with CRON_SECRET header |
| Waitlist promotion notification | NOTF-03 | Requires RSVP cancel + auto-promote flow | Cancel RSVP on full session, verify promoted member gets notification |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (tsc/lint/build)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 gaps addressed (tsc-only gates accepted with rationale)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter with rationale

**Approval:** accepted (tsc-only gates for MVP)
