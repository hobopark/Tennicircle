# Phase 7: Member Management & Invite System - Research

**Researched:** 2026-04-09
**Domain:** Supabase schema migration + Next.js 16 App Router UI (member roster, invite links, role management, coach-client assignment)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Invite button lives on the member roster page — admin sees role selector (coach/client), coach sees client-only invite. No separate admin invite page.
- **D-02:** Invite links shared via copy-to-clipboard button with toast confirmation. No QR code or native share sheet.
- **D-03:** Existing `createInviteLink` and `revokeInviteLink` actions in `src/lib/actions/invites.ts` are reused — only UI needs building.
- **D-04:** Single roster page at `/coach/clients` reworked to be role-adaptive. Coaches see all community members with a toggle for "My clients" / "All members". Admins see everything plus role management controls.
- **D-05:** Members without completed profiles shown with dimmed card + "Profile pending" badge. Remove the `.filter(p => p.hasProfile)` exclusion. Use `community_members.display_name` or email fallback for name, greyed-out avatar placeholder.
- **D-06:** Member cards show: display name, role badge (Admin/Coach/Client), assigned coach name (if client), and last session date. Consistent with existing client card pattern.
- **D-07:** Inline actions on roster cards for role changes. Tap a member card to reveal: Promote to Coach, Grant Admin, Remove from community. Uses existing `updateMemberRole` and `removeMember` actions.
- **D-08:** Removing a member requires styled Dialog confirmation with member name and warning. Roland Garros orange for the confirm button (not red). No browser dialogs.
- **D-09:** "Assign to me" button visible on unassigned member cards when coach views "All members". One tap to claim. Reverse: "Remove from my clients" on assigned members.
- **D-10:** Multiple coaches can be assigned to the same client. Current `community_members.coach_id` single FK needs migration to a junction table (`coach_client_assignments`). A player might train with head coach and assistant.

### Claude's Discretion

- Search/filter within the roster (search by name, filter by role)
- Exact layout of inline role management actions (dropdown, expandable section, etc.)
- Empty state for roster when community has no members
- Invite link display format (full URL vs shortened)
- Loading states and skeleton designs for roster
- How the "My clients" / "All members" toggle is styled (tabs, segmented control, etc.)
- Preventing admin from demoting themselves (safety guard)

### Deferred Ideas (OUT OF SCOPE)

- QR code generation for invite links
- Native share sheet (Web Share API)
- Batch member assignment
- Invite link expiry/time limits (no expiry until revoked per Phase 1 D-08)
- Member directory visible to all members (v2 feature)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MGMT-01 | Admin can send invite links specifying coach or client role | `createInviteLink` action exists; only UI needed (D-03). Role selector for admin, client-only for coach. |
| MGMT-02 | Admin can add/remove coaches from the community | `updateMemberRole` + `removeMember` actions exist. Inline card actions (D-07). Role guard in action already enforces admin-only. |
| MGMT-03 | Admin can grant admin privilege to any community member | Same `updateMemberRole` action — `newRole` accepts `'admin'`. Self-demotion guard is Claude's discretion. |
| MGMT-04 | New sign-up without invite link is assigned client role with no coach | `processInviteSignup` already handles invite path. Open sign-up path (no invite token) hits `welcome` page and needs a fallback that creates a `client` `community_members` row — currently no community context means the custom access token hook returns `pending`. Requires open sign-up flow fix. |
| MGMT-05 | Coach can view all community members with filter for own assigned clients | Rework `/coach/clients/page.tsx`: remove `.filter(p => p.hasProfile)`, add all-members query + toggle. Multi-coach requires junction table query. |
| MGMT-06 | Coach can assign/remove members to/from their own client list | New server actions `assignClient` / `removeClientAssignment` operating on `coach_client_assignments` junction table. |
| MGMT-07 | Members without completed profiles visible in roster with "profile pending" state | Remove `.filter(p => p.hasProfile)` from page data, add dimmed card style + badge for `!hasProfile` members. |
</phase_requirements>

