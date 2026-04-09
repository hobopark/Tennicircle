# Phase 8: Community Selector & Open Sign-Up - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 08-community-selector
**Areas discussed:** Route restructuring, Community picker UX, Community browser & join flow, Join request approval

---

## Route Restructuring

| Option | Description | Selected |
|--------|-------------|----------|
| Slug in URL | Routes become /c/[slug]/coach, /c/[slug]/sessions, etc. | ✓ |
| Session-stored context | Keep flat routes, store community in cookie/context | |
| Hybrid approach | Picker uses slugs, app stays flat | |

**User's choice:** Slug in URL
**Notes:** Clean, bookmarkable, shareable. Standard multi-tenant pattern.

---

### Proxy Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Proxy validates membership | DB query per request, redirects unauthorized | ✓ |
| Page-level validation only | Each page checks individually | |
| JWT claims validation | Array of community_ids in JWT | |

**User's choice:** Proxy validates membership

---

### JWT community_id

| Option | Description | Selected |
|--------|-------------|----------|
| Remove from JWT, use URL slug | Community context from URL, not JWT | ✓ |
| Array of community_ids in JWT | Hook injects all memberships | |
| Keep single, update on switch | JWT has active community, refresh on switch | |

**User's choice:** Remove from JWT, use URL slug

---

### JWT user_role

| Option | Description | Selected |
|--------|-------------|----------|
| Role per community from DB | Remove from JWT, query community_members | ✓ |
| Keep global role in JWT | Highest privilege role stays | |
| Role array in JWT | [{community_id, role}] pairs | |

**User's choice:** Role per community from DB

---

### No Community Memberships

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /browse | Community browser for discovery | ✓ |
| Keep /welcome as hub | Profile setup + browser combined | |
| Redirect to /communities | Single page adapts | |

**User's choice:** Redirect to /browse (later merged into combined /communities page)

---

### Profile Setup Timing

| Option | Description | Selected |
|--------|-------------|----------|
| After joining community | Profile setup triggered on first community visit | |
| Before community selection | Profile right after sign-up, then browse | ✓ |
| Optional, prompted later | Never forced, banner nudge | |

**User's choice:** Before community selection — universal rule for all users

---

### Legacy URL Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to community route | 1 community → /c/[slug]/path, 2+ → /communities | ✓ |
| 404 old routes | Remove entirely | |
| Keep both working | Dual routing | |

**User's choice:** Redirect to community route

---

### Context Passing to Pages

| Option | Description | Selected |
|--------|-------------|----------|
| Layout CommunityProvider | /c/[slug]/layout.tsx wraps children in context | ✓ |
| Each page reads slug independently | Repetitive queries | |
| Server + client hybrid | Server lookup, client context | |

**User's choice:** Layout fetches, passes via CommunityProvider context

---

### Welcome Page

| Option | Description | Selected |
|--------|-------------|----------|
| Remove /welcome entirely | No longer needed with community browser | ✓ |
| Repurpose as onboarding | Warm greeting before /communities | |
| Keep for invite flow | Auto-join for invite users only | |

**User's choice:** Remove entirely

---

### Invite Link Bypass

| Option | Description | Selected |
|--------|-------------|----------|
| Invite links skip approval | Pre-authorized, auto-join continues | ✓ |
| Invite links need approval | Extra safety | |

**User's choice:** Invite links skip approval

---

### Invite Profile Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Before entering community | Same rule for everyone: profile first | ✓ |
| After entering community | Profile inside community context | |
| Skip for invite users | Optional, nudge later | |

**User's choice:** Profile setup before entering community — user flagged this gap during edge case review

---

### Proxy Profile Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Check player_profiles in proxy | Query for existence, redirect if missing | ✓ |
| User metadata flag | profile_completed in user_metadata | |
| Page-level check | Scattered checks | |

**User's choice:** Check player_profiles table in proxy

---

### Proxy Performance

| Option | Description | Selected |
|--------|-------------|----------|
| Single combined query | Profile + memberships in one round-trip | ✓ |
| Sequential queries | Three separate, simple queries | |
| Cache in cookie | First load queries, subsequent use cookie | |

**User's choice:** Single combined query

---

### Server Action communityId

| Option | Description | Selected |
|--------|-------------|----------|
| Pass as parameter | Explicit argument from calling page | ✓ |
| Cookie-based | Set cookie on community entry | |
| Lookup from referer | Extract slug from referer URL | |

**User's choice:** Pass communityId as parameter

---

### Permission Checks

| Option | Description | Selected |
|--------|-------------|----------|
| Query community_members | Each action checks role in given community | ✓ |
| Shared helper function | DRY helper (same DB query) | |
| RLS handles it | No app-level checks | |

**User's choice:** Query community_members in each action

