# Phase 7 Evaluation: Member Management & Invites

**Evaluator:** Skeptical QA (separate from builder)
**Date:** 2026-04-09
**Phase:** 07-member-management-invites
**Requirements:** MGMT-01 through MGMT-07

---

## 1. Functionality (30%) -- Score: 6/10

### What works
- **MGMT-01 (Invite links):** `createInviteLink` server action generates tokens, `InviteButton` copies URL to clipboard with fallback. Role selector for admin, hardcoded client for coach. Server action has proper role guards. (`src/components/members/InviteButton.tsx`, `src/lib/actions/invites.ts`)
- **MGMT-02 (Promote to coach):** `updateMemberRole` enforces admin-only. MemberCard shows "Promote to Coach" button for admins viewing client cards. (`src/lib/actions/members.ts:7-31`, `src/components/members/MemberCard.tsx:181-189`)
- **MGMT-03 (Remove member):** `removeMember` is admin-only. RemoveMemberDialog uses styled dialog with orange confirm button (not red, per project memory). DB cascade handles junction table cleanup. (`src/lib/actions/members.ts:223-241`, `src/components/members/RemoveMemberDialog.tsx`)
- **MGMT-04 (Open sign-up):** `joinCommunityAsClient` hardcodes `role: 'client'`. WelcomePage auto-joins pending users with `joinFailed` guard against infinite retries. (`src/lib/actions/members.ts:95-139`, `src/components/welcome/WelcomePage.tsx:33-66`)
- **MGMT-05 (Roster page):** Page fetches all community members, displays via RosterClientWrapper with My clients / All members toggle. Empty states differentiated. (`src/app/coach/clients/page.tsx`)
- **MGMT-06 (Coach assign/unassign):** `assignClient` and `removeClientAssignment` with role guards. MemberCard toggles "Assign to me" / "Remove from my clients" based on `isAssignedToMe`. (`src/components/members/MemberCard.tsx:155-175`)
- **MGMT-07 (Profile-pending visible):** `hasProfile: false` members render with `opacity-60` and "Profile pending" badge. No filter removes them. (`src/components/members/MemberCard.tsx:87, 116-119`)

### What is broken or missing
- **JWT stale after role change:** `updateMemberRole` comment at `members.ts:27-31` explicitly says the caller MUST call `supabase.auth.refreshSession()`. MemberCard's `handleRoleChange` (line 62-72) only calls `router.refresh()` (Next.js server refresh), NOT `supabase.auth.refreshSession()`. The promoted/demoted user will have stale JWT claims until the next natural token refresh (up to 1 hour). This means a user promoted to coach will not see coach routes until their session refreshes. This is a **functional bug** in the primary MGMT-02 flow.
- **Invite link revocation has no UI:** `revokeInviteLink` exists in `invites.ts:54-69` but is dead code -- no component imports or calls it. A coach cannot revoke an invite they generated. This is a half-built feature.
- **No invite link management/history:** There is no way to see previously generated invite links. Each click of "Invite" generates a new token with no way to track or manage existing ones.
- **`removeMember` does not verify same community:** The server action deletes by `memberId` alone (`members.ts:236-237`) without checking the member belongs to the admin's community. RLS should catch this at the DB level, but the application layer has no guard -- if RLS is misconfigured, cross-community deletion is possible.
- **`revokeInviteLink` has no authorization check:** `invites.ts:54-69` only checks authentication, not that the caller created the invite or is admin. Any authenticated user could revoke any invite link by ID.

### Evidence
- `src/components/members/MemberCard.tsx:62-72` -- no `refreshSession` call
- `src/lib/actions/members.ts:27-31` -- comment warning about stale JWT
- `src/lib/actions/invites.ts:54-69` -- no role/ownership guard on revoke
- `revokeInviteLink` not imported anywhere in `src/components/` or `src/app/`

---

## 2. Product Depth (25%) -- Score: 5/10

### What is present
- Loading skeleton exists for the roster page (`src/app/coach/clients/loading.tsx`)
- Empty states for both toggle views: "No clients assigned" / "No members yet" with helpful sub-copy (`RosterClientWrapper.tsx:29-39`)
- Clipboard fallback when `navigator.clipboard` is blocked (`InviteButton.tsx:26-29`)
- Duplicate assignment handled gracefully (`members.ts:177`)
- "Already a community member" recovery in WelcomePage auto-join (`WelcomePage.tsx:43-57`)
- `joinFailed` state prevents infinite retry loop (`WelcomePage.tsx:18, 34`)

