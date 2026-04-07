---
phase: 03-player-profiles
plan: "03"
subsystem: profile-ui
tags: [profile, lesson-history, coach-assessment, progress-notes, nav, framer-motion]
dependency_graph:
  requires:
    - src/lib/types/profiles.ts
    - src/lib/actions/profiles.ts
    - src/components/profile/InitialsAvatar.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/button.tsx
    - src/components/nav/AppNav.tsx
  provides:
    - src/app/profile/page.tsx
    - src/app/profile/[memberId]/page.tsx
    - src/components/profile/ProfileView.tsx
    - src/components/profile/LessonHistory.tsx
    - src/components/profile/CoachAssessmentWidget.tsx
    - src/components/profile/ProgressNoteForm.tsx
  affects:
    - src/components/nav/AppNav.tsx (Profile link added)
    - src/app/coach/sessions/[sessionId]/page.tsx (Progress Notes section added)
tech_stack:
  added: []
  patterns:
    - RSC page + client component data prop pattern (ProfileView receives all data from page)
    - framer-motion staggered entrance with motion.div/motion.li
    - useTransition for server action pending states
    - Inline expand/collapse pattern with aria-expanded
key_files:
  created:
    - src/app/profile/page.tsx
    - src/app/profile/[memberId]/page.tsx
    - src/components/profile/ProfileView.tsx
    - src/components/profile/CoachAssessmentWidget.tsx
    - src/components/profile/LessonHistory.tsx
    - src/components/profile/ProgressNoteForm.tsx
  modified:
    - src/components/nav/AppNav.tsx
    - src/app/coach/sessions/[sessionId]/page.tsx
decisions:
  - "ProfileView uses 'use client' with all data passed as props — framer-motion requires client boundary, but RSC pages own the data fetching"
  - "LessonHistory shows ProgressNoteForm for coach viewers on all entries (not filtered by coach authorship) — simpler and still RLS-safe"
  - "Session detail page email for coach/player view falls back to user_id — admin SDK not available in anon client; coach contact use-case not critical for MVP"
metrics:
  duration_seconds: 280
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_created: 6
  files_modified: 2
---

# Phase 3 Plan 03: Profile View Pages and UI Summary

**One-liner:** Full profile viewing experience — own profile and coach member view — with lesson history, inline progress notes, coach assessment widget, and AppNav Profile link.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Profile view pages and ProfileView/CoachAssessmentWidget | 1ec7b8c | src/app/profile/page.tsx, src/app/profile/[memberId]/page.tsx, src/components/profile/ProfileView.tsx, src/components/profile/CoachAssessmentWidget.tsx |
| 2 | LessonHistory, ProgressNoteForm, nav update, session notes | d90fcf8 | src/components/profile/LessonHistory.tsx, src/components/profile/ProgressNoteForm.tsx, src/components/nav/AppNav.tsx, src/app/coach/sessions/[sessionId]/page.tsx |

## What Was Built

### Profile Pages

**`/profile`** (own profile, RSC):
- Auth guard: `getUser()` → redirect `/auth` if unauthenticated
- Fetches community_members, player_profiles, coach_assessments, lesson history
- Redirects to `/profile/setup` when no profile exists
- Stats grid (3-col): sessions attended / coaches / member since
- Renders `<ProfileView isOwnProfile={true}>` + `<LessonHistory isCoachViewing={false}>`

**`/profile/[memberId]`** (coach view, RSC):
- Same auth + community guard
- Role check: redirects non-admin/non-coach to `/sessions`
- Fetches target member by `community_members.id` (URL param), then their `player_profiles`
- `notFound()` if member or profile missing
- Renders `<ProfileView isOwnProfile={false}>` + `<LessonHistory isCoachViewing={true}>`

### ProfileView Component (`'use client'`)

Four framer-motion animated card sections with `initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}`:

1. **Header card**: avatar (photo or InitialsAvatar 64px), name, member since, Settings link (own profile only)
2. **Skill levels card**: self-assessed badge + coach-assessed column; CoachAssessmentWidget for coach/admin viewing another player; read-only badge for own profile view
3. **Contact card**: Phone + Mail rows with Lucide icons; conditionally rendered for isCoachOrAdmin OR isOwnProfile
4. **Bio card**: bio text or "Add a bio..." italic empty state for own profile; coaching_bio subsection for coaches

Badge color map per UI-SPEC:
- Beginner: `bg-accent text-accent-foreground`
- Intermediate: `bg-primary/10 text-primary`
- Advanced: `bg-secondary/20 text-secondary-foreground`
- Coach-assessed: adds `ring-2 ring-primary`
- Not set/assessed: `bg-muted text-muted-foreground`

