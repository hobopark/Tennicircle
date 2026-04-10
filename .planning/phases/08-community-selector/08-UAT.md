---
status: complete
phase: 08-community-selector
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md, 08-04-SUMMARY.md, 08-05-SUMMARY.md]
started: 2026-04-10T14:45:00Z
updated: 2026-04-10T15:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Run `npm run dev`. Server boots without errors. Navigate to http://localhost:3000 — page loads (redirects to /auth or /communities depending on auth state).
result: pass

### 2. Login Redirects to Community Picker
expected: Log in with an existing account. After login, you land on /communities (NOT the old /coach or /sessions flat routes). Page shows "Communities" heading with "Your Communities" section listing your community card(s).
result: issue
reported: "logout button should prompt confirmation"
severity: minor

### 3. Community Card & Navigation
expected: On /communities, your community card shows: community name, your role badge (Admin/Coach/Client with distinct colors), and a "Go to Community" button. Clicking it navigates to /c/{slug}/{role-home} (e.g., /c/your-slug/coach for coaches, /c/your-slug/admin for admins).
result: issue
reported: "for coach and client with one registered community, login goes straight to /welcome instead of /communities — auth.ts login action still uses JWT-based role routing which falls through to /welcome since Custom Access Token Hook was removed. Middleware catches /welcome and redirects single-community users to role home, bypassing /communities picker entirely (violates D-23)"
severity: major

### 4. AppNav in Community Context
expected: Inside a community (/c/{slug}/...), the bottom nav shows role-appropriate tabs (Admin gets: Dashboard, Schedule, Clients, Events, Notifications). Tapping each tab navigates to /c/{slug}/{tab}. The top bar shows a community switcher with your community name + chevron.
result: pass

### 5. Community Switcher Dropdown
expected: Tap the community name/chevron in the top bar. A dropdown appears showing your current community (with check mark) and a "Browse communities" link at the bottom. If you have multiple communities, other communities appear as links. Tapping outside or pressing Escape closes the dropdown.
result: pass

### 6. Browse Communities & Request to Join
expected: On /communities, scroll to "Browse Communities" section. Communities you haven't joined appear as cards with name, description, member count, and a "Request to Join" button. Clicking the button shows a spinner ("Requesting..."), then changes to "Pending Approval" (orange) with a "Cancel request" link below. Toast appears: "Request sent! You'll be notified when approved."
result: pass

### 7. Cancel Join Request
expected: On a community card showing "Pending Approval", click "Cancel request" link. Button reverts to "Request to Join". Toast appears: "Request cancelled."
result: issue
reported: "Cancel appears to work in UI (optimistic update) but the request is NOT deleted from the database. Re-requesting shows 'You already have a pending request for this community.' Root cause: join_requests table has no DELETE RLS policy — RLS silently blocks the delete."
severity: major

### 8. Approve Join Request (Coach/Admin)
expected: As a coach or admin inside a community, go to the Clients/Members tab. If there are pending join requests, an orange "Pending Requests" section appears at the top of the roster with each requester's name, avatar, and join date. Click "Approve Member" — the row disappears, toast shows "Approved. {name} is now a member."
result: issue
reported: "Pending request shows 'Unknown' instead of requester's name/avatar. Approve action works fine. Root cause: getPendingRequests queries global profiles (community_id IS NULL) but RLS blocks admin/coach from reading other users' global profiles."
severity: minor

### 9. Reject Join Request (Coach/Admin)
expected: On a pending request row, click "Reject". An orange-themed dialog (NOT red) appears asking to confirm rejection. Click "Reject Request" — dialog closes, row disappears, toast shows "Request rejected."
result: pass

### 10. Create Community (Admin)
expected: As an admin on /communities, a dashed "+ Create Community" card appears. Click it — a dialog opens with "Community Name" field (with live slug preview below), optional "Description" field, and "Create Community" button. Fill in a name, submit — dialog closes, new community appears in "Your Communities" with you as Admin.
result: pass

### 11. Old Flat Route Redirect
expected: While logged in with one community, manually navigate to /coach or /sessions in the URL bar. You are redirected to /c/{slug}/coach or /c/{slug}/sessions respectively (not a 404).
result: pass

### 12. Loading Skeletons on Tab Navigation
expected: Navigate between tabs (e.g., from Coach Dashboard to Schedule to Clients). Each page briefly shows a skeleton/shimmer loading state before content appears (grey placeholder rectangles matching the page layout).
result: issue
reported: "Skeletons show but user wants an additional loading spinner for clearer feedback"
severity: cosmetic

