# Phase 3: Player Profiles - Research

**Researched:** 2026-04-07
**Domain:** User profile data model, Supabase Storage avatar upload, multi-step wizard, lesson history queries, coach progress notes
**Confidence:** HIGH

## Summary

Phase 3 adds the player identity layer on top of the session management core. The work divides into four concrete areas: (1) database schema for three new tables (`player_profiles`, `coach_assessments`, `progress_notes`), (2) a profile setup wizard at `/profile/setup` with avatar upload to Supabase Storage, (3) a profile view page at `/profile` showing skill levels and lesson history, and (4) a progress notes UI bolted onto the existing session detail page at `/coach/sessions/[sessionId]`.

All patterns are established by Phase 1 and 2: server actions in `src/lib/actions/` returning `{ success, data?, error? }`, `useActionState` for client-side form state, Zod 4 validation schemas, and community-scoped RLS policies using `auth.jwt() ->> 'community_id'`. The profile setup wizard is a multi-step client component that drives a single server action on final submit — it does not need per-step server round trips.

The key architectural decision is where name/display data lives. The session detail page already queries `community_members.display_name` but that column does not exist in the migrations yet — Phase 3 must add it (or a `player_profiles` table provides it). The cleanest approach is: `player_profiles` holds rich profile data (bio, phone, avatar_url, skill levels) and `community_members.display_name` is set/synced when the profile is saved.

**Primary recommendation:** Add `player_profiles` + `coach_assessments` + `progress_notes` tables in one migration (00004). Store avatars in a public Supabase Storage bucket `avatars` at path `{community_id}/{user_id}/avatar`. Keep the wizard as a client component managing step state, submitting to a single `upsertProfile` server action on the final step.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dedicated multi-step setup wizard after first login — WelcomePage (`/welcome`) is the entry point, linking to `/profile/setup`. Collects name, contact, avatar, bio, skill level. Users can skip and fill in later.
- **D-02:** Avatar via photo upload stored in Supabase Storage, with square cropper. Fallback to auto-generated initials avatar (e.g. "JP") if no photo uploaded.
- **D-03:** Contact info includes phone number field + email auto-populated from auth. Coaches can see player contact info — important for replacing Jaden's WhatsApp workflow.
- **D-04:** Same base profile for all roles. Coaches additionally get a coaching bio/specialties section and a "My Players" view.
- **D-05:** Tiered skill level: Beginner, Intermediate, Advanced. Set by both player (self-assessed) and coach (coach-assessed).
- **D-06:** Separate optional UTR (Universal Tennis Rating) field — numeric rating used in Australian tennis. Free text/number input, not required.
- **D-07:** Both self-assessed and coach-assessed levels displayed side-by-side on the profile. Coach assessment shown as the "official" rating.
- **D-08:** Coaches can update a player's assessed skill level anytime from the player's profile page — no session-tied workflow required.
- **D-09:** Reverse-chronological list of sessions attended. Each entry shows: date, time, venue, coach name. Tap to see session detail.
- **D-10:** Simple summary stats above the list: total sessions attended, number of coaches worked with, member since date.
- **D-11:** Coaches viewing a player's history see the same chronological list but with their progress notes shown inline next to each session they coached.
- **D-12:** Free text format for coach notes. Low friction, matches Jaden's current verbal/WhatsApp feedback style.
- **D-13:** Primary entry point for notes: session detail page. After a session, coach adds notes per attendee from the session view. Can also add notes from the player's profile.
- **D-14:** Players see coach notes inline in their lesson history — date, session info, and coach's note appear together in context.

