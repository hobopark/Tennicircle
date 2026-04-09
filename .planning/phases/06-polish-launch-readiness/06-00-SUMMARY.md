---
phase: 06-polish-launch-readiness
plan: "00"
subsystem: testing
tags: [vitest, tdd, behavioral-contracts, wave-0]
dependency_graph:
  requires: []
  provides: [test-stubs-wave1]
  affects: [06-01-PLAN, 06-02-PLAN]
tech_stack:
  added: []
  patterns: [inline-logic-stubs, vitest-pure-tests]
key_files:
  created:
    - src/__tests__/capacity-display.test.ts
    - src/__tests__/waitlist-display.test.ts
    - src/__tests__/session-grouping.test.ts
    - src/__tests__/timezone-label.test.ts
  modified: []
decisions:
  - Test stubs use inline logic (no imports from implementation files) to keep RED/GREEN cycle clean for Wave 1
  - timezone-label stub accepts optional mockUserTz param to enable deterministic testing without mocking Intl
metrics:
  duration_minutes: 5
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_changed: 4
---

# Phase 06 Plan 00: Wave 0 Test Stubs Summary

**One-liner:** Four vitest behavioral contract files for capacity display, waitlist inline text, session Today/This Week grouping, and timezone label logic — all passing with inline stubs.

## What Was Built

Wave 0 establishes the test-first contract for Plans 01 and 02. Each file defines expected behavior using inline helper functions so Wave 1 executors can verify their implementation against concrete assertions without needing pre-existing implementation code.

| File | Covers | Tests |
|------|--------|-------|
| `capacity-display.test.ts` | CapacityBadge color logic (D-01) | 4 |
| `waitlist-display.test.ts` | Waitlist inline display format (D-02) | 3 |
| `session-grouping.test.ts` | Today vs This Week split using isTodaySydney (D-11) | 3 |
| `timezone-label.test.ts` | getTimezoneLabel returns AEST/AEDT suffix for non-Sydney users (D-04) | 3 |

**Total: 13 tests, 4 files, all passing.**

## Verification

```
npx vitest run src/__tests__/capacity-display.test.ts src/__tests__/waitlist-display.test.ts src/__tests__/session-grouping.test.ts src/__tests__/timezone-label.test.ts

Test Files  4 passed (4)
Tests  13 passed (13)
```

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 17fa9b2 | test(06-00): add capacity-display and waitlist-display behavioral contracts |
| 2 | 8b3db89 | test(06-00): add session-grouping and timezone-label behavioral contracts |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

All four test files use inline logic stubs (not imported from implementation files). This is intentional: the stubs define the behavioral contract. Wave 1 will implement the real functions in `src/lib/utils/timezone.ts` and components; the tests will then be updated to import from those real modules.

## Threat Flags

None — Wave 0 is test-only with no production code or security surface.

## Self-Check: PASSED

- src/__tests__/capacity-display.test.ts: FOUND
- src/__tests__/waitlist-display.test.ts: FOUND
- src/__tests__/session-grouping.test.ts: FOUND
- src/__tests__/timezone-label.test.ts: FOUND
- Commit 17fa9b2: FOUND
- Commit 8b3db89: FOUND
