# Phase 8: Community Selector & Open Sign-Up - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can belong to multiple communities and navigate between them. New users can discover and request to join communities. Admins can create new communities. Routing is restructured with community context in the URL. This is the MVP capstone phase — all existing pages migrate into community-scoped routes.

</domain>

<decisions>
## Implementation Decisions

### Route restructuring
- **D-01:** Routes use `/c/[slug]/*` pattern — all community-scoped pages live under `/c/[slug]/`. Examples: `/c/jaden-tennis/coach`, `/c/jaden-tennis/sessions`, `/c/jaden-tennis/events`.
- **D-02:** Existing pages physically move into `src/app/c/[slug]/` directory structure. No rewrites — file structure matches URL structure.
- **D-03:** `/c/[slug]/layout.tsx` resolves community from slug, looks up membership for role, wraps children in a `CommunityProvider` context. Child pages use `useCommunity()` hook.
- **D-04:** Profile stays global at `/profile` (own profile) and `/profile/setup` (initial setup). Member view within community context lives at `/c/[slug]/members/[memberId]`.
- **D-05:** Notifications are community-scoped at `/c/[slug]/notifications`.
- **D-06:** Old flat routes (`/coach`, `/sessions`, `/admin`, `/events`) redirect via proxy: 1 community → `/c/[slug]/{path}`, 0 or 2+ → `/communities`.
- **D-07:** Remove `/welcome` page entirely. The auto-join single-community flow is replaced by the community browser.

### JWT and auth changes
- **D-08:** Remove `community_id` from JWT custom claims — community context comes from URL slug, not JWT.
- **D-09:** Remove `user_role` from JWT custom claims — role is per-community, queried from `community_members` table for the current community.
- **D-10:** Remove the Custom Access Token Hook from Supabase entirely. JWT stays vanilla.
- **D-11:** All server actions receive `communityId` as an explicit parameter (not from `getJWTClaims()`). Pages pass it from `CommunityProvider` or route params.
- **D-12:** Permission checks in server actions query `community_members` for the user's role in the given community. Replaces `getJWTClaims()` role checks.

### Proxy decision tree
- **D-13:** Proxy executes a single combined query (profile + memberships + roles + slugs) to minimize DB round-trips.
- **D-14:** Full proxy decision tree:
  1. Not authenticated → public route? PASS, otherwise redirect `/auth`
  2. Authenticated + on `/auth` → redirect `/communities`
  3. Email not verified → redirect `/auth?error=email_not_verified`
  4. No profile (`player_profiles` row) → on `/profile/setup`? PASS, otherwise redirect `/profile/setup`
  5. On `/communities` → PASS (always allowed for authenticated users)
  6. On old flat route → redirect based on community count (see D-06)
  7. On `/c/[slug]/*` → not member? redirect `/communities`. Member? check role access → allowed? PASS, not allowed? redirect `/c/[slug]/[role-home]`
  8. Everything else → PASS
- **D-15:** Profile setup happens before community selection for ALL users (invite and open sign-up). Proxy enforces this at step 4.
- **D-16:** ROLE_HOME_ROUTES updated: admin → `/c/{slug}/admin`, coach → `/c/{slug}/coach`, client → `/c/{slug}/sessions`.
- **D-17:** Proxy enforces role-based route access within `/c/[slug]/*` (same protection as current flat routes, but community-scoped).

### RLS migration
- **D-18:** All RLS policies rewritten from `auth.jwt()->'community_id'` to `EXISTS(community_members WHERE user_id = auth.uid() AND community_id = table.community_id)`.
- **D-19:** RLS migration is a dedicated plan — all policies updated at once before route restructuring.
- **D-20:** Page queries always include explicit `.eq('community_id', communityId)` filter. RLS is the safety net (defense in depth), not the primary filter.
- **D-21:** Communities table gets a public read policy: all authenticated users can SELECT all communities (needed for browse section).

### Community picker UX
- **D-22:** `/communities` is a combined page: "Your Communities" section (approved memberships), "Pending" section (awaiting approval), "Browse Communities" section (undiscovered). Sections hide when empty.
- **D-23:** Every login lands on `/communities` — no auto-redirect past the picker, even for single-community users.
- **D-24:** Community cards in "Your Communities" show: name, member count, user's role badge, last activity. Card grid layout consistent with existing card patterns.
- **D-25:** Community switcher dropdown in AppNav — always present (even with 1 community). Shows current community (checked), other communities, and "Browse communities" link at bottom.
- **D-26:** Switcher navigates to `/c/[other-slug]/[role-home]` using correct role per community. A `useCommunities()` hook fetches all memberships with roles on mount.
- **D-27:** No unread notification badge count per community in the switcher dropdown for MVP.
- **D-28:** Admin sees a "+ Create" card in "Your Communities" section to create new communities.

