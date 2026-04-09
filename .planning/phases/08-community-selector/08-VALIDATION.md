---
phase: 8
slug: community-selector
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (detected from existing `*.test.ts` files in `src/lib/actions/`) |
| **Config file** | `vitest.config.ts` at project root |
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
| 08-01-01 | 01 | 1 | COMM-01 | — | N/A | manual/smoke | n/a — server component | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | COMM-02 | — | N/A | manual | n/a | N/A | ⬜ pending |
| 08-02-01 | 02 | 1 | COMM-03 | — | N/A | manual/smoke | n/a | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | COMM-04 | T-08-01 | Join request inserts as pending, not approved | unit | `npx vitest run src/lib/actions/members.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-03 | 02 | 1 | COMM-04 | T-08-02 | approveJoinRequest checks admin/coach role | unit | `npx vitest run src/lib/actions/members.test.ts` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | COMM-05 | — | N/A | unit | `npx vitest run src/lib/actions/communities.test.ts` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 2 | COMM-06 | — | Proxy redirects use auth state | unit | `npx vitest run src/lib/supabase/middleware.test.ts` | ❌ W0 | ⬜ pending |
| 08-04-02 | 04 | 2 | COMM-06 | — | 0 or 2+ communities → /communities | unit | `npx vitest run src/lib/supabase/middleware.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/actions/members.test.ts` — stubs for COMM-04 (join request CRUD)
- [ ] `src/lib/actions/communities.test.ts` — stubs for COMM-05 (createCommunity)
- [ ] `src/lib/supabase/middleware.test.ts` — stubs for COMM-06 (proxy redirects)

*Existing test infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Community picker renders Your Communities | COMM-01 | Server component rendering | Navigate to /communities, verify community cards shown |
| Single-community auto-redirect | COMM-02 | Requires auth state + DB | Log in with single-community user, verify redirect to /c/[slug]/coach |
| Browse communities section | COMM-03 | Server component rendering | Navigate to /communities, verify Browse section shows joinable communities |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