### Claude's Discretion
- Setup wizard step count and exact flow/transitions
- Avatar cropper implementation details
- Profile page layout and section ordering
- Lesson history pagination/infinite scroll approach
- Empty state designs for new players with no sessions
- Progress note character limits (if any)
- Form validation timing (follow Phase 1 patterns)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROF-01 | User has profile with name, contact, avatar, bio | `player_profiles` table + Supabase Storage bucket `avatars` + `/profile/setup` wizard + `/profile` view page |
| PROF-02 | Player has skill level (self-assessed + coach-assessed) | `player_profiles.self_skill_level` + `coach_assessments` table + `/profile/[memberId]` coach view |
| PROF-03 | Player can view their lesson history (sessions attended, coaches) | Query `session_rsvps JOIN sessions JOIN session_coaches` scoped to current user's `member_id` |
| PROF-04 | Coach can add progress notes after sessions, visible to player | `progress_notes` table + note form in session detail page + inline display in lesson history |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.101.1 | Storage upload, DB queries | Already installed [VERIFIED: package.json] |
| @supabase/ssr | 0.10.0 | Server-side client | Already installed, Phase 1 pattern [VERIFIED: package.json] |
| zod | 4.3.6 | Profile form validation | Project standard (Phase 1 pattern) [VERIFIED: package.json] |
| react | 19.2.4 | Multi-step wizard state | Already installed [VERIFIED: package.json] |
| lucide-react | installed | Icons (avatar fallback, step indicators) | Used throughout project [VERIFIED: grep of components] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/image | built-in | Avatar display with optimisation | Always use over `<img>` for loaded avatar |
| sonner (toast) | installed | Success/error feedback on save | Already in `src/components/ui/sonner.tsx` [VERIFIED: ls ui/] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side crop with canvas API | react-image-crop / cropper.js | Canvas crop is hand-roll work; a library removes edge cases but adds bundle weight. Given D-02 says "square cropper", a lightweight approach is acceptable for MVP. |
| Public storage bucket (simple) | Signed URLs | Public bucket means avatar URLs never expire and require no server round-trip. Acceptable for avatars — no PII in the file itself. Private bucket adds server action on every image load. |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── profile/
│   │   ├── setup/
│   │   │   └── page.tsx          # Profile setup wizard entry (RSC shell)
│   │   ├── [memberId]/
│   │   │   └── page.tsx          # Coach view of another member's profile
│   │   └── page.tsx              # Own profile view
├── components/
│   └── profile/
│       ├── ProfileSetupWizard.tsx # Client component — wizard state machine
│       ├── ProfileView.tsx        # Profile display (RSC-compatible)
│       ├── LessonHistory.tsx      # Lesson history list
│       ├── ProgressNoteForm.tsx   # Coach note entry form
│       └── AvatarUpload.tsx       # Avatar upload + crop + fallback initials
├── lib/
│   ├── actions/
│   │   ├── profiles.ts            # upsertProfile, setCoachAssessment, addProgressNote
│   │   └── (existing actions)
│   ├── types/
│   │   └── profiles.ts            # PlayerProfile, CoachAssessment, ProgressNote types
│   └── validations/
│       └── profiles.ts            # Zod schemas for profile + note forms
└── supabase/
    └── migrations/
        └── 00004_player_profiles.sql
```

### Pattern 1: Multi-Step Wizard as Client Component
**What:** The setup wizard manages step index in local React state. Each step renders a sub-form. On the final step, it calls `upsertProfile` server action. No server round-trips between steps.
**When to use:** When step transitions are pure UI, intermediate data is not persisted, and there is a single final submission.
**Example:**
```typescript
// Source: Phase 1 pattern (useActionState in LoginForm.tsx)
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertProfile } from '@/lib/actions/profiles'

const STEPS = ['identity', 'contact', 'avatar', 'skill'] as const
type Step = typeof STEPS[number]

export function ProfileSetupWizard() {
  const [step, setStep] = useState<Step>('identity')
  const [formData, setFormData] = useState<Partial<ProfileFormData>>({})
  const router = useRouter()

  async function handleFinalSubmit(data: ProfileFormData) {
    const result = await upsertProfile(data)
    if (result.success) router.push('/profile')
  }
  // ...
}
```

### Pattern 2: Server Action for Profile Upsert
**What:** Server action in `src/lib/actions/profiles.ts` follows exact Phase 1/2 pattern — auth check, JWT claims, Supabase operation, typed return.
**When to use:** All DB writes. Never mutate DB from client components.
**Example:**
```typescript
// Source: Phase 1 pattern (invites.ts)
'use server'
import { createClient, getJWTClaims } from '@/lib/supabase/server'