### 13. Profile Page (Global Route)
expected: Navigate to /profile (not under /c/{slug}/). The page loads showing your profile. The bottom nav shows only minimal tabs (no community-specific tabs like Coach/Sessions). A "Communities" link is visible in the nav.
result: pass

## Summary

total: 13
passed: 8
issues: 5
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Logout button should prompt confirmation before signing out"
  status: failed
  reason: "User reported: logout button should prompt confirmation"
  severity: minor
  test: 2
  root_cause: "AppNav logout button calls signOut directly with no confirmation dialog"
  artifacts:
    - path: "src/components/nav/AppNav.tsx"
      issue: "Logout button fires signOut immediately with no confirmation"
  missing:
    - "Add confirmation dialog before signOut (use orange-themed Dialog per project convention)"
  debug_session: ""

- truth: "After login, user lands on /communities picker page (D-23: no auto-redirect past picker)"
  status: failed
  reason: "User reported: for coach and client with one registered community, login goes straight to /welcome instead of /communities — auth.ts login action still uses JWT-based role routing which falls through to /welcome since Custom Access Token Hook was removed"
  severity: major
  test: 3
  root_cause: "src/lib/actions/auth.ts lines 62-74 still parse JWT for user_role routing. With Custom Access Token Hook removed, payload.user_role is undefined → falls to /welcome. Also: src/app/auth/confirm/route.ts:26 and src/app/page.tsx:9 redirect to /welcome"
  artifacts:
    - path: "src/lib/actions/auth.ts"
      issue: "Login redirect still uses JWT-based role routing, falls to /welcome"
    - path: "src/app/auth/confirm/route.ts"
      issue: "Email confirm redirects to /welcome instead of /communities"
    - path: "src/app/page.tsx"
      issue: "Root page redirects to /welcome instead of /communities"
  missing:
    - "Change auth.ts login redirect to /communities"
    - "Change auth/confirm/route.ts redirect to /communities"
    - "Change page.tsx root redirect to /communities"
  debug_session: ""

- truth: "Cancel join request deletes the pending request from the database"
  status: failed
  reason: "User reported: cancel appears to work in UI but request is NOT deleted. Re-requesting shows 'You already have a pending request.' RLS silently blocks the delete."
  severity: major
  test: 7
  root_cause: "supabase/migrations/00009_phase8_community_selector.sql — join_requests table has SELECT, INSERT, UPDATE policies but NO DELETE policy. RLS enabled means all deletes are silently blocked."
  artifacts:
    - path: "supabase/migrations/00009_phase8_community_selector.sql"
      issue: "Missing DELETE RLS policy on join_requests table"
  missing:
    - "Add DELETE policy: users can delete their own pending requests (user_id = auth.uid() AND status = 'pending')"
  debug_session: ""

- truth: "Pending join requests show requester's name and avatar"
  status: failed
  reason: "User reported: request shows 'Unknown' instead of requester name. getPendingRequests queries global profiles but RLS blocks reading other users' global profiles."
  severity: minor
  test: 8
  root_cause: "RLS on player_profiles: player_profiles_read_own only allows reading own profile; player_profiles_read_community requires community_id match. Global profiles (community_id=NULL) from other users are invisible to admin/coach. getPendingRequests in communities.ts queries .is('community_id', null) which returns empty for non-self users."
  artifacts:
    - path: "supabase/migrations/00009_phase8_community_selector.sql"
      issue: "No RLS policy allows reading other users' global profiles"
    - path: "src/lib/actions/communities.ts"
      issue: "getPendingRequests queries global profiles which are RLS-blocked"
  missing:
    - "Either: add RLS policy allowing authenticated users to read global profiles (community_id IS NULL), OR use service client in getPendingRequests to bypass RLS for profile lookup"
  debug_session: ""

- truth: "Loading skeletons provide clear loading feedback with spinner"
  status: failed
  reason: "User reported: skeletons show but wants an additional loading spinner"
  severity: cosmetic
  test: 12
  root_cause: "Loading skeletons use only Skeleton placeholders, no spinner/Loader2 component"
  artifacts:
    - path: "src/app/c/[slug]/coach/loading.tsx"
      issue: "Skeleton-only loading, no spinner"
  missing:
    - "Add Loader2 spinner to loading.tsx files for additional visual feedback"
  debug_session: ""