### What is missing
- **42 test stubs, 0 implemented for Phase 7:** All three Phase 7 test files (`invites.test.ts`, `members.test.ts`, `MemberCard.test.tsx`) contain only `it.todo()` stubs. Zero actual test implementations. The 07-00-SUMMARY explicitly says "These files ARE the stubs by design" and no subsequent plan implemented any. The vitest output confirms: 124 todo stubs total, 79 passing tests (all from other phases). This is a significant product depth gap -- the entire phase ships with zero automated verification.
- **No confirmation before role promotion:** Promoting a member to coach or granting admin is a one-click action with no confirmation dialog. Removing a member gets an orange dialog; promoting to admin does not. An accidental tap promotes someone irreversibly (no demote-from-admin button exists either -- admin can only be demoted if they are coach role, per `MemberCard.tsx:200-209`).
- **No demote-from-admin:** `MemberCard.tsx:190-199` shows "Grant Admin" for non-admin, and line 200 shows "Demote to Client" only for `member.role === 'coach'`. There is no path to demote an admin back to coach or client. Once admin is granted, it cannot be revoked through the UI.
- **Member count is pre-filter only:** The header shows `Members ({allMemberCards.length})` (`page.tsx:149`) which is always the total count. When toggled to "My clients", the count does not update to reflect the filtered view. This is confusing.
- **No search/filter on roster:** For a community with dozens of members, there is no search bar or filter mechanism. The design ref mentions a search bar pattern (`DESIGN-REF.md:107`).
- **No indication of who invited whom:** The invite link flow generates tokens but there is no tracking visible to the admin/coach of which invites are outstanding or who joined via which link.

### Evidence
- `src/lib/actions/invites.test.ts` -- 7 `it.todo` stubs, 0 implementations
- `src/lib/actions/members.test.ts` -- 22 `it.todo` stubs, 0 implementations
- `src/components/members/MemberCard.test.tsx` -- 13 `it.todo` stubs, 0 implementations
- `src/components/members/MemberCard.tsx:190-209` -- no admin demotion path

---

## 3. UX & Design (25%) -- Score: 6/10

### What aligns with design reference
- Card border style matches: `bg-card rounded-2xl border border-border/50 p-4` (`MemberCard.tsx:85`). Note: DESIGN-REF says `rounded-3xl` for cards, implementation uses `rounded-2xl`. This is a conscious deviation (MemberCard is a list item, not a content card), but inconsistent.
- Role badge follows the micro-text pattern: `text-[10px] font-medium px-2 py-0.5 rounded-full` matches DESIGN-REF badge spec (`MemberCard.tsx:112`)
- Orange for destructive actions instead of red (per project memory `feedback_no_red.md`): `bg-orange-500 hover:bg-orange-600` on RemoveMemberDialog (`RemoveMemberDialog.tsx:54`) and orange border on remove button (`MemberCard.tsx:213`)
- `font-heading font-bold text-2xl` on page title matches DESIGN-REF display heading spec (`page.tsx:148-150`)
- Empty state uses `font-heading font-bold text-base` matching section header spec (`RosterClientWrapper.tsx:31`)
- Styled Dialog component used instead of browser `confirm()` (per `feedback_no_browser_dialogs.md`)

### What deviates or is missing
- **No framer-motion animations:** DESIGN-REF specifies entrance animations (`initial={{ opacity: 0, y: -10 }}`) as a key design element. No member components use any animation. The expand/collapse on MemberCard has no transition animation -- it jumps between states.
- **No accessibility attributes:** Zero `aria-*` or `role=` attributes in any Phase 7 component. The RosterToggle (`RosterToggle.tsx`) is a segmented control built with plain `<button>` elements but lacks `role="tablist"` / `role="tab"` / `aria-selected`. The expand/collapse button in MemberCard lacks `aria-expanded`.
- **`<select>` element for role choice in InviteButton:** The native `<select>` dropdown (`InviteButton.tsx:39-46`) does not match any component pattern from DESIGN-REF. It uses basic border styling while the rest of the app presumably uses styled dropdowns. This looks like a browser default that was quickly shipped.
- **Hardcoded hover colors:** `hover:bg-[#265178]` and `active:bg-[#1F4466]` appear in InviteButton and WelcomePage. These are magic hex values not tied to any CSS custom property or design token. If the primary color changes, these break.
- **Inconsistent text size for action buttons:** Action buttons in MemberCard use `text-[11px]` (`MemberCard.tsx:161`) which is not a standard Tailwind size and not in the DESIGN-REF typography scale (which uses `text-[10px]` for micro and `text-xs` for small).
- **No dark mode consideration for role badge colors:** Badge colors like `bg-amber-100 text-amber-800` (`MemberCard.tsx:75`) are hardcoded light-mode Tailwind colors. In dark mode these will look washed out or invisible against dark card backgrounds.