---

### Custom Access Token Hook

| Option | Description | Selected |
|--------|-------------|----------|
| Remove entirely | No Hook, vanilla JWT | ✓ |
| Keep for global admin | Minimal flag | |
| Keep, stop reading | Dead code | |

**User's choice:** Remove the Hook entirely

---

### RLS Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Membership-based RLS | EXISTS(community_members) pattern | ✓ |
| Supabase headers | Custom header per request | |
| Keep JWT for RLS only | Hook just for RLS | |

**User's choice:** RLS checks community_members directly

---

### RLS Migration Plan

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated migration plan | All policies at once, before route work | ✓ |
| Inline with routes | Update as each page migrates | |

**User's choice:** Dedicated migration plan

---

### RLS + Query Filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Both filters + RLS | Page queries filter, RLS is safety net | ✓ |
| RLS only | Let RLS handle all scoping | |

**User's choice:** Both — defense in depth

---

### File Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Move into /c/[slug]/ | File structure matches URL | ✓ |
| Rewrites in proxy | Keep files, rewrite URLs | |
| Route groups | (community)/[slug]/... | |

**User's choice:** Move pages into /c/[slug]/*

---

### Profile Route Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Global /profile | One profile across communities | ✓ |
| Community-scoped | /c/[slug]/profile | |

**User's choice:** Profile stays global

---

### Member View Route

| Option | Description | Selected |
|--------|-------------|----------|
| Inside community | /c/[slug]/members/[memberId] | ✓ |
| Global /profile/[id] | Query param for community | |

**User's choice:** Member view inside community

---

### Notifications Route

| Option | Description | Selected |
|--------|-------------|----------|
| Inside community | /c/[slug]/notifications | ✓ |
| Global with filter | /notifications with community badge | |

**User's choice:** Inside community

---

## Community Picker UX

### Picker Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Card grid | Cards with name, members, role, activity | ✓ |
| Simple list | Minimal list | |
| Full-page hero cards | Full-width rich cards | |

**User's choice:** Card grid

---

### Community Switching

| Option | Description | Selected |
|--------|-------------|----------|
| Nav community switcher | Dropdown in top nav | ✓ |
| Only from picker page | Navigate to /communities | |
| Sidebar community list | Persistent sidebar | |

**User's choice:** Nav community switcher

---

### Single-Community User Join Path

| Option | Description | Selected |
|--------|-------------|----------|
| Always show dropdown | Dropdown with current + "Browse communities" | ✓ |
| Profile/settings link | Less discoverable | |
| Dedicated nav tab | Takes nav space | |

**User's choice:** Always show dropdown with Browse link

---

### Auto-Skip Picker

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-redirect for 1 | Skip picker for single-community users | |
| Always show picker | Consistent experience | ✓ |

**User's choice:** Always show picker — every login lands on /communities

---

### Combined vs Separate Pages

| Option | Description | Selected |
|--------|-------------|----------|
| Combined /communities | Your + Browse on one page | ✓ |
| Separate pages | /communities and /browse | |

**User's choice:** Combined page

---

### Create Community

| Option | Description | Selected |
|--------|-------------|----------|
| Create button on /communities | Admin sees "+ Create" card | ✓ |
| Separate admin page | /admin/create-community | |
| Any user can create | Open to all | |

**User's choice:** Create button on /communities (admin-only)

---

### Picker Layout Page

| Option | Description | Selected |
|--------|-------------|----------|
| Root level with minimal layout | src/app/communities/ with logo + avatar | ✓ |
| Under auth route group | Shares auth layout | |

**User's choice:** Root level with minimal layout

---

### Badge Count in Switcher

| Option | Description | Selected |
|--------|-------------|----------|
| No badge count for MVP | Just names and role badges | ✓ |
| Show unread count | Cross-community query | |

**User's choice:** No badge count for MVP

---

### Switcher Role Awareness

| Option | Description | Selected |
|--------|-------------|----------|
| Fetches roles | useCommunities() hook with roles | ✓ |
| Neutral page redirect | Always /c/[slug]/ then redirect | |

**User's choice:** Switcher fetches roles for correct role-home navigation

---

### Pending Requests Display

| Option | Description | Selected |
|--------|-------------|----------|
| Separate pending section | Three sections: Your / Pending / Browse | ✓ |
| Mixed into Your Communities | With pending badge | |

**User's choice:** Separate "Pending" section between Your and Browse

---

### Browse Section Filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Hide joined/pending | Only show undiscovered | ✓ |
| Show all with badges | Mark joined/pending | |

**User's choice:** Hide joined and pending from Browse

---

## Community Browser & Join Flow

### Browse Card Info

