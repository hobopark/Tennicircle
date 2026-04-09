---
phase: 08-community-selector
plan: "04"
subsystem: community-ui
tags: [communities, community-picker, switcher, join-flow, nav]
dependency_graph:
  requires: [08-01, 08-02, 08-03]
  provides: [communities-page, community-switcher]
  affects: [AppNav, community-context]
tech_stack:
  added: []
  patterns: [useTransition-optimistic, server-component-with-client-wrapper, click-outside-listener]
key_files:
  created:
    - src/app/communities/page.tsx
    - src/app/communities/loading.tsx
    - src/app/communities/CommunitiesPageClient.tsx
    - src/components/communities/CommunityCard.tsx
    - src/components/communities/CommunityBrowseCard.tsx
    - src/components/communities/CreateCommunityDialog.tsx
    - src/components/nav/CommunitySwitcherDropdown.tsx
  modified:
    - src/components/nav/AppNav.tsx
    - src/lib/types/auth.ts
decisions:
  - "CommunitiesPageClient wrapper: server page fetches data, client component handles interactive state (Create dialog, join buttons)"
  - "CommunityBrowseCard uses dual useTransition (request + cancel) for independent loading states"
  - "CommunitySwitcherDropdown uses useMaybeCommunity (safe variant) — returns null on global routes"
  - "All hooks before early return in CommunitySwitcherDropdown to satisfy React rules of hooks"
metrics:
  duration: "~35 minutes"
  completed: "2026-04-10"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 2
---

# Phase 08 Plan 04: Community Picker Page and Switcher Summary

**One-liner:** /communities page with 3-section layout (Your Communities, Pending, Browse) + AppNav CommunitySwitcherDropdown using useMaybeCommunity.

## What Was Built

### Task 1: /communities page

**`src/app/communities/page.tsx`** — Server Component that:
- Auth-gates with Supabase `getUser()`
- Fetches `getUserCommunities()` + `getBrowseCommunities()` in parallel via `Promise.all`
- Fetches pending join requests directly from `join_requests` table with community data
- Computes member counts per community via `community_members` table
- Passes structured data to `CommunitiesPageClient`

**`src/app/communities/CommunitiesPageClient.tsx`** — Client Component that:
- Renders "Your Communities" section (approved memberships + admin Create card)
- Renders "Pending" section with count badge (orange, Roland Garros)
- Renders "Browse Communities" section
- Manages `CreateCommunityDialog` open state

**`src/components/communities/CommunityCard.tsx`** — Joined community card:
- Role badge with 3 colors: admin (`bg-primary/10 text-primary`), coach (`bg-secondary/30`), client (`bg-muted`)
- `aria-label` on link and badge per accessibility spec
- `getRoleHomeRoute(slug, role)` for navigation

**`src/components/communities/CommunityBrowseCard.tsx`** — Browse/pending card:
- Dual `useTransition` (request + cancel) for independent loading states
- Optimistic state: `CardState = 'default' | 'pending'`
- Pending state: `bg-orange-500` disabled button + "Cancel request" link
- Sonner toast on success/error

**`src/components/communities/CreateCommunityDialog.tsx`** — Admin create dialog:
- Uses `@base-ui/react/dialog` via existing shadcn Dialog components
- Live slug preview below name field (client-side `generateSlugPreview`)
- Calls `createCommunity()` server action, closes on success, `router.refresh()`

**`src/app/communities/loading.tsx`** — Skeleton with 3 `h-24 rounded-3xl` placeholder cards.

### Task 2: CommunitySwitcherDropdown

**`src/components/nav/CommunitySwitcherDropdown.tsx`** — Dropdown component:
- Uses `useMaybeCommunity()` (safe variant) — returns `null` on global routes where no CommunityProvider is mounted
- All hooks declared before early return (React rules of hooks compliance)
- Fetches `getUserCommunities()` on mount via `useTransition`
- Trigger: `flex items-center gap-1 px-3 py-1.5 rounded-xl bg-muted/80` with `aria-expanded` + `aria-haspopup="listbox"`
- Dropdown: current community with `Check` icon + `bg-primary/5`, others with `hover:bg-muted` links
- Click-outside via `useRef` + `mousedown` listener; Escape key closes
- "Browse communities" link to `/communities`

**`src/components/nav/AppNav.tsx`** — Updated:
- Imports `CommunitySwitcherDropdown`
- Top bar restructured: `fixed top-4 left-4 right-4 z-50 flex items-center justify-between`
- Switcher on left, logout button on right (both wrapped in `pointer-events-auto` within `pointer-events-none` container)
- Also restored from Phase 8 merge commit (worktree had stale Phase 7 version)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] React hooks-before-return violation in CommunitySwitcherDropdown**
- **Found during:** Task 2
- **Issue:** Initial implementation had early return before `useEffect` calls — violates React rules of hooks
- **Fix:** Moved all hooks before the `if (!community) return null` guard; added `if (!community) return` inside `useEffect` to skip fetch
- **Files modified:** `src/components/nav/CommunitySwitcherDropdown.tsx`
- **Commit:** c5572f4

**2. [Rule 2 - Missing critical functionality] auth.ts missing `getRoleHomeRoute` and Phase 8 types**
- **Found during:** TypeScript check after Task 2
- **Issue:** Worktree had Phase 7 `auth.ts` without `getRoleHomeRoute`, `JoinRequest`, `Community.description`, `ROLE_ALLOWED_ROUTE_PATTERNS`, `AUTHENTICATED_PUBLIC_ROUTES`
- **Fix:** Restored `auth.ts` from `40ad920` (Phase 8 wave 3 merge commit)
- **Files modified:** `src/lib/types/auth.ts`
- **Commit:** cca9ae6

**3. [Rule 3 - Blocking issue] Worktree had stale Phase 7 AppNav without `useMaybeCommunity`**
- **Found during:** Task 2 setup
- **Issue:** After soft-reset, worktree's AppNav was the old JWT-decoding Phase 7 version; HEAD (40ad920) had the correct Phase 8 version with `useMaybeCommunity`
- **Fix:** Restored AppNav from `40ad920` before adding CommunitySwitcherDropdown
- **Files modified:** `src/components/nav/AppNav.tsx`
- **Commit:** c5572f4

## Known Stubs

None — all data flows are wired to live server actions (`getUserCommunities`, `getBrowseCommunities`, `requestToJoin`, `cancelJoinRequest`, `createCommunity`).

## Threat Flags

No new network endpoints or auth paths introduced. All server actions were implemented in Plan 01 (T-08-13, T-08-14 already mitigated). The `/communities` page auth-gates correctly.

## Self-Check: PASSED

- `src/app/communities/page.tsx` — exists ✓
- `src/app/communities/loading.tsx` — exists ✓
- `src/app/communities/CommunitiesPageClient.tsx` — exists ✓
- `src/components/communities/CommunityCard.tsx` — exists ✓
- `src/components/communities/CommunityBrowseCard.tsx` — exists ✓
- `src/components/communities/CreateCommunityDialog.tsx` — exists ✓
- `src/components/nav/CommunitySwitcherDropdown.tsx` — exists ✓
- `src/components/nav/AppNav.tsx` — imports CommunitySwitcherDropdown ✓
- Commits: bf373de, c5572f4, cca9ae6 ✓
- TypeScript: no errors in new files ✓
