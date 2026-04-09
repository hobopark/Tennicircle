---
phase: 6
slug: polish-launch-readiness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | SC-1 (capacity display) | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | SC-3 (race condition) | T-06-01 | Concurrent RSVPs result in one confirmed + one waitlisted | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 1 | SC-4 (RLS audit) | T-06-02 | Every table has RLS enabled with community-scoping | security | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] RLS audit test stubs — verify all tables have RLS enabled
- [ ] RSVP race condition test stubs — verify atomic RSVP behavior
- [ ] Capacity display test stubs — verify session card shows correct counts

*Existing vitest infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendar frozen panes scroll behavior | SC-2 | CSS sticky positioning requires visual verification | Scroll calendar grid — header row and time column should remain visible |
| Timezone suffix display | SC-2 | Depends on browser timezone mismatch | Set browser timezone to non-Sydney, verify AEST/AEDT suffix appears |
| View preference persistence | SC-2 | Requires localStorage state across page loads | Select day view, refresh page, verify day view persists |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
