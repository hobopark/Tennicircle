# Phase 7: Member Management & Invite System - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins and coaches can manage members, send invite links, and assign clients — completing the member lifecycle that was stubbed in Phase 1. Covers: invite link UI, member roster with filtering, admin role management, and coach client assignment. Closes AUTH-04, AUTH-05, DASH-03 gaps from v1.0 audit.

</domain>

<decisions>
## Implementation Decisions

### Invite link UI & sharing
- **D-01:** Invite button lives on the member roster page — admin sees role selector (coach/client), coach sees client-only invite. No separate admin invite page.
- **D-02:** Invite links shared via copy-to-clipboard button with toast confirmation. No QR code or native share sheet — coaches paste into WhatsApp/text (matches Jaden's current workflow).
- **D-03:** Existing `createInviteLink` and `revokeInviteLink` actions in `src/lib/actions/invites.ts` are reused — only UI needs building.

### Member roster & filtering
- **D-04:** Single roster page at `/coach/clients` reworked to be role-adaptive. Coaches see all community members with a toggle for "My clients" / "All members". Admins see everything plus role management controls.
- **D-05:** Members without completed profiles shown with dimmed card + "Profile pending" badge. Remove the `.filter(p => p.hasProfile)` exclusion. Use `community_members.display_name` or email fallback for name, greyed-out avatar placeholder.
- **D-06:** Member cards show: display name, role badge (Admin/Coach/Client), assigned coach name (if client), and last session date. Consistent with existing client card pattern.

### Admin role management
- **D-07:** Inline actions on roster cards for role changes. Tap a member card to reveal: Promote to Coach, Grant Admin, Remove from community. Uses existing `updateMemberRole` and `removeMember` actions.
- **D-08:** Removing a member requires styled Dialog confirmation with member name and warning. Roland Garros orange for the confirm button (not red — per established preference). No browser dialogs.

### Coach client assignment
- **D-09:** "Assign to me" button visible on unassigned member cards when coach views "All members". One tap to claim. Reverse: "Remove from my clients" on assigned members.
- **D-10:** Multiple coaches can be assigned to the same client. Current `community_members.coach_id` single FK needs migration to a junction table (e.g., `coach_client_assignments`). A player might train with head coach and assistant.

### Claude's Discretion
- Search/filter within the roster (search by name, filter by role)
- Exact layout of inline role management actions (dropdown, expandable section, etc.)
- Empty state for roster when community has no members
- Invite link display format (full URL vs shortened)
- Loading states and skeleton designs for roster
- How the "My clients" / "All members" toggle is styled (tabs, segmented control, etc.)
- Preventing admin from demoting themselves (safety guard)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Vision, constraints, coaching hierarchy, multi-tenancy requirement
- `.planning/REQUIREMENTS.md` — MGMT-01 through MGMT-07 acceptance criteria
- `.planning/ROADMAP.md` — Phase 7 success criteria, gap closure notes
- `.planning/DESIGN-REF.md` — AceHub design direction, color tokens, card patterns

### Existing actions (must read for reuse)
- `src/lib/actions/invites.ts` — `createInviteLink`, `revokeInviteLink` — reuse, build UI on top
- `src/lib/actions/members.ts` — `updateMemberRole`, `removeMember`, `processInviteSignup` — reuse and extend
- `src/lib/types/auth.ts` — `UserRole`, `InviteLink` types, `ROLE_ALLOWED_ROUTES`

### Existing UI patterns (must read for consistency)
- `src/app/coach/clients/page.tsx` — Current clients page to rework into unified roster
- `src/components/sessions/InvitationManager.tsx` — Player picker pattern (for session templates, not community invites — but UI pattern is reusable)
- `src/components/profile/InitialsAvatar.tsx` — Avatar fallback component
- `src/components/nav/AppNav.tsx` — Navigation, may need updates

### Phase 1 context
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — D-05 through D-09: invite link and role decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/actions/invites.ts`: Invite link CRUD — create and revoke actions ready to use
- `src/lib/actions/members.ts`: Role update, member removal, invite signup processing — core actions exist
- `src/components/sessions/InvitationManager.tsx`: Player picker UI pattern with add/remove transitions — reuse pattern for client assignment
- `src/components/profile/InitialsAvatar.tsx`: Avatar placeholder for members without photos
- `src/components/ui/Dialog`: Styled Dialog component for confirmations
- `src/lib/supabase/server.ts`: `createClient`, `getJWTClaims` — established auth pattern

### Established Patterns
- Server actions in `src/lib/actions/` with `{ success, data?, error? }` return shape
- Role checks via `getJWTClaims(supabase)` for `user_role` and `community_id`
- Card-based UI with `bg-card rounded-2xl border border-border/50` styling
- Toast notifications via Sonner (`toast.success`, `toast.error`)
- `useTransition` for optimistic action feedback

### Integration Points
- `/coach/clients/page.tsx` — Primary page to rework (remove profile filter, add all-members query, add role controls)
- `community_members` table — Needs schema change: `coach_id` FK → junction table for multi-coach support
- `invite_links` table — Already exists with `token`, `role`, `community_id`, `created_by`, `revoked_at`
- `src/proxy.ts` — Route protection rules may need updates if new routes are added
- `ROLE_ALLOWED_ROUTES` in auth types — Needs updates for any new route patterns

</code_context>

<specifics>
## Specific Ideas

- Invite flow should match how Jaden currently shares via WhatsApp — generate link, copy, paste into group chat
- Roster should show profile-pending members rather than hiding them — coaches need visibility into who hasn't completed setup
- Multi-coach assignment reflects real-world tennis coaching: a player works with a head coach for strategy and an assistant for drills

</specifics>

<deferred>
## Deferred Ideas

- QR code generation for invite links — useful for in-person sharing at courts, but not MVP
- Native share sheet (Web Share API) — nice-to-have for mobile, not needed when copy+paste works
- Batch member assignment — bulk onboarding tool, could be its own feature
- Invite link expiry/time limits — current decision (Phase 1 D-08) is no expiry until revoked
- Member directory visible to all members (not just coaches/admins) — v2 feature per REQUIREMENTS.md

</deferred>

---

*Phase: 07-member-management-invites*
*Context gathered: 2026-04-09*