---

## Summary

Phase 7 is largely a UI-build phase on top of existing server actions, with one significant schema migration: the `community_members.coach_id` single FK must become a `coach_client_assignments` junction table to support multi-coach assignment (D-10). The server actions for invites, role updates, and member removal are already implemented — the planner should treat them as done and focus task effort on: (1) the junction table migration + new assignment actions, (2) the open sign-up community assignment gap (MGMT-04), (3) the reworked roster page with toggle/filtering, (4) role-adaptive invite UI, and (5) the inline action controls.

The existing roster page at `/coach/clients/page.tsx` has `.filter(p => p.hasProfile)` on line 143 which must be removed (D-05/MGMT-07). The `processInviteSignup` in `members.ts` currently sets `coach_id` on the `community_members` row — once the junction table lands, this logic must update to insert into `coach_client_assignments` instead.

MGMT-04 (open sign-up without invite) is the most architecturally novel requirement: currently a user who signs up without an invite ends up with `user_role: 'pending'` and no `community_members` row. The welcome page must detect this and either (a) guide them to request membership or (b) automatically assign them as a client to the default community. Per D-10 from Phase 1 context (single community per user for MVP), option (b) is appropriate — but requires reading the single community from the `communities` table since there is no `community_id` in the JWT yet.

**Primary recommendation:** Execute in three waves: (1) schema migration for junction table + new assignment actions, (2) roster page rework + invite UI, (3) open sign-up flow fix for MGMT-04 and admin role page if needed.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.101.1 | DB queries, auth | Project stack — non-negotiable |
| @supabase/ssr | 0.10.0 | Server client factory | Established pattern |
| Next.js App Router | 16.2.2 | Page routing, Server Actions | Project stack |
| React | 19.2.4 | UI components | Project stack |
| Tailwind CSS | 4 | Styling | Project stack |
| sonner | installed | Toast notifications | Established — `toast.success/error` |
| lucide-react | installed | Icons | Established throughout |
| @base-ui/react | installed | Dialog primitive | `src/components/ui/dialog.tsx` uses it |

[VERIFIED: codebase grep — all packages confirmed in use across existing components]

### No New Packages Required
All required UI primitives (Dialog, Button, Badge, Tabs, Select, Skeleton) already exist under `src/components/ui/`. The Clipboard API for copy-to-clipboard is native to the browser — no library needed.

**Installation:** None — zero new dependencies for this phase.

---

## Architecture Patterns

### Existing Pattern: Server Action Shape
All actions return `{ success: boolean; data?: T; error?: string }`. New actions (`assignClient`, `removeClientAssignment`) MUST follow this shape.

```typescript
// Pattern from src/lib/actions/members.ts
export async function assignClient(
  clientMemberId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }
  const claims = await getJWTClaims(supabase)
  if (claims.user_role !== 'coach' && claims.user_role !== 'admin') {
    return { success: false, error: 'Only coaches and admins can assign clients' }
  }
  // ... insert into coach_client_assignments
}
```
[VERIFIED: codebase — matches pattern in invites.ts and members.ts]

### Existing Pattern: useTransition for Action Feedback
Client components call server actions inside `startTransition`. This is used in `InvitationManager.tsx` and is the established pattern for optimistic UI.

```typescript
// Pattern from src/components/sessions/InvitationManager.tsx
const [isPending, startTransition] = useTransition()
function handleAssign(memberId: string) {
  startTransition(async () => {
    const result = await assignClient(memberId)
    if (result.success) {
      toast.success('Client assigned')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to assign client')
    }
  })
}
```
[VERIFIED: codebase — InvitationManager.tsx lines 26-56]

### Existing Pattern: Role-Gated Server Component Queries
`/coach/clients/page.tsx` demonstrates the established pattern: `getJWTClaims` → role check → conditional query branches. The reworked roster page follows exactly this pattern, extending it with a `userRole === 'admin'` branch.

