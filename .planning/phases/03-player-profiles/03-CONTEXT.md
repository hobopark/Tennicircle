# Phase 3: Player Profiles - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Players have rich profiles and coaches can track progress and attendance history. Includes profile setup wizard, avatar upload, skill level system (tiered + UTR), lesson history from Phase 2 session data, and coach progress notes tied to sessions. This phase adds the player identity layer on top of the session management core.

</domain>

<decisions>
## Implementation Decisions

### Profile content & setup
- **D-01:** Dedicated multi-step setup wizard after first login — WelcomePage (`/welcome`) is the entry point, linking to `/profile/setup`. Collects name, contact, avatar, bio, skill level. Users can skip and fill in later.
- **D-02:** Avatar via photo upload stored in Supabase Storage, with square cropper. Fallback to auto-generated initials avatar (e.g. "JP") if no photo uploaded.
- **D-03:** Contact info includes phone number field + email auto-populated from auth. Coaches can see player contact info — important for replacing Jaden's WhatsApp workflow.
- **D-04:** Same base profile for all roles. Coaches additionally get a coaching bio/specialties section and a "My Players" view.

### Skill level system
- **D-05:** Tiered skill level: Beginner, Intermediate, Advanced. Set by both player (self-assessed) and coach (coach-assessed).
- **D-06:** Separate optional UTR (Universal Tennis Rating) field — numeric rating used in Australian tennis. Free text/number input, not required.
- **D-07:** Both self-assessed and coach-assessed levels displayed side-by-side on the profile. Coach assessment shown as the "official" rating.
- **D-08:** Coaches can update a player's assessed skill level anytime from the player's profile page — no session-tied workflow required.

### Lesson history display
- **D-09:** Reverse-chronological list of sessions attended. Each entry shows: date, time, venue, coach name. Tap to see session detail.
- **D-10:** Simple summary stats above the list: total sessions attended, number of coaches worked with, member since date.
- **D-11:** Coaches viewing a player's history see the same chronological list but with their progress notes shown inline next to each session they coached.

### Coach progress notes
- **D-12:** Free text format — coach writes whatever they want. Low friction, matches Jaden's current verbal/WhatsApp feedback style.
- **D-13:** Primary entry point: session detail page. After a session, coach adds notes per attendee from the session view. Can also add notes from the player's profile.
- **D-14:** Players see coach notes inline in their lesson history — date, session info, and coach's note appear together in context.

### Claude's Discretion
- Setup wizard step count and exact flow/transitions
- Avatar cropper implementation details
- Profile page layout and section ordering
- Lesson history pagination/infinite scroll approach
- Empty state designs for new players with no sessions
- Progress note character limits (if any)
- Form validation timing (follow Phase 1 patterns)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Vision, constraints, coaching hierarchy, WhatsApp-replacement context
- `.planning/REQUIREMENTS.md` — PROF-01 through PROF-04 acceptance criteria
- `.planning/ROADMAP.md` — Phase 3 success criteria and dependencies

### Phase 1 foundation (patterns to follow)
- `src/lib/types/auth.ts` — UserRole, CommunityMember types, ROLE_ALLOWED_ROUTES (already includes `/profile`)
- `src/lib/supabase/server.ts` — Server Supabase client pattern
- `src/lib/supabase/client.ts` — Browser Supabase client pattern
- `src/lib/actions/invites.ts` — Server action pattern with auth checks and typed returns
- `src/lib/validations/auth.ts` — Zod 4 validation pattern to replicate for profile forms
- `src/components/welcome/WelcomePage.tsx` — Already links to `/profile/setup`

### Phase 2 session data (lesson history source)
- `src/lib/types/sessions.ts` — Session and RSVP types for querying lesson history
- `src/lib/actions/rsvps.ts` — RSVP action patterns
- `src/app/coach/sessions/[sessionId]/page.tsx` — Session detail page where coach notes will be added

### UI components
- `src/components/ui/` — shadcn components: button, input, label, tabs, sonner (toast)

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/*` — shadcn Button, Input, Label, Tabs for profile forms
- `src/lib/utils.ts` — cn() utility for Tailwind class merging
- `src/lib/validations/auth.ts` — Zod 4 validation pattern to replicate
- `src/components/nav/AppNav.tsx` — Navigation component (may need profile link addition)
- `src/components/welcome/WelcomePage.tsx` — Entry point to profile setup flow

### Established Patterns
- Server actions in `src/lib/actions/` with `{ success, data?, error? }` return shape
- `useActionState` for form handling with inline field errors
- Supabase server client for DB operations
- Role-based access via `user.app_metadata.user_role` and `user.app_metadata.community_id`
- Next.js 16 proxy (`src/proxy.ts`) for route protection

### Integration Points
- `ROLE_ALLOWED_ROUTES` already includes `/profile` for all roles
- WelcomePage links to `/profile/setup` — the route needs to be created
- Session detail page (`/coach/sessions/[sessionId]`) — needs progress note UI added
- Supabase database — new tables needed: player_profiles, coach_assessments, progress_notes
- Supabase Storage — new bucket for avatar uploads
- Session RSVP data (`session_rsvps` table) provides lesson history queries

</code_context>

<specifics>
## Specific Ideas

- UTR (Universal Tennis Rating) is the standard in Australian tennis — Jaden's community uses it. Separate optional field alongside the Beginner/Intermediate/Advanced tier.
- Coach notes should feel like quick WhatsApp-style messages about a player's session — not formal reports. Low friction is key.
- Profile setup wizard is the natural continuation of the WelcomePage "You're in!" flow.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-player-profiles*
*Context gathered: 2026-04-07*