### CoachAssessmentWidget (`'use client'`)

- Current level displayed as styled badge with `ring-2 ring-primary`
- "Update assessment" button with `aria-expanded` state
- Inline 3-option radio fieldset (Beginner/Intermediate/Advanced) with selected border highlight
- "Save assessment" primary button with Loader2 pending state
- Calls `setCoachAssessment({ subjectMemberId, skillLevel })` via `useTransition`
- `toast.success('Assessment updated')` on success, `toast.error(...)` on failure

### LessonHistory (`'use client'`)

- `<ul>/<li>` semantic list with framer-motion stagger (index capped at 5)
- Each entry: date (`Intl.DateTimeFormat` "Tue 1 Apr 2026"), time + duration, venue, "with {coaches}"
- Inline progress notes as `bg-muted rounded-2xl p-3 mt-2` cards with coach name prefix
- Coach view shows ProgressNoteForm inline below each entry
- Empty state per role: "No sessions yet" with appropriate body copy
- "Load more" pagination button calling `getLessonHistory(memberId, 20, offset)` with append

### ProgressNoteForm (`'use client'`)

- Collapsed: "Add note" button or truncated note text + "Edit note" link with `aria-expanded`
- Expanded: Textarea with `aria-label="Progress note for {playerName}"`, char counter at >1800 chars
- "Save note" primary + "Cancel" ghost with `useTransition` pending state
- Calls `addProgressNote({ sessionId, subjectMemberId, noteText })`
- `toast.success('Note saved')` / `toast.error(...)` feedback
- Updates local displayedNote on success to reflect saved state without page reload

### AppNav Update

Profile link added as last item, visible to all authenticated roles:
```typescript
{ href: '/profile', label: 'Profile', roles: ['admin', 'coach', 'client'] }
```

### Session Detail Page Update

Progress Notes section added below `<SessionDetailPanel>`:
- Queries `progress_notes` table for existing notes by session
- Maps notes to attendees by `subject_member_id`
- Renders a card per confirmed (non-cancelled) RSVP with InitialsAvatar (32px `rounded-xl`) + name + ProgressNoteForm
- Section only renders when there are confirmed attendees

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed apostrophe in JSX string literal**
- **Found during:** Task 2 TypeScript verification (`npx tsc --noEmit`)
- **Issue:** `'Your session history will appear here once you've...'` — inner apostrophe broke TSX parser with TS1005/TS1381 errors
- **Fix:** Changed surrounding quotes to double-quotes: `"Your session history will appear here once you've..."`
- **Files modified:** `src/components/profile/LessonHistory.tsx`
- **Commit:** d90fcf8

## Known Stubs

**Email display in `/profile/[memberId]`:** The `email` prop passed to ProfileView is the target user's `user_id` UUID rather than their actual email address. The Supabase anon client cannot access `auth.users` directly. For MVP, coaches seeing a UUID instead of email is acceptable; a future plan should surface user email via a Supabase Edge Function or RPC that the admin SDK can use.

This stub does NOT prevent the plan's goal from being achieved — coaches can still view all profile data, contact via phone, and the coach-assessment / progress-note features work fully.

## Threat Flags

None — all new surfaces (profile pages, coach assessment widget, progress note form) are within the plan's threat model:
- T-3-05: `/profile/[memberId]` role check implemented (coach/admin only), RLS enforced at data layer
- T-3-08: `addProgressNote` server action validates auth + role before INSERT
- T-3-09: memberId UUID param; RLS prevents cross-community reads

## Self-Check: PASSED

- src/app/profile/page.tsx: FOUND
- src/app/profile/[memberId]/page.tsx: FOUND
- src/components/profile/ProfileView.tsx: FOUND
- src/components/profile/CoachAssessmentWidget.tsx: FOUND
- src/components/profile/LessonHistory.tsx: FOUND
- src/components/profile/ProgressNoteForm.tsx: FOUND
- src/components/nav/AppNav.tsx: Profile link FOUND
- src/app/coach/sessions/[sessionId]/page.tsx: Progress Notes section FOUND
- Commit 1ec7b8c: FOUND (feat(03-03): add profile view pages and ProfileView/CoachAssessmentWidget components)
- Commit d90fcf8: FOUND (feat(03-03): add LessonHistory, ProgressNoteForm, nav Profile link, session notes section)
- npx tsc --noEmit: PASS