### Existing Pattern: Dialog for Destructive Confirmation
`AppNav.tsx` shows the Dialog usage pattern with `@base-ui/react/dialog`. For the remove-member confirmation, use the same `Dialog/DialogContent/DialogFooter/DialogClose` structure with Roland Garros orange (`bg-orange-500 hover:bg-orange-600`) on the confirm button — matching the logout dialog pattern.
[VERIFIED: codebase — AppNav.tsx lines 179-195]

### Clipboard API Pattern (New — No Library)
```typescript
// Clipboard copy for invite link
async function copyInviteLink(token: string) {
  const url = `${window.location.origin}/auth?invite=${token}`
  await navigator.clipboard.writeText(url)
  toast.success('Link copied!')
}
```
The invite token is already stored in `invite_links.token` as a 64-char hex string. The invite link format is `/auth?invite=<token>` (matching `src/app/auth/confirm/route.ts` which reads `searchParams.get('invite')`).
[VERIFIED: codebase — auth/confirm/route.ts line 9, invites.ts insert with `token` default]

### Recommended Project Structure for New Files

```
src/
├── lib/
│   ├── actions/
│   │   └── members.ts          # ADD: assignClient, removeClientAssignment
│   └── types/
│       └── auth.ts             # ADD: CoachClientAssignment interface
├── app/
│   └── coach/
│       └── clients/
│           └── page.tsx        # REWORK: role-adaptive roster
├── components/
│   └── members/                # NEW directory
│       ├── MemberCard.tsx      # Card with role badge, pending state, inline actions
│       ├── InviteButton.tsx    # Generate link + copy-to-clipboard
│       ├── RemoveMemberDialog.tsx  # Styled confirmation dialog
│       └── RosterToggle.tsx    # My clients / All members toggle
└── supabase/
    └── migrations/
        └── 00008_coach_client_assignments.sql  # Junction table migration
```

### Anti-Patterns to Avoid
- **Calling `removeMember` without Dialog confirmation:** Per D-08 and project memory — no browser `confirm()`, always styled Dialog.
- **Filtering out `!hasProfile` members:** The `.filter(p => p.hasProfile)` on line 143 of `/coach/clients/page.tsx` must be removed, not preserved in a new path.
- **Using `community_members.coach_id` after migration:** Once junction table exists, the old FK column must not be used for new assignments. The column can be kept for migration compatibility but new code reads from `coach_client_assignments`.
- **Setting `coach_id` in `processInviteSignup`:** After junction table migration, the insert in `members.ts` line 59-60 must insert into `coach_client_assignments` instead of setting `coach_id` on `community_members`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clipboard copy | Custom clipboard hook | `navigator.clipboard.writeText()` | Native Web API, works in all modern browsers |
| Toast notifications | Custom toast state | `toast.success/error` from sonner | Already wired in layout |
| Confirmation dialogs | Custom modal state | `Dialog` from `@/components/ui/dialog` | Already built on @base-ui/react |
| Role badges | Custom badge component | `Badge` from `@/components/ui/badge` | Already exists in codebase |
| Loading skeletons | Custom CSS loaders | `Skeleton` from `@/components/ui/skeleton` | Already exists in codebase |
| Avatar fallback | Custom initials logic | `InitialsAvatar` from `@/components/profile/InitialsAvatar` | Already handles display name → initials |

---

## Critical Schema Finding: Junction Table Migration (D-10)

This is the highest-risk item in the phase. The `community_members.coach_id` column is a single FK. Decision D-10 requires multi-coach support via a junction table.

### Current Schema (`community_members`)
```sql
coach_id uuid references public.community_members(id)
```

### Required: New Junction Table
```sql
create table public.coach_client_assignments (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  coach_member_id uuid references public.community_members(id) on delete cascade not null,
  client_member_id uuid references public.community_members(id) on delete cascade not null,
  assigned_at timestamptz default now(),
  unique (coach_member_id, client_member_id)
);
```

### Impact on Existing Code