### Evidence
- `src/components/members/RosterToggle.tsx` -- no ARIA attributes
- `src/components/members/MemberCard.tsx:139-142` -- no `aria-expanded`
- `src/components/members/InviteButton.tsx:39-46` -- native `<select>`
- `src/components/members/MemberCard.tsx:75-78` -- no dark mode badge variants
- No `framer-motion` import in any Phase 7 file

---

## 4. Code Quality (20%) -- Score: 7/10

### Strengths
- TypeScript compiles cleanly with `--noEmit` (0 errors in Phase 7 files)
- Server actions have consistent `{ success: boolean; error?: string }` return pattern
- Role guards on every mutation action (admin-only for `updateMemberRole` and `removeMember`, coach/admin for `assignClient` and `removeClientAssignment`)
- RLS policies are well-structured with proper `auth.uid()` subqueries for ownership enforcement
- `ON DELETE CASCADE` on foreign keys means member deletion automatically cleans up assignments
- Clear separation: server component (`page.tsx`) fetches data, client wrapper handles toggle state, MemberCard handles individual interactions
- Proper `useTransition` usage for non-blocking server action calls
- Duplicate key error handled at application layer in `assignClient` (`members.ts:177`)

### Issues
- **`isSelf` prop is always `false`:** `RosterClientWrapper.tsx:47` hardcodes `isSelf={false}`. The page excludes self via `.neq('id', selfMember?.id ?? '')` (`page.tsx:35`), making the prop meaningless. But `selfMember?.id ?? ''` is a code smell -- if `selfMember` is null, it passes empty string to `.neq()`, which means no member is excluded. The `isSelf` prop should either be computed per-card or the prop should be removed since it's dead code.
- **Waterfall queries in page.tsx:** The roster page makes 5 sequential Supabase queries (`page.tsx:23-107`): selfMember, members, profiles, assignments, rsvpData (then sessionDates). These are not parallelized with `Promise.all` despite being independent after the first two. This will cause slow page loads.
- **No input validation on `memberId` parameters:** Server actions like `updateMemberRole`, `assignClient`, `removeMember` accept string `memberId` but never validate it's a valid UUID before hitting the database. Not a security issue (RLS handles it) but poor defense in depth.
- **Comment-only deprecation:** `community_members.coach_id` is deprecated via SQL comment only (`migration:84`). The `CommunityMember` type still includes `coach_id: string | null` (`auth.ts:11`). No runtime warning or lint rule prevents new code from using it.
- **Inconsistent naming:** The file is called `invites.test.ts` and `members.test.ts` but they live at the old path `src/lib/actions/` per the 07-00-SUMMARY, while there's also `src/__tests__/actions/members.test.ts` referenced in 07-04-SUMMARY. Unclear which is canonical.

### Evidence
- `src/app/coach/clients/page.tsx:23-107` -- sequential queries, no `Promise.all`
- `src/app/coach/clients/RosterClientWrapper.tsx:47` -- `isSelf={false}` hardcoded
- `src/app/coach/clients/page.tsx:35` -- `selfMember?.id ?? ''` null fallback
- `src/lib/types/auth.ts:11` -- deprecated `coach_id` still in type

---

## Summary Scorecard

| Criterion | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| Functionality | 30% | 6 | 1.80 |
| Product Depth | 25% | 5 | 1.25 |
| UX & Design | 25% | 6 | 1.50 |
| Code Quality | 20% | 7 | 1.40 |
| **Total** | | | **5.95** |

## Verdict: FAIL

**Rationale:** Product Depth scores 5 (below the 6 threshold for PASS, at the boundary for PASS WITH NOTES) and the weighted average of 5.95 is below both the 7.0 PASS threshold and the 6.5 PASS WITH NOTES threshold.

### Critical Issues Requiring Resolution

1. **Zero test implementations (42 stubs, 0 real tests):** This is the single biggest gap. An entire phase shipped with no automated verification of any kind. The test files were created in Plan 00 and never touched again.

2. **JWT stale after role promotion (MGMT-02 bug):** `MemberCard.handleRoleChange` does not call `supabase.auth.refreshSession()` as required by the `updateMemberRole` contract. A promoted user sees stale permissions.

3. **No admin demotion path:** Once "Grant Admin" is clicked, there is no UI to reverse it. This is a significant product gap for a member management feature.

4. **No dark mode support on role badges:** Hardcoded light-mode Tailwind colors will render poorly in dark mode.

5. **Sequential queries cause slow page load:** 5 waterfall Supabase queries in `page.tsx` should be parallelized.

### Minor Issues

- Invite link revocation has no UI (dead server action code)
- Native `<select>` in InviteButton breaks visual consistency
- No ARIA/accessibility on interactive components
- No framer-motion animations (design ref pattern)
- Member count does not update when toggle filters
- `isSelf` prop is dead code (always false)
- No search on roster
