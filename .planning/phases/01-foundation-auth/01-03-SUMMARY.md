---
phase: 01-foundation-auth
plan: 03
subsystem: auth
tags: [supabase, zod, react, server-actions, next-js, auth, forms]

# Dependency graph
requires:
  - phase: 01-foundation-auth/01-01
    provides: Supabase server client (createClient), multi-tenant schema, RLS
  - phase: 01-foundation-auth/01-02
    provides: shadcn components (Button, Input, Tabs, Label), TenniCircle design tokens, AuthFormState type

provides:
  - /auth page with Login/Sign Up tab switcher (D-01)
  - Zod-validated Server Actions for login and signup
  - Email verification pending in-card state (D-04)
  - /auth/confirm route handler that processes verifyOtp token and redirects to /welcome
  - Invite token threading from URL through signup to email redirect URL (for Plan 04)

affects:
  - 01-04 (invite link processing — invite token passed from /auth/confirm to /welcome?invite=)
  - 01-04 (welcome page — /auth redirects here on success)
  - future protected routes (proxy.ts detects 401, redirects to /auth?session=expired)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useActionState with Server Actions for form state management
    - Zod 4 top-level z.email() API for email validation
    - Inline field error clearing via onChange (not on blur)
    - Invite token threading: URL param -> hidden input -> Server Action -> emailRedirectTo
    - EmailVerificationPending in-place replacement (no navigation per D-04)

key-files:
  created:
    - src/lib/validations/auth.ts
    - src/lib/actions/auth.ts
    - src/app/auth/page.tsx
    - src/components/auth/AuthPage.tsx
    - src/components/auth/LoginForm.tsx
    - src/components/auth/SignUpForm.tsx
    - src/components/auth/EmailVerificationPending.tsx
    - src/app/auth/confirm/route.ts
    - src/__tests__/actions/auth.test.ts
  modified: []

key-decisions:
  - "Zod 4 uses z.email() top-level, not z.string().email() — confirmed from installed package"
  - "useActionState error clearing: local state overrides server state per-field on onChange (not on blur)"
  - "EmailVerificationPending uses browser createClient to call resend() — avoids server round-trip"

patterns-established:
  - "useActionState pattern: server action returns AuthFormState, form renders from state + local cleared overrides"
  - "Field error clearing: useState per field, empty string ('') overrides server error, undefined passes through"
  - "Invite token threading: URL ?invite= -> hidden input -> action -> emailRedirectTo searchParam"

requirements-completed: [AUTH-01, AUTH-02]

# Metrics
duration: 3min
completed: 2026-04-07
---

# Phase 01 Plan 03: Auth Page and Server Actions Summary

**Tabbed /auth page with useActionState Server Actions, Zod 4 validation, inline error handling, and email verification pending state — all per D-01 through D-04**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-07T01:01:31Z
- **Completed:** 2026-04-07T01:04:11Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Zod 4 LoginSchema/SignUpSchema with field-level validation and exact UI-SPEC error copy
- login/signup Server Actions with Supabase auth calls, generic error messages (T-01-03-03), and invite token threading
- /auth page with Login/Sign Up tabs, heading switch, session-expired banner, and mobile-responsive card styling
- EmailVerificationPending with 60-second resend cooldown and supabase.auth.resend browser call
- /auth/confirm GET route handler using verifyOtp, redirects to /welcome with invite token forwarded
- 12 vitest tests covering validation paths, error mapping, Supabase mock calls, and invite token threading

## Task Commits

1. **Task 1: Create Zod validation schemas and auth Server Actions** - `4faa9bb4` (feat)
2. **Task 2: Build /auth page with login/signup tabs and email verification** - `031f1b48` (feat)

## Files Created/Modified

- `src/lib/validations/auth.ts` - LoginSchema (email, password required) and SignUpSchema (email, password min 8)
- `src/lib/actions/auth.ts` - login() and signup() Server Actions with Supabase auth, Zod validation, invite threading
- `src/app/auth/page.tsx` - Server Component entry point that renders AuthPage
- `src/components/auth/AuthPage.tsx` - Tabbed container with heading switch, session-expired banner
- `src/components/auth/LoginForm.tsx` - useActionState login form with inline errors, deferred Forgot Password
- `src/components/auth/SignUpForm.tsx` - useActionState signup form with invite_token hidden input, terms text
- `src/components/auth/EmailVerificationPending.tsx` - In-card verification state with 60s resend cooldown
- `src/app/auth/confirm/route.ts` - GET handler for email verification callback via verifyOtp
- `src/__tests__/actions/auth.test.ts` - 12 tests covering login/signup validation and error paths

## Decisions Made

- **Zod 4 top-level API:** Used `z.email()` not `z.string().email()` — confirmed from installed zod 4.3.6
- **Field error clearing pattern:** Local useState per field, empty string ('') overrides server error on onChange, undefined defers to server state — avoids premature clearing while maintaining D-03 interaction
- **EmailVerificationPending resend:** Uses browser `createClient` directly in the component — avoids needing a server action for a single resend call; Supabase handles rate limiting server-side (T-01-03-05)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required beyond what Plan 01 established.

## Next Phase Readiness

- /auth page is fully functional — login, signup, email verification, and confirmation callback
- Invite token threading is in place through the entire flow for Plan 04 to consume
- /welcome redirect target for Plan 04 to implement the welcome page
- All auth error copy matches UI-SPEC copywriting contract exactly

---
*Phase: 01-foundation-auth*
*Completed: 2026-04-07*