1. **`processInviteSignup` in `members.ts` (line 59-60):** Currently sets `coach_id: invite.created_by` when invite is from a coach. After migration, must insert into `coach_client_assignments` instead.

2. **`/coach/clients/page.tsx` (line 41):** Currently filters `eq('coach_id', selfMember.id)`. After migration, must join via `coach_client_assignments`.

3. **RLS on `coach_client_assignments`:** Coaches should be able to insert/delete their own assignments. Admins can manage all.

4. **`community_members.coach_id` column:** Keep the column (don't drop it — Joon pushes migrations manually via SQL Editor; dropping in the same migration as creating the junction table risks breaking existing data). Drop or nullify in a separate task only after junction table is populated.

[VERIFIED: codebase — 00001_foundation_schema.sql line 16, members.ts line 59-60, clients/page.tsx line 41]

### Migration Ordering: Manual Push Pattern
Per project memory: Joon pushes schema manually via SQL Editor, never CLI. The migration file goes in `supabase/migrations/` as a reference/source-of-truth but execution is manual. Plan must include a task that says "apply migration via Supabase SQL Editor before executing dependent code tasks."

---

## MGMT-04: Open Sign-Up Gap (Critical Architecture Decision)

**Current behavior:** A user who signs up without an invite token gets email-confirmed, runs through `/auth/confirm/route.ts`, and is redirected to `/welcome`. But no `community_members` row is created. The Custom Access Token Hook in `00001_foundation_schema.sql` (lines 73-98) runs `select role, community_id from community_members where user_id = ...` and finds nothing, so it sets `user_role: 'pending'`. The welcome page must handle this case.

**What the welcome page must do for MGMT-04:** When a user arrives at `/welcome` with `user_role: 'pending'`, auto-assign them as a `client` to the single community. This requires:
- A server action `joinCommunityAsClient(userId)` that:
  1. Reads the single community from `communities` table (MVP assumption: one community)
  2. Inserts a `community_members` row with `role: 'client'`, `coach_id: null`
  3. Calls `supabase.auth.refreshSession()` to force JWT refresh with new claims
- The welcome page client component calls this action on mount if `user_role === 'pending'`

**Edge case:** If there are multiple communities (multi-tenancy schema already supports this), the open sign-up flow becomes a community picker (Phase 8 scope). For Phase 7, assume single-community and insert into `communities limit 1`.

[VERIFIED: codebase — 00001_foundation_schema.sql lines 73-98, auth/confirm/route.ts, welcome/page.tsx needs review]
[ASSUMED: Single-community MVP assumption for MGMT-04 implementation]

---

## Common Pitfalls

### Pitfall 1: Stale JWT After Role Change
**What goes wrong:** `updateMemberRole` updates the DB but the user's JWT still has the old role for up to 1 hour. UI shows old role.
**Why it happens:** Custom Access Token Hook only runs on token refresh. Supabase does not push a new JWT on data change.
**How to avoid:** The comment in `members.ts` (line 27-30) already documents this: "the CALLER must call `supabase.auth.refreshSession()`". The client component that calls `updateMemberRole` must call `supabase.auth.refreshSession()` afterward if the target user is the currently logged-in user. For other users' role changes, no refresh is needed (it's their token, not yours).
**Warning signs:** Role badge updates in UI but nav tabs don't change; page refresh fixes it.
[VERIFIED: codebase — members.ts lines 27-31]

### Pitfall 2: RLS Gap on `coach_client_assignments`
**What goes wrong:** Coach can read all community members (existing policy `members_read_own_community`) but new junction table has no RLS → queries fail silently or return no rows.
**Why it happens:** New tables require explicit RLS policy setup on Supabase.
**How to avoid:** The migration SQL for `coach_client_assignments` must include RLS policies: select (all authenticated in community), insert (coach can insert where `coach_member_id = their own member id`), delete (coach can delete their own assignments; admin can delete any).

