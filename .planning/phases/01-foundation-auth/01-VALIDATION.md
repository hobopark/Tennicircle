---
phase: 1
slug: foundation-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | AUTH-01 | — | Sign-up creates user in auth.users | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | AUTH-02 | — | Session persists across refresh via proxy cookie refresh | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | AUTH-03 | — | JWT contains user_role claim after Custom Access Token Hook | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | AUTH-04 | — | Admin can modify coach role in community_members | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | AUTH-05 | — | Invite link signup assigns correct role | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | AUTH-06 | — | RLS policies enforce community_id scoping | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest config with jsdom environment and path aliases
- [ ] `npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom vite-tsconfig-paths jsdom` — test framework installation
- [ ] `npm install zod` — form validation library
- [ ] Test stub files for auth components

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email verification link delivery | AUTH-01 | Requires real email delivery from Supabase | Sign up, check email, click link, verify redirect |
| Custom Access Token Hook registration | AUTH-03 | Requires Supabase Dashboard manual action | Navigate to Dashboard > Authentication > Hooks, register function |
| Cross-browser session persistence | AUTH-02 | Browser-specific cookie behavior | Test in Chrome, Safari, Firefox after sign-in |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