| Option | Description | Selected |
|--------|-------------|----------|
| Name + count + description | Informative cards | ✓ |
| Minimal (name only) | Fast scan | |
| Rich (with images) | Requires more data | |

**User's choice:** Name + member count + description

---

### Pending State UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline state change | Button → "Pending Approval" + toast | ✓ |
| Move to Your Communities | With pending badge | |
| Confirmation dialog | Dialog then redirect | |

**User's choice:** Inline state change on card

---

### Search/Filter

| Option | Description | Selected |
|--------|-------------|----------|
| No search for MVP | List all communities | ✓ |
| Simple search bar | Text search by name | |
| Search + location | Name + area filter | |

**User's choice:** No search for MVP

---

### Cancel Pending Request

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, cancel button | "Cancel request" link on pending card | ✓ |
| No cancel | Wait for decision | |

**User's choice:** Yes, cancel button on pending card

---

### Community Creation Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Name + description only | Slug auto-generated. Minimal for MVP | ✓ |
| Name + description + location | Location field added | |
| Full wizard | Multi-step | |

**User's choice:** Name + description only

---

### Description Column

| Option | Description | Selected |
|--------|-------------|----------|
| Add description column | Nullable text on communities table | ✓ |
| No description | Name only on cards | |

**User's choice:** Add description column

---

## Join Request Approval

### Approval Location

| Option | Description | Selected |
|--------|-------------|----------|
| Roster pending section | Top of /c/[slug]/coach/clients | ✓ |
| Notification-driven | Tap notification to approve | |
| Dedicated tab | New "Approvals" nav tab | |

**User's choice:** Roster page with pending section

---

### Approved Role

| Option | Description | Selected |
|--------|-------------|----------|
| Always client | Promote later via roster | ✓ |
| Approver picks | Role dropdown on approve | |
| Match invite role | Different for invite vs browse | |

**User's choice:** Always client

---

### Reject Confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Styled Dialog, no reason | Orange confirm button | ✓ |
| Reason required | Text field for rejection reason | |
| Instant reject | No confirmation | |

**User's choice:** Styled Dialog confirmation, no reason

---

### User Notification on Approval/Rejection

| Option | Description | Selected |
|--------|-------------|----------|
| In-app notification | Approved and rejected notifications | ✓ |
| No notification | Check manually | |

**User's choice:** In-app notification for both

---

### Join Request Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| New join_requests table | Separate table with status tracking | ✓ |
| Status column on community_members | Mixes members and non-members | |
| Reuse invite_links | Conceptually confusing | |

**User's choice:** New join_requests table

---

### Who Can Approve

| Option | Description | Selected |
|--------|-------------|----------|
| Both coaches and admins | COMM-04 compliance | ✓ |
| Admins only | Tighter control | |
| Configurable | Per-community setting | |

**User's choice:** Both coaches and admins

---

### Roster Badge for Pending Requests

| Option | Description | Selected |
|--------|-------------|----------|
| Count badge on Clients tab | Number badge in AppNav | ✓ |
| No badge | Check manually | |
| In-app notification | Per-request notification | |

**User's choice:** Count badge on Clients tab (no in-app notification for coaches)

---

### Communities Table Public Read

| Option | Description | Selected |
|--------|-------------|----------|
| Authenticated read all | RLS: USING (true) for authenticated | ✓ |
| Service role only | Server action with service key | |

**User's choice:** Authenticated users can read all communities

---

### Member Removal Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Next request redirects | Proxy detects, redirects to /communities | ✓ |
| Real-time kick | Supabase Realtime detection | |

**User's choice:** Next request redirects (no Realtime)

---

### Route-Level Role Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Proxy enforces | Same protection, community-scoped | ✓ |
| Page-level guards | Each page checks | |
| No guards, hide links | UI-only restriction | |

**User's choice:** Proxy enforces within /c/[slug]/*

---

### AppNav Context Source

| Option | Description | Selected |
|--------|-------------|----------|
| CommunityProvider | useCommunity() hook for slug and role | ✓ |
| useParams() | Read slug from URL directly | |
| Props from layout | Thread through props | |

**User's choice:** From CommunityProvider context

---

### Loading States

| Option | Description | Selected |
|--------|-------------|----------|
| Every route directory | loading.tsx per route | ✓ |
| Top-level only | Shared skeleton | |

**User's choice:** Every route directory

---

## Claude's Discretion

- Community card visual design
- Exact pending requests section layout
- Community switcher animation/positioning
- Loading skeleton designs
- Error state handling
- Slug auto-generation (special chars, collisions)
- Combined proxy query SQL structure

## Deferred Ideas

- Notification badge count per community in switcher
- In-app notification for coaches on join requests
- Community search/filter
- Community cover images / branding
- QR code sharing (from Phase 7)
- Real-time removal detection