### Pitfall 3: `processInviteSignup` Still Writing `coach_id`
**What goes wrong:** After the junction table migration, invite sign-ups still write `coach_id` on `community_members` instead of inserting into `coach_client_assignments`. The coach assignment is silently lost or duplicated.
**Why it happens:** `members.ts` line 59-60 has `coach_id: invite.role === 'client' ? invite.created_by : null`. This code must be updated in the same PR as the junction table migration.
**How to avoid:** Junction table migration task must include updating `processInviteSignup` as a subtask before any other code ships.

### Pitfall 4: Roster Query Fan-Out Performance
**What goes wrong:** The existing clients page runs 5+ sequential queries (members → profiles → assessments → RSVPs → session dates). Adding all-community members (not just assigned clients) could multiply this.
**Why it happens:** The existing pattern is already verbose; widening the member set without batching makes it worse.
**How to avoid:** For the "All members" view, profiles and assessments are supplementary — fetch them after the primary member list, not as blocking dependencies. Use `Promise.all` for independent queries. The existing two-step RSVP approach is fine to keep.

### Pitfall 5: Self-Demotion Guard (Claude's Discretion)
**What goes wrong:** Admin demotes themselves to client, loses admin access, no way back.
**Why it happens:** `updateMemberRole` does not check if the target member is the calling user.
**How to avoid:** In the roster UI, disable role-change actions on the calling user's own card. Server-side guard is a bonus but not required for MVP since RLS already limits who can call the action.

### Pitfall 6: Clipboard API Requires HTTPS
**What goes wrong:** `navigator.clipboard.writeText()` throws in non-HTTPS contexts.
**Why it happens:** Clipboard API is a secure context API.
**How to avoid:** Vercel preview and production deployments are HTTPS. Local dev with `next dev` over localhost is treated as secure context by Chrome/Firefox. No workaround needed. If needed, fallback: `document.execCommand('copy')` (deprecated but functional).

---

## Code Examples

### Member Card with Profile-Pending State
```typescript
// Pattern: dimmed card + badge for !hasProfile
<div
  className={`bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3
    ${!player.hasProfile ? 'opacity-60' : ''}`}
>
  {!player.hasProfile ? (
    <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0" />
  ) : (
    <InitialsAvatar name={player.displayName} size={40} className="rounded-xl" />
  )}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-bold text-foreground truncate">{player.displayName}</p>
    {!player.hasProfile && (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        Profile pending
      </span>
    )}
  </div>
</div>
```
[VERIFIED: follows established card pattern from clients/page.tsx lines 166-169 and DESIGN-REF.md badge patterns]

### Invite Button with Copy-to-Clipboard
```typescript
// InviteButton client component pattern
'use client'
async function handleGenerateInvite(role: 'coach' | 'client') {
  setLoading(true)
  const result = await createInviteLink(role)
  if (result.success && result.data) {
    const url = `${window.location.origin}/auth?invite=${result.data.token}`
    await navigator.clipboard.writeText(url)
    toast.success('Invite link copied!')
  } else {
    toast.error(result.error ?? 'Failed to generate invite link')
  }
  setLoading(false)
}
```
[VERIFIED: createInviteLink returns `{ success, data: InviteLink }` — invites.ts line 8-9; token field confirmed in schema]

### Remove Member Dialog (Orange Confirm Button)
```typescript
// Per D-08: styled Dialog, Roland Garros orange, no browser confirm()
<Dialog open={showRemove} onOpenChange={setShowRemove}>
  <DialogContent showCloseButton={false}>
    <DialogTitle>Remove {memberName}?</DialogTitle>
    <DialogDescription>
      This will remove them from the community. They will lose access immediately.
    </DialogDescription>
    <DialogFooter>
      <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
      <Button
        onClick={handleRemove}
        className="bg-orange-500 hover:bg-orange-600 text-white"
      >
        Remove member
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```
[VERIFIED: Dialog component API from src/components/ui/dialog.tsx; orange button matches AppNav.tsx logout pattern line 188-190]

