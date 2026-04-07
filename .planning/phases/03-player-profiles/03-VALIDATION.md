---
phase: 3
slug: player-profiles
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (jsdom environment) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/__tests__/actions/profiles.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/actions/profiles.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | PROF-01 | T-3-01 / T-3-02 | `upsertProfile` rejects unauthenticated; community_id scoped | unit | `npx vitest run src/__tests__/actions/profiles.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | PROF-02 | T-3-01 | `setCoachAssessment` only for coach/admin role; separate table with RLS | unit | `npx vitest run src/__tests__/actions/profiles.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | PROF-03 | T-3-05 | Lesson history filtered by community_id; only confirmed RSVPs | unit | `npx vitest run src/__tests__/actions/profiles.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | PROF-04 | T-3-05 | `addProgressNote` coach-only write; player reads own notes only | unit | `npx vitest run src/__tests__/actions/profiles.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/actions/profiles.test.ts` — stubs for PROF-01 through PROF-04 (follows `rsvps.test.ts` stub pattern)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Avatar upload displays correctly | PROF-01 | Requires browser file input + Supabase Storage bucket | Upload image via profile setup wizard, verify avatar renders on profile page |
| Square cropper UI interaction | PROF-01 | Visual/interactive component | Open setup wizard, upload image, verify cropper UI allows square selection |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
