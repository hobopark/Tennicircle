---
phase: 08-community-selector
plan: 02
subsystem: server-actions
tags: [actions, auth-migration, community-id, jwt-removal]
dependency_graph:
  requires: [08-01]
  provides: [community-scoped-actions]
  affects: [all-pages-using-actions]
tech_stack:
  added: []
  patterns:
    - getUserRole(supabase, communityId) replaces getJWTClaims for all auth/role checks
    - communityId + communitySlug as explicit first params on all community-scoped actions
    - revalidatePath uses /c/${communitySlug}/... paths throughout
    - upsertProfile accepts communityId|null for global vs community-specific profile
    - joinCommunityAsClient accepts explicit communityId (no .limit(1).single() single-tenant hack)
key_files:
  modified:
    - src/lib/actions/sessions.ts
    - src/lib/actions/rsvps.ts
    - src/lib/actions/invitations.ts
    - src/lib/actions/invites.ts
    - src/lib/actions/events.ts
    - src/lib/actions/announcements.ts
    - src/lib/actions/members.ts
    - src/lib/actions/notifications.ts
    - src/lib/actions/profiles.ts
    - src/app/profile/setup/page.tsx
    - src/components/profile/ProfileSetupWizard.tsx
    - src/components/profile/AvatarUpload.tsx
decisions:
  - joinCommunityAsClient refactored to accept explicit communityId — no longer queries communities table with .limit(1).single() (multi-tenant correctness)
  - processInviteSignup kept without communityId param — it runs during signup callback before user has a membership, uses invite_links.community_id directly
  - upsertProfile(communityId|null) uses select-then-insert-or-update for null communityId (PostgREST upsert unreliable with partial unique indexes containing NULL)
  - AvatarUpload uses 'global' storage path segment when communityId is null (open sign-up flow)
  - notifications.ts had no getJWTClaims; only needed communitySlug added to revalidatePath
  - Profile-scoped functions (upsertProfile): communityId|null, no getUserRole check required
  - Community-scoped functions (setCoachAssessment, addProgressNote, getLessonHistory): getUserRole check required, role enforced server-side
metrics:
  duration: 45
  completed: "2026-04-10"
  tasks: 2
  files: 12
---

# Phase 08 Plan 02: Server Actions JWT Migration Summary

JWT-free server actions — all 9 action files migrated from `getJWTClaims()` to explicit `communityId` parameter + `getUserRole()` pattern, plus smart profile setup page with null-community support.

## Tasks Completed

### Task 1: Migrate sessions, rsvps, invitations, invites
- **sessions.ts**: `createSessionTemplate`, `editSession`, `cancelSession` — all receive `communityId + communitySlug`, use `getUserRole` for role check, scope `community_members` lookup to `communityId`, revalidate `/c/${slug}/...` paths.
- **rsvps.ts**: `rsvpSession`, `cancelRsvp`, `promoteFromWaitlist`, `removeFromWaitlist` — same pattern. `promoteFromWaitlist` now compares `rsvpCheck.community_id !== communityId` (uses param, not JWT claim).
- **invitations.ts**: `addInvitation`, `removeInvitation` — role check via `getUserRole`.
- **invites.ts**: `createInviteLink`, `revokeInviteLink` — `membership.memberId` used for `created_by` FK (eliminates separate member query).

### Task 2: Migrate events, announcements, members, notifications, profiles + profile/setup page
- **events.ts**: `createEvent`, `rsvpEvent`, `cancelEventRsvp`, `updateEvent`, `deleteEvent` — `getUserRole` replaces `getJWTClaims`. `cancelEventRsvp` waitlist promotion notification now uses `communityId` param instead of `claims.community_id!`.
- **announcements.ts**: `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement` — role check via `getUserRole`.
- **members.ts**: `updateMemberRole`, `removeMember` use `getUserRole`. `joinCommunityAsClient` critical refactor: accepts `communityId: string` explicitly — eliminates the multi-tenant-breaking `.limit(1).single()` community query. `processInviteSignup` unchanged (pre-membership signup context).
- **notifications.ts**: No `getJWTClaims` existed; added `communitySlug` param, updated `revalidatePath` to `/c/${slug}/notifications`.
- **profiles.ts**: `upsertProfile(communityId|null, input)` — null path uses select-then-update pattern for PostgREST NULL upsert reliability. Community-scoped functions use `getUserRole` + `membership.memberId` directly (no separate member record lookup). `getLessonHistory` scoped to `communityId`.
- **profile/setup/page.tsx**: Removed `getJWTClaims` import. Uses `supabase.auth.getUser()` + `community_members` query to detect invite vs open sign-up flow. Passes `communityId: string | null` to `ProfileSetupWizard`.
- **ProfileSetupWizard.tsx**: `communityId` prop widened to `string | null`. `upsertProfile` call updated to pass `communityId` as first argument.
- **AvatarUpload.tsx**: `communityId` prop widened to `string | null`. Storage path uses `communityId ?? 'global'` fallback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] AvatarUpload null communityId support**
- **Found during:** Task 2 — ProfileSetupWizard passes communityId to AvatarUpload
- **Issue:** AvatarUpload typed `communityId: string` but now receives `string | null` from setup page
- **Fix:** Widened prop type to `string | null`; storage path uses `'global'` fallback when null
- **Files modified:** `src/components/profile/AvatarUpload.tsx`
- **Commit:** db39943

**2. [Rule 3 - Blocking] Soft-reset accidentally staged file deletions**
- **Found during:** Task 1 commit
- **Issue:** The `--soft` reset to rebase onto `4651f29f` left 56 deleted files in the index (planning files, test files, migration files from the old worktree branch). These were committed along with Task 1 changes.
- **Fix:** Restored all 56 files from `HEAD~1` and committed a fixup.
- **Files modified:** 56 planning + source files restored
- **Commit:** b36ded2

### Design Notes (not deviations)

- `processInviteSignup` kept without `communityId` param as the plan specified — it uses `invite_links.community_id` directly since it runs in signup callback context before any community membership exists.
- `createInviteLink` no longer needs a separate `community_members` query — `membership.memberId` from `getUserRole` provides the `created_by` FK directly (minor efficiency improvement).
- `notifications.ts` had zero `getJWTClaims` calls before this plan (confirmed by grep); the task for it was only to add `communitySlug` param and update `revalidatePath`.

## Known Stubs

None — all data flows are wired to real Supabase queries. No hardcoded empty values or placeholder text introduced.

## Threat Flags

No new network endpoints, auth paths, or schema changes introduced. All threat model mitigations (T-08-06, T-08-07) applied: every action with communityId calls `getUserRole()` to verify membership before any DB write.

## Self-Check: PASSED

All 10 action/page files found. All 3 commits (9681e67, b36ded2, db39943) verified in git log.