### Junction Table Query for "My Clients" Toggle
```typescript
// After junction table migration: filter by coach assignment
let membersQuery = supabase
  .from('community_members')
  .select(`
    id, user_id, display_name, role,
    coach_client_assignments!client_member_id(coach_member_id)
  `)
  .eq('community_id', communityId)

// For "My clients" toggle: filter via junction table
if (viewMode === 'my-clients' && userRole === 'coach' && selfMember) {
  membersQuery = supabase
    .from('coach_client_assignments')
    .select('client_member_id, community_members!client_member_id(*)')
    .eq('coach_member_id', selfMember.id)
}
```
[ASSUMED: Supabase foreign table join syntax — verify against Supabase docs before implementation]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `community_members.coach_id` single FK | `coach_client_assignments` junction table | Phase 7 (D-10) | Enables multi-coach per client; requires migration |
| `.filter(p => p.hasProfile)` hiding pending members | All members shown, pending state indicated | Phase 7 (D-05) | Coaches get visibility into onboarding funnel |
| Invite links via a separate admin page | Inline on roster page | Phase 7 (D-01) | Reduces navigation; matches coach workflow |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MGMT-04 open sign-up should auto-assign to the single community (MVP assumption) | MGMT-04 Gap section | If multiple communities exist, flow breaks — needs community picker (Phase 8) |
| A2 | Supabase foreign table join syntax for junction table query | Code Examples | Query may need restructuring; verify against Supabase docs |
| A3 | `navigator.clipboard.writeText()` works without fallback in all target environments | Clipboard section | If tested on non-HTTPS dev environment, will throw — add try/catch |

---

## Open Questions

1. **Where does the invite button appear for admins on the admin page vs roster page?**
   - What we know: D-01 says invite button lives on the roster page at `/coach/clients`
   - What's unclear: Admins have a separate `/admin` page (currently a placeholder) — does admin-specific management live there or all on `/coach/clients`?
   - Recommendation: Keep all member management on `/coach/clients` as D-04 specifies the "role-adaptive" roster. The `/admin` page remains a placeholder unless expanded in Phase 8.

2. **Should `community_members.coach_id` column be dropped in the Phase 7 migration or left?**
   - What we know: Joon pushes migrations manually. Dropping a column is destructive.
   - What's unclear: Whether any other code (not found in grep) still reads `coach_id` after the junction table ships.
   - Recommendation: Keep `coach_id` column but stop writing to it. Mark it deprecated in a SQL comment. Drop in a follow-up migration after confirming no reads.

3. **How does the welcome page currently handle the `pending` role?**
   - What we know: `src/app/welcome/page.tsx` exists but was not read — middleware redirects `pending` users there.
   - What's unclear: Whether the welcome page already has logic for community assignment or is purely a profile setup gate.
   - Recommendation: Read `welcome/page.tsx` during planning before writing MGMT-04 tasks.

---

## Environment Availability