### Community browser & join flow
- **D-29:** Browse community cards show: name, description, member count, and "Request to Join" button.
- **D-30:** Communities already joined or pending are hidden from Browse section. Data flow: all communities − memberships − pending requests = browse list.
- **D-31:** After requesting to join, button changes inline to "Pending Approval" (disabled, orange). Toast confirms: "Request sent! You'll be notified when approved."
- **D-32:** User can cancel a pending request via a "Cancel request" link on the pending card.
- **D-33:** No search/filter on community browser for MVP — just list all communities.

### Community creation
- **D-34:** Create Community dialog on `/communities` page — admin-only button. Fields: name (required), description (optional). Slug auto-generated from name.
- **D-35:** Add `description` text column (nullable) to `communities` table.
- **D-36:** Creator becomes the first admin member of the new community.

### Join request approval
- **D-37:** Pending join requests appear as a "Pending Requests" section at the top of the member roster page (`/c/[slug]/coach/clients`).
- **D-38:** Both coaches and admins can approve/reject join requests. Clients cannot see pending requests.
- **D-39:** Approved users always get `client` role. Admins can promote later via existing roster role controls (Phase 7).
- **D-40:** Reject requires styled Dialog confirmation with member name. Roland Garros orange confirm button (not red). No reason field.
- **D-41:** Clients tab in AppNav shows a count badge when pending join requests exist.

### Data model changes
- **D-42:** New `join_requests` table: id (uuid PK), community_id (uuid FK), user_id (uuid FK), status (text: pending/approved/rejected), created_at (timestamptz), resolved_at (timestamptz null), resolved_by (uuid FK null).
- **D-43:** Communities table: add `description` text column (nullable).

### Notifications
- **D-44:** Approved users get in-app notification: "You've been accepted to [Community]! Tap to visit your new community."
- **D-45:** Rejected users get in-app notification: "Your request to join [Community] was not approved."
- **D-46:** No in-app notification for coaches/admins when someone requests to join — roster badge count (D-41) is sufficient.

### AppNav changes
- **D-47:** AppNav uses `useCommunity()` context for slug and role. All nav links become `/c/{slug}/...`.
- **D-48:** Role-based tab visibility uses role from CommunityProvider context (not JWT claims).

### Loading states
- **D-49:** Every route directory under `/c/[slug]/` gets a `loading.tsx` skeleton file: admin, coach, coach/schedule, coach/clients, sessions, sessions/calendar, events, notifications. Also `/communities/loading.tsx`.

### Edge cases
- **D-50:** User removed from community while active → next proxy request detects non-membership → redirect to `/communities`. No error page.
- **D-51:** Invite link sign-ups bypass join request approval — `processInviteSignup()` continues to auto-assign role and community membership directly.
- **D-52:** Cron job (`/api/cron/session-reminders`) is unaffected — uses service role key, not JWT claims.

### Claude's Discretion
- Community card visual design details (shadows, borders, hover states)
- Exact layout of pending requests section on roster
- Community switcher dropdown animation and positioning
- Loading skeleton designs for each route
- Error state handling for failed join requests
- How slug auto-generation handles special characters and collisions
- Exact combined proxy query SQL structure

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Vision, constraints, multi-tenancy requirement, key decisions (community creation admin-only, open sign-up flow, post-login picker)
- `.planning/REQUIREMENTS.md` — COMM-01 through COMM-06 acceptance criteria
- `.planning/ROADMAP.md` — Phase 8 success criteria (7 items)
- `.planning/DESIGN-REF.md` — AceHub design direction, color tokens, card patterns

### Current routing and auth (must read to understand migration scope)
- `src/proxy.ts` — Current proxy configuration (to be restructured)
- `src/lib/supabase/middleware.ts` — Current proxy logic with JWT-based routing (to be rewritten)
- `src/lib/types/auth.ts` — `UserRole`, `ROLE_HOME_ROUTES`, `ROLE_ALLOWED_ROUTES`, `JWTCustomClaims` (to be updated)
- `src/lib/supabase/server.ts` — `getJWTClaims()` function (to be replaced)

