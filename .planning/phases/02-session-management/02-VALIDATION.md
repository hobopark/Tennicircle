---
phase: 2
slug: session-management
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-07
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (to be installed in Wave 0) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | SESS-01 | — | N/A | setup | `npx vitest --version` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | SESS-01 | T-2-01 | RLS on session_templates | migration | `supabase db push` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | SESS-02 | T-2-02 | Capacity trigger prevents over-booking | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 2-01-04 | 01 | 2 | SESS-03 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 2-01-05 | 01 | 2 | SESS-04 | T-2-03 | Waitlist position accurate | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 2-01-06 | 01 | 3 | SESS-05 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install vitest and @testing-library/react
- [ ] `vitest.config.ts` — configure test environment
- [ ] Stub test files for session CRUD and RSVP flows

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendar grid renders correctly on mobile | SESS-06 | Visual layout verification | Open /coach/sessions on 375px viewport, verify weekly grid is scrollable |
| RSVP confirmation dialog appears | SESS-03 | UI interaction flow | Click RSVP on a session card, verify dialog appears with session details |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