export async function upsertProfile(
  input: ProfileFormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  if (!claims.community_id) return { success: false, error: 'No community' }

  const { error } = await supabase
    .from('player_profiles')
    .upsert({
      community_id: claims.community_id,
      user_id: user.id,
      display_name: input.displayName,
      phone: input.phone,
      bio: input.bio,
      self_skill_level: input.skillLevel,
      utr: input.utr ?? null,
      avatar_url: input.avatarUrl ?? null,
    }, { onConflict: 'user_id,community_id' })

  if (error) return { success: false, error: error.message }

  // Sync display_name to community_members for session detail page queries
  await supabase
    .from('community_members')
    .update({ display_name: input.displayName })
    .eq('user_id', user.id)
    .eq('community_id', claims.community_id)

  revalidatePath('/profile')
  return { success: true }
}
```

### Pattern 3: Avatar Upload to Supabase Storage
**What:** Client-side file input → browser Supabase client uploads to `avatars/{community_id}/{user_id}/avatar` → get public URL → pass URL to profile upsert action.
**When to use:** File uploads must come from the browser (FormData file cannot survive serialisation through a Next.js server action on current Supabase SDK).
**Example:**
```typescript
// Source: @supabase/storage-js StorageFileApi.ts (verified in node_modules)
// upload() signature: upload(path: string, fileBody: FileBody, fileOptions?: FileOptions)
// getPublicUrl() signature: getPublicUrl(path: string) => { data: { publicUrl: string } }

import { createClient } from '@/lib/supabase/client'

async function uploadAvatar(file: File, communityId: string, userId: string) {
  const supabase = createClient()
  const path = `${communityId}/${userId}/avatar`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) return { success: false, error: error.message }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return { success: true, avatarUrl: data.publicUrl }
}
```
Note: `getPublicUrl` is synchronous (no `await` needed). [VERIFIED: StorageFileApi.ts line 994]

### Pattern 4: Lesson History Query
**What:** Server component fetches RSVPs for the current user's `member_id`, joins sessions and session_coaches.
**When to use:** Profile page and `/profile/[memberId]` coach view.
**Example:**
```typescript
// Source: Phase 2 pattern (sessions/[sessionId]/page.tsx)
const { data: history } = await supabase
  .from('session_rsvps')
  .select(`
    id,
    created_at,
    sessions (
      id,
      scheduled_at,
      venue,
      duration_minutes,
      session_coaches (
        is_primary,
        community_members ( display_name )
      )
    )
  `)
  .eq('member_id', memberId)
  .eq('rsvp_type', 'confirmed')
  .is('cancelled_at', null)
  .order('created_at', { ascending: false })