### Pages being migrated (must read for move to /c/[slug]/)
- `src/app/coach/page.tsx` — Coach dashboard
- `src/app/coach/schedule/page.tsx` — Coach schedule
- `src/app/coach/clients/page.tsx` — Member roster (Phase 7) — pending requests section added here
- `src/app/coach/clients/RosterClientWrapper.tsx` — Client-side roster component
- `src/app/sessions/page.tsx` — Client sessions
- `src/app/sessions/calendar/page.tsx` — Calendar view
- `src/app/events/page.tsx` — Events page
- `src/app/notifications/page.tsx` — Notifications
- `src/app/admin/page.tsx` — Admin page
- `src/app/profile/page.tsx` — Profile (stays global)

### Components being updated
- `src/components/nav/AppNav.tsx` — Needs community switcher dropdown and slug-based links
- `src/components/welcome/WelcomePage.tsx` — To be removed

### Server actions being updated (communityId parameter migration)
- `src/lib/actions/members.ts` — `joinCommunityAsClient` (to be reworked), role/member management
- `src/lib/actions/sessions.ts` — All session actions
- `src/lib/actions/events.ts` — All event actions
- `src/lib/actions/rsvps.ts` — RSVP actions
- `src/lib/actions/announcements.ts` — Announcement actions
- `src/lib/actions/notifications.ts` — Notification actions
- `src/lib/actions/invites.ts` — Invite actions
- `src/lib/actions/profiles.ts` — Profile actions

### Prior phase context
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — Original JWT Hook and routing decisions (being reversed)
- `.planning/phases/07-member-management-invites/07-CONTEXT.md` — Roster UI, invite flow, role management (building on top)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/Dialog` — Styled Dialog for reject confirmation
- `src/components/profile/InitialsAvatar.tsx` — Avatar fallback for community cards
- `src/components/sessions/InvitationManager.tsx` — Card-based list pattern reusable for community cards
- Toast notifications via Sonner — reuse for join request feedback
- `useTransition` pattern — reuse for optimistic approve/reject feedback

### Established Patterns
- Server actions return `{ success, data?, error? }` shape — new actions follow same pattern
- Card-based UI with `bg-card rounded-2xl border border-border/50` — community cards use same style
- `data-active` attribute for nav tab highlighting — community switcher follows same convention
- Roland Garros orange for destructive/action buttons — reject dialog uses this

### Integration Points
- `src/lib/supabase/middleware.ts` — Complete rewrite of proxy decision tree
- `src/lib/types/auth.ts` — Update ROLE_HOME_ROUTES, ROLE_ALLOWED_ROUTES, remove JWTCustomClaims
- `src/lib/supabase/server.ts` — Remove `getJWTClaims()`, add `getUserRole(supabase, communityId)` helper
- `src/app/layout.tsx` — Root layout stays, /c/[slug]/layout.tsx added as community layout
- All existing page.tsx files — move into /c/[slug]/ and update data fetching
- All server actions — add communityId parameter, replace getJWTClaims() with community_members queries
- Phase 5 notification system — add join_approved and join_rejected notification types

</code_context>

<specifics>
## Specific Ideas

- Community picker always shown after login — no auto-skip, consistent experience for all users
- Community switcher dropdown always present in nav (even with 1 community) with "Browse communities" link
- Proxy uses a single combined SQL query for profile + memberships to minimize latency
- Defense in depth: explicit `.eq('community_id', communityId)` on every query + RLS as safety net
- Invite flow preserves existing behavior — invite links bypass join request approval entirely
- Cron jobs unaffected — they use service role key, not JWT claims
- No search/filter on community browser for MVP — just list all communities in card grid

</specifics>

<deferred>
## Deferred Ideas

- Notification badge count per community in switcher dropdown — adds cross-community query overhead
- In-app notification when someone requests to join — roster badge is sufficient for MVP
- Community search/filter — not needed with handful of communities
- Community cover images / custom branding — future enhancement
- QR code for community sharing — deferred from Phase 7
- Native share sheet (Web Share API) — deferred from Phase 7
- Real-time kick detection via Supabase Realtime when removed from community — next-request redirect is sufficient

</deferred>

---

*Phase: 08-community-selector*
*Context gathered: 2026-04-09*
