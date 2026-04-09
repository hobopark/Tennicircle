---
phase: 7
slug: member-management-invites
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 0 | MGMT-01 | T-07-01 | `createInviteLink` enforces role restriction | unit | `npx vitest run src/lib/actions/invites.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 0 | MGMT-02 | T-07-02 | `removeMember` rejects non-admin callers | unit | `npx vitest run src/lib/actions/members.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 0 | MGMT-03 | T-07-03 | `updateMemberRole` accepts admin-only role changes | unit | `npx vitest run src/lib/actions/members.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 0 | MGMT-04 | — | Open sign-up creates client membership | unit | `npx vitest run src/lib/actions/members.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-01-05 | 01 | 0 | MGMT-05 | — | MemberCard renders toggle for coach role | unit | `npx vitest run src/components/members/MemberCard.test.tsx -x` | ❌ W0 | ⬜ pending |
| 07-01-06 | 01 | 0 | MGMT-06 | T-07-04 | `assignClient`/`removeClientAssignment` respect coach-only guard | unit | `npx vitest run src/lib/actions/members.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-01-07 | 01 | 0 | MGMT-07 | — | MemberCard renders "Profile pending" badge | unit | `npx vitest run src/components/members/MemberCard.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/actions/invites.test.ts` — stubs for MGMT-01
- [ ] `src/lib/actions/members.test.ts` — stubs for MGMT-02, MGMT-03, MGMT-04, MGMT-06
- [ ] `src/components/members/MemberCard.test.tsx` — stubs for MGMT-05, MGMT-07
- [ ] Existing `vitest.config.mts` has jsdom + globals — no framework install needed

*Existing infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Invite link copy-to-clipboard works on mobile Safari | MGMT-01 | `navigator.clipboard` requires secure context + user gesture | Open roster on iOS Safari, tap invite, verify clipboard contains URL |
| Role-adaptive roster renders correctly for admin vs coach | MGMT-05 | Layout verification requires visual inspection | Log in as admin — see role controls; log in as coach — no role controls visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
