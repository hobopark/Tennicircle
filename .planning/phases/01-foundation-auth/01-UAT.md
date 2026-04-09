---
status: complete
phase: 01-foundation-auth
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md]
started: 2026-04-07T11:30:00Z
updated: 2026-04-07T11:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Sign Up with Email
expected: Go to /auth. The "Sign up" tab is visible. Click it. Enter an email and password (8+ chars). Click "Create account". The card content replaces with "Check your email" heading, showing the email you entered in bold, and a "resend the email" link.
result: blocked
blocked_by: third-party
reason: "Supabase free tier email rate limit exceeded (429). Not a code issue."

### 2. Sign Up Validation Errors
expected: On /auth sign up tab, submit with empty fields or a password under 8 characters. You should see inline red error text below the failing field (not a browser popup). Errors clear when you start typing in that field.
result: pass

### 3. Log In with Email
expected: Go to /auth. Enter valid credentials on the "Log in" tab. Click "Log in". You are redirected to /welcome with "You're in!" heading, Trophy icon, and "Set up my profile" button.
result: pass

### 4. Login with Wrong Credentials
expected: On /auth log in tab, enter a wrong password. A red error banner appears saying "Incorrect email or password. Please try again." — no email enumeration hint.
result: pass

### 5. Unauthenticated Route Protection
expected: While logged out, visit /admin directly. You are redirected to /auth with ?redirectTo=%2Fadmin in the URL. After logging in, you should be redirected to /admin (if your role allows) or your role's home page.
result: pass

### 6. Role-Based Route Enforcement
expected: As a coach, try visiting /admin directly. You are silently redirected to /coach (your role home). No error shown — just a quiet redirect.
result: pass

### 7. Welcome Page — Pending User
expected: A newly signed-up user with no community membership lands on /welcome. The skip button area shows "Waiting for a community invite to get started." instead of a clickable link. The nav shows only "Home".
result: pass

### 8. Tab Indicator Styling
expected: On /auth, the active tab (Log in or Sign up) has a Court Blue (#2D5F8A) underline indicator beneath it — not a white pill/card background.
result: pass

### 9. Loading State
expected: Navigate between pages (e.g., /auth to /welcome). During the transition, a small blue spinner appears centered on the page (not a blank white flash).
result: pass

### 10. Error Page (404)
expected: Visit a non-existent URL like /nonexistent. You see a styled "Page not found" page with TenniCircle fonts and a "Go home" button — not the default Next.js 404.
result: skipped
reason: Proxy redirects all unknown routes for authenticated users to role home. not-found.tsx exists but only triggers via programmatic notFound() calls — will be tested in future phases.

### 11. Design System — TenniCircle Palette
expected: The /auth page has a warm cream background (not white), the primary button is Court Blue, the card has a subtle warm shadow. The heading font (TenniCircle wordmark, "Welcome back") is visibly different from body text — it's Nunito bold.
result: pass

## Summary

total: 11
passed: 8
issues: 0
pending: 0
skipped: 1
blocked: 1

## Gaps

[none]
