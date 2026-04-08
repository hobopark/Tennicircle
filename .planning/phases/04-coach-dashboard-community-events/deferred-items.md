# Deferred Items — Phase 04

## Pre-existing Build Failures (out of scope)

### /auth page missing Suspense boundary

**Discovered during:** Task 2 (04-01)
**File:** src/app/auth/ (AuthPage component uses useSearchParams without Suspense boundary)
**Error:** `useSearchParams() should be wrapped in a suspense boundary at page "/auth"`
**Confirmed pre-existing:** Yes — build fails on base commit b175c5b before plan 04-01 changes
**Fix:** Wrap the useSearchParams call in a Suspense boundary in the auth page component
**Impact:** `npx next build` fails. TypeScript compilation (`npx tsc --noEmit`) passes.