Step 2.6: SKIPPED — this is a code/schema phase. All required tools (Node, npm, Supabase client libraries) are confirmed present from `CLAUDE.md` technology stack. Schema migrations are applied manually via Supabase SQL Editor per project preference.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MGMT-01 | `createInviteLink` enforces role restriction (coach cannot create coach invites) | unit | `npx vitest run src/lib/actions/invites.test.ts -x` | ❌ Wave 0 |
| MGMT-02 | `removeMember` rejects non-admin callers | unit | `npx vitest run src/lib/actions/members.test.ts -x` | ❌ Wave 0 |
| MGMT-03 | `updateMemberRole` accepts 'admin' as newRole for admin caller | unit | `npx vitest run src/lib/actions/members.test.ts -x` | ❌ Wave 0 |
| MGMT-04 | Open sign-up creates client membership in single community | unit | `npx vitest run src/lib/actions/members.test.ts -x` | ❌ Wave 0 |
| MGMT-05 | MemberCard renders with toggle visible for coach role | unit | `npx vitest run src/components/members/MemberCard.test.tsx -x` | ❌ Wave 0 |
| MGMT-06 | `assignClient` / `removeClientAssignment` respect coach-only guard | unit | `npx vitest run src/lib/actions/members.test.ts -x` | ❌ Wave 0 |
| MGMT-07 | MemberCard renders "Profile pending" badge when `hasProfile: false` | unit | `npx vitest run src/components/members/MemberCard.test.tsx -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/actions/invites.test.ts` — covers MGMT-01
- [ ] `src/lib/actions/members.test.ts` — covers MGMT-02, MGMT-03, MGMT-04, MGMT-06
- [ ] `src/components/members/MemberCard.test.tsx` — covers MGMT-05, MGMT-07
- [ ] `vitest.config.mts` already has jsdom + globals — no framework install needed

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth handled by Supabase + existing proxy |
| V3 Session Management | no | Existing JWT + cookie pattern unchanged |
| V4 Access Control | yes | Role checks in server actions + RLS policies |
| V5 Input Validation | yes | `role` parameter validated against enum in action |
| V6 Cryptography | no | Invite tokens generated by `gen_random_bytes(32)` — never hand-roll |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Coach escalating own role to admin via `updateMemberRole` | Elevation of Privilege | Server action checks `claims.user_role !== 'admin'` before allowing role update |
| Generating invite links for coach role as a coach | Elevation of Privilege | `createInviteLink` checks `role === 'coach' && userRole !== 'admin'` — already implemented |
| Client calling `assignClient` or `removeMember` | Tampering | Server action role guard + RLS `admins_manage_members` policy |
| Invite token enumeration (brute-force) | Information Disclosure | `gen_random_bytes(32)` = 64-char hex = 2^256 space — not enumerable |
| Admin removing themselves | Denial of Service | Self-demotion guard (Claude's discretion) — add as defensive check in UI |

[VERIFIED: codebase — invites.ts lines 20-25, members.ts lines 17-18, schema lines 48-50]

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] `src/lib/actions/invites.ts` — createInviteLink, revokeInviteLink implementation
- [VERIFIED: codebase] `src/lib/actions/members.ts` — updateMemberRole, removeMember, processInviteSignup implementation
- [VERIFIED: codebase] `supabase/migrations/00001_foundation_schema.sql` — community_members schema, RLS, Custom Access Token Hook
- [VERIFIED: codebase] `supabase/migrations/00004_player_profiles.sql` — display_name column, player_profiles schema
- [VERIFIED: codebase] `src/app/coach/clients/page.tsx` — current roster page, .filter(p => p.hasProfile) on line 143
- [VERIFIED: codebase] `src/components/ui/dialog.tsx` — Dialog API using @base-ui/react
- [VERIFIED: codebase] `src/components/nav/AppNav.tsx` — orange button pattern, role-based tab visibility
- [VERIFIED: codebase] `src/app/auth/confirm/route.ts` — invite token flow, ?invite= query param
- [VERIFIED: codebase] `src/lib/supabase/middleware.ts` — role routing, pending → /welcome redirect
- [VERIFIED: codebase] `.planning/DESIGN-REF.md` — card patterns, badge styles, color tokens

### Secondary (MEDIUM confidence)
- [CITED: project memory `feedback_supabase_migrations.md`] Joon pushes migrations manually via SQL Editor, never CLI
- [CITED: project memory `feedback_no_red.md`] Roland Garros orange instead of red for destructive confirm buttons
- [CITED: project memory `feedback_no_browser_dialogs.md`] Always use styled Dialog, never confirm()/alert()

### Tertiary (LOW confidence)
- [ASSUMED] Supabase foreign table join syntax for junction table select query

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in codebase
- Architecture: HIGH — patterns verified from existing files
- Schema migration: HIGH — verified from migration files; junction table shape is standard
- MGMT-04 open sign-up: MEDIUM — welcome page not read; single-community assumption is reasonable for MVP
- Pitfalls: HIGH — all rooted in specific lines of codebase code

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable stack — Supabase client and Next.js versions locked)