```

### Pattern 5: Progress Notes Display
**What:** Join `progress_notes` to lesson history query. Notes are tied to `(session_id, subject_member_id)` — one note per coach-player-session.
**When to use:** Lesson history list (player view and coach view of player).

### Anti-Patterns to Avoid
- **File upload through server action:** Next.js server actions can accept FormData, but the Supabase Storage SDK upload from a server context requires the anon key on the server. Use the browser client for storage uploads, then pass the resulting URL to the server action. [ASSUMED: based on Supabase SDK architecture; confirm if server-side upload is required for RLS enforcement]
- **Separate DB rows for self vs coach assessment in the same table:** Store self-assessed in `player_profiles`, coach-assessed in a separate `coach_assessments` table. This keeps coach writes separate from player writes and makes RLS straightforward.
- **Storing `display_name` only on `player_profiles`:** The session detail page (Phase 2 code) already selects `community_members.display_name`. Phase 3 must add this column to `community_members` and sync it on profile save — otherwise Phase 2 queries return null names.
- **Skipping `upsert` for profiles:** Players may exit the wizard mid-way and restart. Use `upsert` with `onConflict: 'user_id,community_id'` to handle re-entry safely.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Avatar cropping | Custom canvas transform pipeline | HTML5 canvas `drawImage` with fixed aspect ratio (1:1) | Simple square crop needs only 10 lines of canvas code; a library is overkill for MVP. But do NOT write a general-purpose image manipulation library. |
| Initials avatar | SVG generation server-side | Inline SVG with CSS — first two letters of display_name, background colour from hash | Simple, zero-dependency, works without storage. |
| Skill level selector | Custom radio component | shadcn-style radio group with Tailwind classes | Three options (Beginner/Intermediate/Advanced) — use `<fieldset>` + styled radio inputs. |
| RLS for progress notes | Custom auth check in server action | Standard RLS policy on `progress_notes` table — only coaches can INSERT, owner and coach can SELECT | Same pattern as all Phase 2 tables. |

**Key insight:** Supabase Storage's `upload` + `getPublicUrl` covers all avatar storage needs. No custom file serving logic is needed.

---

## Database Schema (new migration: 00004_player_profiles.sql)

### Tables Required

**`player_profiles`** — one row per community member
```sql
create table public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  display_name text,
  phone text,
  bio text,
  avatar_url text,
  self_skill_level text check (self_skill_level in ('beginner', 'intermediate', 'advanced')),
  utr numeric(5,2),  -- optional, e.g. 4.50
  coaching_bio text,  -- coaches only, nullable for clients
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (community_id, user_id)
);
```

**`coach_assessments`** — coach sets skill level on a player, anytime (D-08)
```sql
create table public.coach_assessments (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  subject_member_id uuid references public.community_members(id) on delete cascade not null,
  coach_member_id uuid references public.community_members(id) on delete cascade not null,
  skill_level text not null check (skill_level in ('beginner', 'intermediate', 'advanced')),
  assessed_at timestamptz default now(),
  unique (community_id, subject_member_id, coach_member_id)
);
```

**`progress_notes`** — coach adds a note per player per session
```sql
create table public.progress_notes (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  session_id uuid references public.sessions(id) on delete cascade not null,
  subject_member_id uuid references public.community_members(id) on delete cascade not null,
  coach_member_id uuid references public.community_members(id) on delete cascade not null,
  note_text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (session_id, subject_member_id, coach_member_id)
);
```

**`community_members` alteration** — add `display_name` column (used by Phase 2 queries already)
```sql
alter table public.community_members
  add column if not exists display_name text;
```

### RLS Policy Pattern (same as Phase 1/2)
```sql
-- player_profiles: members can read all in community; only owner can write own profile
create policy "player_profiles_select"
on public.player_profiles for select to authenticated
using (community_id = ((select auth.jwt()) ->> 'community_id')::uuid);

create policy "player_profiles_insert"
on public.player_profiles for insert to authenticated
with check (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and user_id = (select auth.uid())
);

create policy "player_profiles_update"
on public.player_profiles for update to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and user_id = (select auth.uid())
);

-- coach_assessments: coaches/admins can insert and update; all members can read
create policy "coach_assessments_select"
on public.coach_assessments for select to authenticated
using (community_id = ((select auth.jwt()) ->> 'community_id')::uuid);

create policy "coach_assessments_upsert"
on public.coach_assessments for insert to authenticated
with check (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
);

-- progress_notes: coaches/admins write; owner player and writing coach can read
create policy "progress_notes_select"
on public.progress_notes for select to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and (
    ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
    or subject_member_id = (
      select id from public.community_members
      where user_id = (select auth.uid())
        and community_id = ((select auth.jwt()) ->> 'community_id')::uuid
      limit 1
    )
  )
);

create policy "progress_notes_insert"
on public.progress_notes for insert to authenticated
with check (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
);

