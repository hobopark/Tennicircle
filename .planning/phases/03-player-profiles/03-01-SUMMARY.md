---
phase: 03-player-profiles
plan: "01"
subsystem: data-foundation
tags: [migration, types, validation, server-actions, shadcn, framer-motion]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/00004_player_profiles.sql
    - src/lib/types/profiles.ts
    - src/lib/validations/profiles.ts
    - src/lib/actions/profiles.ts
  affects:
    - community_members (display_name column added)
    - storage.buckets (avatars bucket created)
tech_stack:
  added:
    - framer-motion 12.38.0
    - shadcn Avatar
    - shadcn Textarea
    - shadcn Badge
    - shadcn Separator
  patterns:
    - Zod 4 top-level API (z.string(), z.enum(), z.number())
    - Server action pattern with getUser() + getJWTClaims() auth
    - upsert with onConflict for idempotent writes
key_files:
  created:
    - supabase/migrations/00004_player_profiles.sql
    - src/lib/types/profiles.ts
    - src/lib/validations/profiles.ts
    - src/lib/actions/profiles.ts
    - src/__tests__/actions/profiles.test.ts
    - src/components/ui/avatar.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/separator.tsx
  modified:
    - package.json (framer-motion added)
    - package-lock.json
decisions:
  - "Supabase join rows typed as any with Array.isArray guard — Supabase infers joined tables as arrays; pattern follows rsvps.ts precedent"
  - "display_name synced to community_members after every profile upsert for denormalized display across sessions"
  - "getLessonHistory uses per-session loop for coaches/notes rather than single mega-join for clarity and maintainability"
metrics:
  duration_seconds: 253
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_created: 9
  files_modified: 2
---

# Phase 3 Plan 01: Player Profiles Data Foundation Summary

**One-liner:** Migration + types + Zod schemas + server actions for 3-table player profiles system with avatars storage bucket and RLS.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration, types, validations, UI installs | 1f0dfcf | 00004_player_profiles.sql, profiles.ts (types), profiles.ts (validations), avatar/textarea/badge/separator.tsx, package.json |
| 2 | Server actions and test stubs | a8b03e4 | src/lib/actions/profiles.ts, src/__tests__/actions/profiles.test.ts |

## What Was Built

### Database Migration (00004_player_profiles.sql)

- `player_profiles` table: community_id, user_id, display_name, phone, bio, avatar_url, self_skill_level (enum), utr (numeric), coaching_bio. Unique on (community_id, user_id). 3 RLS policies (select/insert/update).
- `coach_assessments` table: community_id, subject_member_id, coach_member_id, skill_level (enum), assessed_at. Unique on (community_id, subject_member_id, coach_member_id). 3 RLS policies.
- `progress_notes` table: community_id, session_id, subject_member_id, coach_member_id, note_text, timestamps. Unique on (session_id, subject_member_id, coach_member_id). 3 RLS policies with subject-player read access.
- `display_name` column added to existing `community_members` via `add column if not exists`.
- `avatars` storage bucket (public) with 3 storage object RLS policies (path scoped to `{community_id}/{user_id}`).

### TypeScript Types (src/lib/types/profiles.ts)

Exports: `PlayerProfile`, `CoachAssessment`, `ProgressNote`, `LessonHistoryEntry`, `LessonHistorySummary`, `SkillLevel`, `ProfileActionResult`.

### Zod Validations (src/lib/validations/profiles.ts)

- `ProfileSchema`: displayName (required, max 80), phone, bio, skillLevel enum, utr (1-16.5), avatarUrl, coachingBio
- `CoachAssessmentSchema`: subjectMemberId (uuid), skillLevel enum
- `ProgressNoteSchema`: sessionId (uuid), subjectMemberId (uuid), noteText (1-2000 chars)
- Type aliases: `ProfileInput`, `CoachAssessmentInput`, `ProgressNoteInput`

### Server Actions (src/lib/actions/profiles.ts)

- `getProfile(userId?)`: fetches profile + latest coach assessment for given or current user
- `upsertProfile(input)` (PROF-01): validates with ProfileSchema, upserts player_profiles, syncs display_name to community_members
- `setCoachAssessment(input)` (PROF-02): admin/coach role check, upserts coach_assessments
- `addProgressNote(input)` (PROF-04): admin/coach role check, upserts progress_notes, revalidates session path
- `updateProgressNote(noteId, noteText)`: updates existing note with auth check
- `getLessonHistory(memberId, limit, offset)` (PROF-03): paginated confirmed RSVPs with coaches, progress notes, and summary stats

### UI Dependencies Installed

shadcn Avatar, Textarea, Badge, Separator components + framer-motion 12.38.0.

### Test Stubs (src/__tests__/actions/profiles.test.ts)

19 `it.todo` stubs covering PROF-01 through PROF-04 across all 4 server action describes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type errors on Supabase join results**

- **Found during:** Task 2 verification (`npx tsc --noEmit`)
- **Issue:** Supabase infers foreign key joins as arrays, not single objects. Inline type annotations `{ community_members: { display_name: string | null } | null }` caused TS2352/TS2345 errors on 3 mapper functions in `getLessonHistory`.
- **Fix:** Cast join rows to `any` with `Array.isArray` guard to handle both array and object shapes. Pattern follows existing `resequenceWaitlist` in `rsvps.ts` which uses the same `any` cast.
- **Files modified:** `src/lib/actions/profiles.ts`
- **Commit:** a8b03e4

## Known Stubs

None — all server actions are fully wired. Test file contains `it.todo` stubs by design (plan requirement); these are intentional test placeholders for Wave 2+ implementation.

## Threat Flags

None — all new network surfaces (server actions + storage RLS) are within the plan's threat model (T-3-01 through T-3-06) and mitigations are implemented in the migration and server actions.

## Self-Check: PASSED

- supabase/migrations/00004_player_profiles.sql: FOUND
- src/lib/types/profiles.ts: FOUND
- src/lib/validations/profiles.ts: FOUND
- src/lib/actions/profiles.ts: FOUND
- src/__tests__/actions/profiles.test.ts: FOUND
- src/components/ui/avatar.tsx: FOUND
- src/components/ui/badge.tsx: FOUND
- src/components/ui/textarea.tsx: FOUND
- src/components/ui/separator.tsx: FOUND
- Commit 1f0dfcf: FOUND (feat(03-01): add player profiles migration, types, validations, and UI components)
- Commit a8b03e4: FOUND (feat(03-01): add player profile server actions and test stubs)
- npx tsc --noEmit: PASS
- npx vitest run profiles.test.ts: 19 todo / 0 fail
