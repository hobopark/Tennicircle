---
phase: 03-player-profiles
plan: 02
subsystem: profile-setup-wizard
tags: [profiles, wizard, avatar-upload, skill-level, supabase-storage, framer-motion]
dependency_graph:
  requires: [03-01]
  provides: [profile-setup-route, avatar-upload-component, skill-level-selector, initials-avatar]
  affects: [welcome-page-link, profile-route]
tech_stack:
  added: [framer-motion, sonner-toasts, canvas-crop-api]
  patterns: [multi-step-wizard, rsc-shell-client-wizard, supabase-storage-client-upload]
key_files:
  created:
    - src/app/profile/setup/page.tsx
    - src/components/profile/ProfileSetupWizard.tsx
    - src/components/profile/AvatarUpload.tsx
    - src/components/profile/InitialsAvatar.tsx
    - src/components/profile/SkillLevelSelector.tsx
  modified: []
decisions:
  - "Square avatar crop via HTML5 canvas to 400x400 before Supabase Storage upload; eliminates server-side image processing"
  - "InitialsAvatar is a server-compatible component (no use client) — safe to render in RSC contexts"
  - "UTR field parses string to float on submit rather than storing as string in formData"
  - "Page uses maybeSingle() for profile query to handle null gracefully without throwing"
metrics:
  duration_minutes: 35
  completed_date: "2026-04-07T14:08:09Z"
  tasks_completed: 2
  files_created: 5
  files_modified: 0
---

# Phase 3 Plan 2: Profile Setup Wizard Summary

**One-liner:** 4-step profile setup wizard at /profile/setup with canvas avatar crop, Supabase Storage upload, and initials fallback — submits via upsertProfile server action.

## What Was Built

### Task 1: Avatar upload, initials fallback, and skill level selector

**InitialsAvatar** (`src/components/profile/InitialsAvatar.tsx`): Server-compatible component (no `'use client'`) that renders a rounded-2xl gradient div with the first 2 initials extracted from the user's display name. Uses Tailwind gradient classes for design-system consistency.

**AvatarUpload** (`src/components/profile/AvatarUpload.tsx`): Client component handling the full avatar upload flow:
- File type validation (JPEG/PNG/WebP) with sonner toast errors
- 5MB size limit with toast error
- HTML5 canvas square crop: computes minimum dimension, centers crop, draws to 400x400
- Uploads cropped blob to `supabase.storage.from('avatars')` with `upsert: true`
- `getPublicUrl()` called synchronously (no await) per Supabase SDK spec
- Shows loading spinner during upload, switches to preview img on success

**SkillLevelSelector** (`src/components/profile/SkillLevelSelector.tsx`): Accessible `<fieldset>` with visually hidden `<legend>` and 3 radio options (Beginner/Intermediate/Advanced) styled as card tiles. Selected state indicated via `border-primary bg-primary/5`.

### Task 2: Profile setup wizard page and client wizard

**Page** (`src/app/profile/setup/page.tsx`): RSC shell that:
- Auth-guards with `getUser()` + redirect to `/auth`
- Reads `community_id` from JWT claims, redirects to `/welcome` if absent
- Fetches existing `player_profiles` row via `maybeSingle()` for edit-mode pre-fill
- Passes `existingProfile`, `email`, `communityId`, `userId` to wizard

**ProfileSetupWizard** (`src/components/profile/ProfileSetupWizard.tsx`): Client wizard managing all step state via `useState`:
- 4-step flow: identity (name + bio), contact (phone + read-only email), avatar (upload + initials fallback), skill (3-tier selector + optional UTR)
- Step indicator with Check icon for completed steps, `aria-current="step"` for active
- Step 0 validation: requires displayName, shows inline error
- Steps 1-3: all optional, "I'll do this later" skip link
- Final submit: calls `upsertProfile(formData)`, `toast.success('Profile saved')`, `router.push('/profile')`
- Edit mode: heading changes to "Edit your profile", button says "Save changes"
- Card wrapped in `<motion.div>` with `opacity: 0, y: -10` entrance animation

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

Per threat model in plan:

| Threat | Mitigation Applied |
|--------|-------------------|
| T-3-03: Path tampering | Avatar upload path `${communityId}/${userId}/avatar` built from RSC props (JWT-sourced), not user input |
| T-3-04: Denial of Service (file size) | `file.size > 5 * 1024 * 1024` check before any upload; toast.error on violation |
| T-3-07: Spoofing | RSC page uses `supabase.auth.getUser()` + redirect('/auth') guard |

## Known Stubs

None. All components are fully wired:
- AvatarUpload calls real Supabase Storage
- ProfileSetupWizard calls real upsertProfile server action
- Page fetches real profile data from player_profiles table

## Self-Check: PASSED

Files verified present:
- FOUND: src/components/profile/InitialsAvatar.tsx
- FOUND: src/components/profile/AvatarUpload.tsx
- FOUND: src/components/profile/SkillLevelSelector.tsx
- FOUND: src/components/profile/ProfileSetupWizard.tsx
- FOUND: src/app/profile/setup/page.tsx

Commits verified:
- 8fe08bc feat(03-02): add avatar upload, initials fallback, and skill level selector components
- cb49a50 fix(03-02): move profile components to correct src/components/profile location
- fa95384 feat(03-02): add profile setup wizard page and 4-step client wizard