create policy "progress_notes_update"
on public.progress_notes for update to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and coach_member_id = (
    select id from public.community_members
    where user_id = (select auth.uid())
    limit 1
  )
);
```

### Supabase Storage Bucket
- Bucket name: `avatars`
- Public: **true** (no signed URL needed; avatar URLs are not sensitive)
- Path pattern: `{community_id}/{user_id}/avatar` (no extension — upsert replaces in-place)
- RLS on storage objects: authenticated users can insert/update their own path prefix; all authenticated users can read (for coach viewing player profile)

---

## Common Pitfalls

### Pitfall 1: `display_name` Missing from `community_members`
**What goes wrong:** Phase 2 code (`/coach/sessions/[sessionId]/page.tsx`) already selects `community_members.display_name`. Without the column, queries return null and the UI shows user UUIDs as names.
**Why it happens:** The column was anticipated in Phase 2 code but never added to the schema.
**How to avoid:** The migration (00004) MUST include `alter table public.community_members add column if not exists display_name text` as the first statement. The `upsertProfile` server action MUST sync `display_name` back to `community_members` after saving.
**Warning signs:** Session detail page shows raw UUIDs for member names.

### Pitfall 2: Avatar Upload Timing — URL Before DB Write
**What goes wrong:** If the upload succeeds but the profile save fails, `avatar_url` is stored in Storage but never referenced in the DB. On retry the user re-uploads but the old file is orphaned.
**Why it happens:** Two-step operation with no transaction.
**How to avoid:** On avatar step, upload file and keep the URL in wizard state. Only persist to DB on final submit. If final submit fails, the orphan file is acceptable for MVP (storage cost is negligible). On successful upsert with `{ upsert: true }`, Storage overwrites the old file automatically.
**Warning signs:** Storage bucket accumulates orphaned files over time.

### Pitfall 3: `getPublicUrl` is Synchronous
**What goes wrong:** Developers `await` `getPublicUrl` and TypeScript does not catch it — the function returns `{ data: { publicUrl } }` directly (not a Promise).
**Why it happens:** Unlike most Supabase SDK methods, `getPublicUrl` is synchronous.
**How to avoid:** Do NOT `await` `supabase.storage.from('avatars').getPublicUrl(path)`. [VERIFIED: StorageFileApi.ts line 994 — no `async` keyword]

### Pitfall 4: Multi-Step Wizard Without useActionState
**What goes wrong:** Using `useActionState` for a multi-step wizard forces a server round-trip on every step, which resets form state.
**Why it happens:** `useActionState` is designed for single-form server submission, not step navigation.
**How to avoid:** Manage step index and accumulated form data with `useState`. Only call the server action on the final submit step. No `useActionState` in the wizard shell — only in the final step's submit handler (or use a direct `async` call pattern as in WelcomePage).

### Pitfall 5: Coach Assessment RLS Allows Player Self-Assessment Override
**What goes wrong:** If coach assessments and self-assessments share the same table, a client with a manipulated JWT could insert a "coach" assessment for themselves.
**Why it happens:** Role check in RLS can be bypassed via JWT manipulation if not carefully scoped.
**How to avoid:** Keep coach assessments in a separate `coach_assessments` table with RLS strictly checking `user_role in ('admin', 'coach')`. Self-assessed level lives in `player_profiles` which restricts writes to `user_id = auth.uid()`.

### Pitfall 6: Lesson History Query Without Filtering Cancelled RSVPs
**What goes wrong:** Cancelled RSVPs appear in lesson history, inflating session count stats.
**Why it happens:** `session_rsvps.cancelled_at` is nullable but not always filtered.
**How to avoid:** All lesson history queries MUST include `.is('cancelled_at', null)` filter. Phase 2 RSVP action patterns already demonstrate this (see `rsvps.ts` line 55).

---

## Code Examples

### Initials Avatar (no storage dependency)
```typescript
// Inline SVG fallback for when avatar_url is null
function InitialsAvatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
  // Deterministic colour from name hash
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      style={{ width: size, height: size, background: `hsl(${hue}, 60%, 55%)` }}
      className="rounded-full flex items-center justify-center text-white font-bold text-sm"
      aria-label={`Avatar for ${name}`}
    >
      {initials}
    </div>
  )
}
```

### Zod Profile Schema (following auth.ts pattern)
```typescript
// Source: Phase 1 pattern (src/lib/validations/auth.ts)
import { z } from 'zod'

export const ProfileSchema = z.object({
  displayName: z.string().min(1, { error: 'Name is required' }).max(80).trim(),
  phone: z.string().max(20).trim().optional(),
  bio: z.string().max(500).trim().optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  utr: z.number().min(1).max(16.5).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  coachingBio: z.string().max(500).trim().optional().nullable(),
})

export const ProgressNoteSchema = z.object({
  sessionId: z.string().uuid(),
  subjectMemberId: z.string().uuid(),
  noteText: z.string().min(1, { error: 'Note cannot be empty' }).max(2000).trim(),
})

export const CoachAssessmentSchema = z.object({
  subjectMemberId: z.string().uuid(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
})
```

### Lesson History Summary Stats Query
```typescript
// Source: Phase 2 pattern
const { data: rsvps } = await supabase
  .from('session_rsvps')
  .select('id, sessions(id, scheduled_at, session_coaches(member_id))')
  .eq('member_id', memberId)
  .eq('rsvp_type', 'confirmed')
  .is('cancelled_at', null)

const totalSessions = rsvps?.length ?? 0
const uniqueCoachIds = new Set(
  rsvps?.flatMap(r => (r.sessions as any)?.session_coaches?.map((sc: any) => sc.member_id) ?? [])
)
const coachCount = uniqueCoachIds.size
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` for route protection | `proxy.ts` (exports `proxy` function) | Next.js 16 | AGENTS.md explicitly warns about this; proxy pattern already in use [VERIFIED: src/proxy.ts] |
| `useFormState` (React DOM) | `useActionState` (React 19 core) | React 19 | Project already uses `useActionState` — confirmed in LoginForm.tsx [VERIFIED: grep] |
| Supabase `auth.users` email as display name | `community_members.display_name` from profile | Phase 3 | Phase 2 code anticipates this column; Phase 3 must add it |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Avatar upload should happen from the browser client (not server action) because file serialisation through server actions is unreliable for large files | Architecture Patterns / Pattern 3 | If Supabase server SDK supports upload from FormData fine, the pattern still works; browser-side is safer and matches Supabase docs examples |
| A2 | A public Storage bucket is appropriate for avatars (no PII in the file itself) | Architecture Patterns / Pattern 3 | If the project later requires private profiles, bucket must be changed to private with signed URLs |
| A3 | `progress_notes` unique constraint is per `(session_id, subject_member_id, coach_member_id)` — one note per coach per player per session, editable | Database Schema | If coaches need multiple notes per session per player, the unique constraint must be removed and notes become append-only |

---

## Open Questions

1. **`display_name` in `community_members` vs. profile-only**
   - What we know: Phase 2 session detail page selects `community_members.display_name` (lines 60, 85 of `/coach/sessions/[sessionId]/page.tsx`); the column does not exist in any migration yet.
   - What's unclear: Whether the column should be on `community_members` (synced from profile) or whether Phase 2 queries should be updated to join through `player_profiles`.
   - Recommendation: Add the column to `community_members` in migration 00004 and sync it on profile save. Avoids changing working Phase 2 queries.

2. **Coach "My Players" view scope**
   - What we know: D-04 says coaches get a "My Players" view. The existing data model has `community_members.coach_id` linking players to their assigned coach.
   - What's unclear: Whether "My Players" is in scope for this phase or is a Phase 4 dashboard feature (DASH-03 maps there).
   - Recommendation: Build the data foundations (profiles readable by coaches) but defer the dedicated coach dashboard view to Phase 4.

3. **`display_name` population for users who never complete setup**
   - What we know: Users can skip the wizard (D-01). Their `display_name` will be null.
   - What's unclear: What fallback name to show in session lists and lesson history.
   - Recommendation: Server-side fallback: use `auth.users.email` split on `@` as display name when `display_name` is null. This matches the spirit of Phase 2 code which falls back to `profile.user_id`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase Storage (avatars bucket) | PROF-01 avatar upload | Needs manual creation | — | Bucket must be created via Supabase dashboard or migration before deploy |
| node (for vitest) | Test suite | ✓ | 25.8.1 | — |
| vitest | Tests | ✓ | installed | — |

**Missing dependencies with no fallback:**
- Supabase Storage bucket `avatars` must be created (public) before avatar upload works. This is a deploy-time step, not a code step. Plan must include a Wave 0 task to create the bucket.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (jsdom environment) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/__tests__/actions/profiles.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROF-01 | `upsertProfile` saves name, contact, avatar_url, bio; rejects unauthenticated | unit | `npx vitest run src/__tests__/actions/profiles.test.ts` | ❌ Wave 0 |
| PROF-02 | `setCoachAssessment` only allowed for coach/admin; self-assessment saved on profile | unit | `npx vitest run src/__tests__/actions/profiles.test.ts` | ❌ Wave 0 |
| PROF-03 | Lesson history query returns confirmed non-cancelled RSVPs in reverse order | unit | `npx vitest run src/__tests__/actions/profiles.test.ts` | ❌ Wave 0 |
| PROF-04 | `addProgressNote` saves note; only coach can add; player can read own notes | unit | `npx vitest run src/__tests__/actions/profiles.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/actions/profiles.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/actions/profiles.test.ts` — covers PROF-01 through PROF-04 (follows `rsvps.test.ts` stub pattern)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase `getUser()` in every server action (Phase 1 pattern) |
| V3 Session Management | no | Handled by Phase 1 proxy/Supabase |
| V4 Access Control | yes | RLS policies scoped by `community_id` JWT claim; role check for coach-only writes |
| V5 Input Validation | yes | Zod 4 schemas — `ProfileSchema`, `ProgressNoteSchema`, `CoachAssessmentSchema` |
| V6 Cryptography | no | Avatars are public; no encryption needed |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Player writes coach assessment for themselves | Elevation of Privilege | Separate `coach_assessments` table with RLS `user_role in ('admin', 'coach')` |
| Cross-tenant profile read | Information Disclosure | All RLS policies filter `community_id = jwt.community_id` |
| Oversized file upload to storage | Denial of Service | Validate `file.size` client-side (e.g. max 5MB) before calling `storage.upload`; Supabase project settings can also cap file size |
| Path traversal in avatar storage path | Tampering | Path is constructed server-side from `community_id` + `user_id` from JWT — no user-controlled path segment |
| Coach reads progress notes for another community's player | Information Disclosure | `community_id` filter in `progress_notes` RLS policy |

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts` — upload signature, getPublicUrl synchronous return type [VERIFIED]
- `node_modules/zod/package.json` — version 4.3.6 [VERIFIED]
- `node_modules/next/package.json` — version 16.2.2 [VERIFIED]
- `src/lib/types/auth.ts` — UserRole, CommunityMember types, ROLE_ALLOWED_ROUTES includes `/profile` [VERIFIED]
- `src/lib/types/sessions.ts` — SessionRsvp, SessionCoach types for lesson history query [VERIFIED]
- `src/lib/actions/invites.ts` — server action pattern with `{ success, data?, error? }` return shape [VERIFIED]
- `src/lib/validations/auth.ts` — Zod 4 top-level API usage pattern [VERIFIED]
- `src/components/auth/LoginForm.tsx` — `useActionState` + field error pattern [VERIFIED]
- `src/components/welcome/WelcomePage.tsx` — links to `/profile/setup`; direct async call pattern [VERIFIED]
- `src/components/nav/AppNav.tsx` — no Profile nav link yet; needs adding [VERIFIED]
- `supabase/migrations/00001_foundation_schema.sql` — `community_members` schema (no `display_name` column) [VERIFIED]
- `supabase/migrations/00002_session_schema.sql` — RLS policy pattern using `auth.jwt() ->>` [VERIFIED]
- `src/app/coach/sessions/[sessionId]/page.tsx` — already queries `display_name` from `community_members` (column missing from schema) [VERIFIED]
- `vitest.config.ts` + `src/__tests__/actions/rsvps.test.ts` — test infrastructure and stub pattern [VERIFIED]

### Secondary (MEDIUM confidence)
- `node_modules/next/dist/docs/01-app/02-guides/forms.md` — Server Actions with FormData, `useActionState` pattern [VERIFIED from installed docs]

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from installed node_modules and package.json
- Architecture: HIGH — patterns directly read from existing Phase 1/2 code
- Database schema: HIGH — follows exact conventions of migrations 00001/00002/00003
- Pitfalls: HIGH — `display_name` absence verified from schema grep; `getPublicUrl` sync behaviour verified from StorageFileApi.ts
- Storage API: HIGH — verified from installed `@supabase/storage-js` source

**Research date:** 2026-04-07
**Valid until:** 2026-07-07 (stable dependencies; Supabase Storage API is stable)
