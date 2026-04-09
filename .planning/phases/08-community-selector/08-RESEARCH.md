# Phase 8: Community Selector & Open Sign-Up - Research

**Researched:** 2026-04-09
**Domain:** Next.js 16 App Router routing migration, Supabase RLS rewrite, React Context, community picker UX
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Route restructuring**
- D-01: Routes use `/c/[slug]/*` pattern — all community-scoped pages live under `/c/[slug]/`.
- D-02: Existing pages physically move into `src/app/c/[slug]/` directory structure. No rewrites.
- D-03: `/c/[slug]/layout.tsx` resolves community from slug, looks up membership for role, wraps children in a `CommunityProvider` context. Child pages use `useCommunity()` hook.
- D-04: Profile stays global at `/profile`. Member view within community at `/c/[slug]/members/[memberId]`.
- D-05: Notifications community-scoped at `/c/[slug]/notifications`.
- D-06: Old flat routes (`/coach`, `/sessions`, `/admin`, `/events`) redirect via proxy: 1 community → `/c/[slug]/{path}`, 0 or 2+ → `/communities`.
- D-07: Remove `/welcome` page entirely.

**JWT and auth changes**
- D-08: Remove `community_id` from JWT custom claims.
- D-09: Remove `user_role` from JWT custom claims.
- D-10: Remove the Custom Access Token Hook from Supabase entirely.
- D-11: All server actions receive `communityId` as explicit parameter (not from `getJWTClaims()`).
- D-12: Permission checks in server actions query `community_members` for the user's role in the given community.

**Proxy decision tree**
- D-13: Proxy executes single combined query (profile + memberships + roles + slugs).
- D-14: Full proxy decision tree (8 steps — see CONTEXT.md).
- D-15: Profile setup before community selection for ALL users. Proxy enforces at step 4.
- D-16: ROLE_HOME_ROUTES: admin → `/c/{slug}/admin`, coach → `/c/{slug}/coach`, client → `/c/{slug}/sessions`.
- D-17: Proxy enforces role-based route access within `/c/[slug]/*`.

**RLS migration**
- D-18: All RLS policies rewritten from `auth.jwt()->'community_id'` to `EXISTS(community_members WHERE user_id = auth.uid() AND community_id = table.community_id)`.
- D-19: RLS migration is a dedicated plan — all policies updated at once before route restructuring.
- D-20: Page queries always include explicit `.eq('community_id', communityId)` filter. RLS is safety net.
- D-21: Communities table gets a public read policy: all authenticated users can SELECT all communities.

**Community picker UX**
- D-22: `/communities` is a combined page with "Your Communities", "Pending", "Browse Communities" sections.
- D-23: Every login lands on `/communities` — no auto-redirect past the picker.
- D-24: Community cards show: name, member count, role badge, last activity.
- D-25: Community switcher dropdown in AppNav — always present.
- D-26: Switcher navigates to `/c/[other-slug]/[role-home]` using correct role per community.
- D-27: No unread notification badge count per community in switcher for MVP.
- D-28: Admin sees "+ Create" card in "Your Communities" section.

**Community browser & join flow**
- D-29 to D-33: Browse cards, join request flow, cancel request, no search/filter for MVP.

**Community creation**
- D-34 to D-36: Create Community dialog, admin-only, `description` column, creator becomes first admin.

**Join request approval**
- D-37 to D-41: Pending requests on roster, coach/admin approve/reject, client role, reject dialog, Clients tab badge.

**Data model changes**
- D-42: New `join_requests` table: id, community_id, user_id, status (pending/approved/rejected), created_at, resolved_at, resolved_by.
- D-43: Communities table: add `description` text column (nullable).

**Notifications**
- D-44 to D-46: Approved/rejected users get in-app notifications. No notification for coach/admin on new request.

**AppNav changes**
- D-47: AppNav uses `useCommunity()` context for slug and role.
- D-48: Role-based tab visibility from CommunityProvider context (not JWT claims).

**Loading states**
- D-49: Every route directory under `/c/[slug]/` gets a `loading.tsx` skeleton.

**Edge cases**
- D-50: User removed from community → next proxy request redirects to `/communities`.
- D-51: Invite link sign-ups bypass join request approval.
- D-52: Cron job (`/api/cron/session-reminders`) unaffected.

### Claude's Discretion
- Community card visual design details (shadows, borders, hover states)
- Exact layout of pending requests section on roster
- Community switcher dropdown animation and positioning
- Loading skeleton designs for each route
- Error state handling for failed join requests
- How slug auto-generation handles special characters and collisions
- Exact combined proxy query SQL structure

### Deferred Ideas (OUT OF SCOPE)
- Notification badge count per community in switcher dropdown
- In-app notification when someone requests to join
- Community search/filter
- Community cover images / custom branding
- QR code for community sharing
- Native share sheet (Web Share API)
- Real-time kick detection via Supabase Realtime when removed from community

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMM-01 | Post-login community picker for users in multiple communities | D-22, D-23 — `/communities` page with "Your Communities" section |
| COMM-02 | Auto-redirect to dashboard for users in a single community | D-23 OVERRIDES this — every login lands on `/communities` picker, no auto-redirect |
| COMM-03 | Community browser for new sign-ups (all communities visible) | D-22 "Browse Communities" section, D-29 to D-33 |
| COMM-04 | Join request requires coach/admin approval before member gains access | D-37 to D-41, D-42 `join_requests` table |
| COMM-05 | Admin can create a new community | D-34 to D-36, D-43 `description` column |
| COMM-06 | Routing restructured with community context in navigation | D-01 to D-17, entire route migration |

> Note: COMM-02 says "auto-redirect for single community" but D-23 LOCKED: no auto-redirect for anyone. Every login lands on `/communities`. COMM-02 is considered addressed by the fact the picker shows immediately and the single community card is one click.

</phase_requirements>

---

## Summary

Phase 8 is a large codebase restructuring: migrate ~10 existing page files into a new `/c/[slug]/` route tree, rewrite the proxy decision tree (removing JWT custom claims entirely), rewrite all RLS policies from JWT-based to membership-query-based, build a new `/communities` community picker page, add join request approval flow, update AppNav with community switcher, and add loading skeletons to every community-scoped route.

The biggest technical risk is the RLS rewrite + JWT hook removal: these are coordinated changes that must happen together. The existing codebase has ~8 SQL migration files all using `auth.jwt() ->> 'community_id'` and `auth.jwt() ->> 'user_role'` in policy conditions. Every single policy across all tables must be replaced with `EXISTS(SELECT 1 FROM community_members WHERE user_id = auth.uid() AND community_id = table.community_id)` style checks before the proxy rewrite lands.

The second major technical complexity is the `loading.tsx` interaction with `/c/[slug]/layout.tsx`. Per Next.js 16 docs, `loading.tsx` sits below `layout.tsx` in the component hierarchy and cannot show a fallback for uncached/runtime data access in the layout itself. Since the community layout will call `cookies()`, `supabase.auth.getUser()`, and a DB query, the `loading.tsx` files under `/c/[slug]/*/` won't fire while the layout resolves — they only cover the page's own data fetching. This is a known framework constraint that must inform skeleton placement.

**Primary recommendation:** Execute as 4 plans: (1) SQL migration — RLS rewrite + join_requests + description column + remove JWT hook, (2) route migration + proxy rewrite + CommunityProvider, (3) /communities page + join request flow + AppNav switcher, (4) loading skeletons + notification types + deferred fixes.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.2 | App Router — `[slug]` dynamic layouts, `loading.tsx`, `redirect()` | Project constraint [VERIFIED: package.json] |
| React | 19.2.4 | `createContext`, `useContext`, `useTransition` for optimistic UI | Project constraint [VERIFIED: package.json] |
| @supabase/supabase-js | 2.101.1 | Client SDK — browser auth, realtime | Project constraint [VERIFIED: package.json] |
| @supabase/ssr | 0.10.0 | `createServerClient` for proxy and server components | Project constraint [VERIFIED: package.json] |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | (via root layout) | Toast notifications for join request feedback | Join request sent/cancelled/error toasts |
| lucide-react | (installed) | `Check`, `ChevronDown`, `Plus`, `Loader2` icons | Community switcher, create card, loading spinner |
| shadcn Dialog | (installed) | Reject confirmation dialog, Create Community dialog | Any destructive confirmation |
| shadcn Skeleton | (installed) | loading.tsx skeleton files | Route loading states |

**No new packages required for this phase.** All UI and infrastructure is already available.

---

## Architecture Patterns

### Recommended New File Structure

```
src/app/
├── communities/
│   ├── page.tsx          # /communities — community picker
│   └── loading.tsx       # skeleton for communities page
├── c/
│   └── [slug]/
│       ├── layout.tsx    # CommunityProvider — resolves slug, queries membership
│       ├── admin/
│       │   ├── page.tsx  (moved from /admin/page.tsx)
│       │   └── loading.tsx
│       ├── coach/
│       │   ├── page.tsx  (moved from /coach/page.tsx)
│       │   ├── loading.tsx
│       │   ├── schedule/
│       │   │   ├── page.tsx
│       │   │   └── loading.tsx
│       │   └── clients/
│       │       ├── page.tsx
│       │       ├── RosterClientWrapper.tsx
│       │       └── loading.tsx
│       ├── sessions/
│       │   ├── page.tsx  (moved from /sessions/page.tsx)
│       │   ├── loading.tsx
│       │   └── calendar/
│       │       ├── page.tsx
│       │       └── loading.tsx
│       ├── events/
│       │   ├── page.tsx  (moved from /events/page.tsx)
│       │   └── loading.tsx
│       └── notifications/
│           ├── page.tsx  (moved from /notifications/page.tsx)
│           └── loading.tsx
├── profile/              # stays global (D-04)
│   ├── page.tsx
│   └── setup/
│       └── page.tsx
src/lib/
├── context/
│   └── community.tsx     # CommunityProvider + useCommunity() hook
├── types/
│   └── auth.ts           # Remove JWTCustomClaims, update ROLE_HOME_ROUTES
└── supabase/
    ├── server.ts         # Remove getJWTClaims(), add getUserRole(supabase, communityId)
    └── middleware.ts     # Full proxy rewrite (D-14 decision tree)
src/components/
├── communities/
│   ├── CommunityCard.tsx
│   ├── CommunityBrowseCard.tsx
│   ├── CreateCommunityDialog.tsx
│   ├── RejectRequestDialog.tsx
│   └── PendingRequestsSection.tsx
└── nav/
    └── CommunitySwitcherDropdown.tsx  # Replaces / adds to AppNav top bar
src/lib/actions/
├── members.ts            # Add approvJoinRequest, rejectJoinRequest, requestToJoin
├── communities.ts        # New: createCommunity, getCommunityBySlug, getUserCommunities
└── notifications.ts      # Add join_approved, join_rejected notification types
supabase/migrations/
└── 00009_phase8_schema.sql  # join_requests table + communities.description + RLS rewrite
```

### Pattern 1: CommunityProvider Layout (Server → Client boundary)

The `/c/[slug]/layout.tsx` is a Server Component that fetches community data and passes it to a Client Component provider. This is the standard RSC-to-context bridge pattern.

```typescript
// Source: Next.js 16 layout docs [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md]
// src/app/c/[slug]/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommunityProviderWrapper } from '@/lib/context/community'

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>  // params is a Promise in Next.js 15+
}) {
  const { slug } = await params  // MUST await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Single combined query: community + membership + role
  const { data: membership } = await supabase
    .from('community_members')
    .select('id, role, communities!inner(id, name, slug)')
    .eq('user_id', user.id)
    .eq('communities.slug', slug)
    .maybeSingle()

  if (!membership) redirect('/communities')

  return (
    <CommunityProviderWrapper
      communityId={membership.communities.id}
      communitySlug={slug}
      communityName={membership.communities.name}
      membershipId={membership.id}
      role={membership.role}
    >
      {children}
    </CommunityProviderWrapper>
  )
}
```

```typescript
// Source: React 19 context pattern [ASSUMED — verified against project React 19.2.4]
// src/lib/context/community.tsx
'use client'
import { createContext, useContext } from 'react'
import type { UserRole } from '@/lib/types/auth'

interface CommunityContext {
  communityId: string
  communitySlug: string
  communityName: string
  membershipId: string
  role: Exclude<UserRole, 'pending'>
}

const CommunityCtx = createContext<CommunityContext | null>(null)

export function CommunityProviderWrapper({
  children, communityId, communitySlug, communityName, membershipId, role
}: CommunityContext & { children: React.ReactNode }) {
  return (
    <CommunityCtx.Provider value={{ communityId, communitySlug, communityName, membershipId, role }}>
      {children}
    </CommunityCtx.Provider>
  )
}

export function useCommunity(): CommunityContext {
  const ctx = useContext(CommunityCtx)
  if (!ctx) throw new Error('useCommunity must be used within CommunityProviderWrapper')
  return ctx
}
```

### Pattern 2: Server Action with communityId parameter (D-11, D-12)

All server actions drop `getJWTClaims()` and receive `communityId` explicitly. Role is verified against the DB.

```typescript
// Source: codebase pattern [VERIFIED: src/lib/actions/members.ts]
export async function someAction(
  communityId: string,
  // ...other params
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Role check via DB query, not JWT (D-12)
  const { data: member } = await supabase
    .from('community_members')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle()

  if (!member || member.role !== 'admin') {
    return { success: false, error: 'Insufficient permissions' }
  }
  // ...
}
```

### Pattern 3: RLS Policy Migration (D-18)

The pattern to replace across ALL tables currently using JWT claims:

```sql
-- OLD PATTERN (to be removed from all tables)
-- auth.jwt() ->> 'community_id'
-- auth.jwt() ->> 'user_role'

-- NEW PATTERN for SELECT policies (D-18)
-- Replace: community_id = (auth.jwt() ->> 'community_id')::uuid
-- With:
EXISTS (
  SELECT 1 FROM public.community_members
  WHERE user_id = auth.uid()
  AND community_id = <table>.community_id
)

-- NEW PATTERN for INSERT/UPDATE policies requiring role check
-- Replace: (auth.jwt() ->> 'user_role') = 'admin'
-- With:
EXISTS (
  SELECT 1 FROM public.community_members
  WHERE user_id = auth.uid()
  AND community_id = <explicit_param>
  AND role = 'admin'
)
```

### Pattern 4: Proxy Decision Tree (D-14)

The proxy must execute a single combined DB query once per request. Query pattern:

```typescript
// Source: CONTEXT.md D-13, D-14 [VERIFIED: CONTEXT.md]
// In src/lib/supabase/middleware.ts
const { data: profileAndMemberships } = await supabase
  .from('player_profiles')
  .select('user_id, communities:community_members(community_id, role, communities(slug))')
  .eq('user_id', user.id)
  .maybeSingle()

// profile exists?        → profileAndMemberships !== null
// membership count?      → profileAndMemberships?.communities?.length
// slug for community?    → profileAndMemberships?.communities?.[0]?.communities?.slug
// role in community?     → check from the slug match
```

### Pattern 5: loading.tsx — CRITICAL CONSTRAINT

[VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md]

`loading.tsx` sits **below** `layout.tsx` in the component hierarchy. It **does NOT** show while the layout's own data fetch runs. Specifically:

> "If the layout accesses uncached or runtime data (e.g. cookies(), headers(), or uncached fetches), loading.js will not show a fallback for it."

The `/c/[slug]/layout.tsx` calls `cookies()` via `createClient()`, then `supabase.auth.getUser()`, then a DB query — all uncached. This means:
- **The loading.tsx files in child routes cover the PAGE's data fetching, not the layout's**.
- Navigation will block on layout rendering before `loading.tsx` is visible.
- Mitigation per Next.js 16 docs: wrap runtime data in layout in its own `<Suspense>`, or move data fetching to pages.

**Practical implication for D-49:** The loading skeletons still provide value — they show while the page's own server component renders. The layout bottleneck is a known framework constraint. Plans should note this clearly so the implementer doesn't expect skeletons to appear before layout resolves.

### Anti-Patterns to Avoid

- **Don't use `getJWTClaims()` in any server action after this phase** — it queries the JWT which no longer has custom claims (D-08, D-09, D-10).
- **Don't access pathname in layouts** — layouts don't re-render on navigation, pathname would be stale. Use `usePathname()` in Client Components only.
- **Don't forget to `await params`** — In Next.js 16, `params` is a `Promise<{ slug: string }>`, not a plain object. Synchronous access is deprecated and will break.
- **Don't put redirect() after Suspense boundaries fire** — once streaming starts, status code is locked at 200. All membership checks must happen before any `<Suspense>` or `await` that may suspend.
- **Don't drop old flat routes without redirects** — the proxy's D-06 redirect must handle `/coach`, `/sessions`, `/admin`, `/events` for bookmarked URLs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug generation | Custom slugify | `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')` inline | Simple enough inline; no library needed |
| Toast notifications | Custom toast | Sonner (already installed, used throughout) | Consistent with existing pattern |
| Destructive dialog | Browser `confirm()` | shadcn Dialog (already installed) | Project memory rule: no browser dialogs |
| Role checking in actions | Duplicate check logic | Reusable `getUserRole(supabase, communityId)` helper | D-12 pattern centralized in server.ts |
| Optimistic UI for join requests | Complex state machine | `useTransition` + local `useState` | Matches existing `InvitationManager.tsx` pattern |
| Supabase service role notifications | Custom notification service | `createServiceClient()` + insert into notifications table | Same pattern as Phase 5 cron notifications |

**Key insight:** The hardest part of this phase is the SQL migration (RLS rewrite + JWT hook removal). Don't underestimate the number of policies to update — there are 6 migration files all containing JWT-based policies, and every one must be rewritten.

---

## Common Pitfalls

### Pitfall 1: Policy conflicts after RLS rewrite
**What goes wrong:** The new migration adds new policies but doesn't DROP the old JWT-based ones. Both exist, Supabase evaluates as OR — old permissive policies remain active.
**Why it happens:** ALTER TABLE/CREATE POLICY without corresponding DROP POLICY.
**How to avoid:** For each table being migrated, explicitly DROP old named policies before creating new ones in the SQL migration.
**Warning signs:** Data from other communities leaks through; users see records they shouldn't.

### Pitfall 2: `params` accessed synchronously
**What goes wrong:** TypeScript error or stale slug value in layout/page — `params.slug` instead of `(await params).slug`.
**Why it happens:** Next.js 15+ changed params to a Promise. Prior versions accessed synchronously.
**How to avoid:** Always `const { slug } = await params` in all async Server Components.
**Warning signs:** TypeScript reports `slug` doesn't exist on `Promise<{slug: string}>`.

### Pitfall 3: loading.tsx doesn't show for layout data fetching
**What goes wrong:** Developer adds skeleton loading.tsx expecting it to show while the community layout resolves membership. It doesn't fire for the layout's own fetch.
**Why it happens:** Next.js hierarchy — loading.tsx is a Suspense boundary for page.tsx, not for its sibling layout.tsx.
**How to avoid:** Understand loading.tsx covers page-level data. The layout fetch blocks navigation. This is expected behavior. Wrap layout data in `<Suspense>` if instant navigation is required.
**Warning signs:** Skeleton never appears on initial community navigation.

### Pitfall 4: JWT claims cached in AppNav
**What goes wrong:** AppNav still reads role from `session.access_token` JWT payload. After removing the Custom Access Token Hook, the JWT no longer has `user_role`. AppNav shows no tabs or wrong tabs.
**Why it happens:** `AppNav.tsx` currently does `const payload = JSON.parse(atob(session.access_token.split('.')[1]))` and reads `payload.user_role`.
**How to avoid:** AppNav must be refactored to use `useCommunity()` hook from CommunityProvider, which gets role from the DB-backed community layout (D-47, D-48).
**Warning signs:** All nav tabs disappear after login.

### Pitfall 5: notifications table CHECK constraint blocks new types
**What goes wrong:** Inserting `join_approved` or `join_rejected` notifications fails at the DB level.
**Why it happens:** `notifications` table has `CHECK (notification_type IN ('session_reminder', 'announcement', ...))` — new types not in the list.
**How to avoid:** SQL migration must ALTER the CHECK constraint to add `'join_approved'` and `'join_rejected'` to the allowed values.
**Warning signs:** `insert failed: new row violates check constraint`.

### Pitfall 6: Proxy combined query before profile exists
**What goes wrong:** On first login, new user has no `player_profiles` row and no `community_members` row. Combined query returns null. Proxy logic must gracefully handle this and redirect to `/profile/setup`, not crash.
**Why it happens:** D-15 requires profile setup before community selection. If profile query is the anchor of the JOIN, it returns nothing even if community_members row somehow exists.
**How to avoid:** Proxy checks for profile existence separately from membership existence. Step 4 of D-14 handles no-profile case.
**Warning signs:** New users stuck in redirect loop on first sign-up.

### Pitfall 7: `revalidatePath` paths need updating
**What goes wrong:** Server actions call `revalidatePath('/notifications')` or `revalidatePath('/coach/clients')` with old flat paths. These don't match the new `/c/[slug]/notifications` routes.
**Why it happens:** All existing server actions in `notifications.ts`, `members.ts`, etc. hardcode old route paths.
**How to avoid:** Every server action receiving `communityId` should also receive `communitySlug` and call `revalidatePath(\`/c/${communitySlug}/notifications\`)`.
**Warning signs:** UI doesn't update after approve/reject actions until manual refresh.

### Pitfall 8: `community_members` SELECT policy blocks new users
**What goes wrong:** The new `EXISTS(community_members WHERE user_id = auth.uid())` RLS pattern creates a bootstrapping problem: users with no community_members row at all can't read anything, including the communities table needed to browse and join.
**Why it happens:** Migration 00008 already added `authenticated_read_communities` — this is handled. But all other tables are protected. New users (no membership) need to reach `/communities` browse section successfully.
**How to avoid:** `communities` table keeps its `authenticated_read_communities` policy (any authenticated user can read). `join_requests` table insert policy allows self-insert (`user_id = auth.uid()`). All other tables remain community-scoped (correct — no membership = no access).
**Warning signs:** New users can't see communities list at all.

---

## Code Examples

### Slug auto-generation (for createCommunity action)

```typescript
// Source: Claude's Discretion — simple inline approach [ASSUMED]
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')               // decompose accented chars
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')   // strip non-alphanumeric
    .trim()
    .replace(/\s+/g, '-')           // spaces → hyphens
    .replace(/-+/g, '-')            // collapse consecutive hyphens
    .slice(0, 50)                   // max length
}

// Collision handling: if slug exists, append -2, -3, etc.
// Query: SELECT slug FROM communities WHERE slug LIKE 'jaden-tennis%'
```

### AppNav migration from JWT role to context role

```typescript
// Source: codebase [VERIFIED: src/components/nav/AppNav.tsx]
// BEFORE (lines 86-92): reads from JWT payload
const payload = JSON.parse(atob(session.access_token.split('.')[1]))
setRole((payload.user_role as UserRole) || 'pending')

// AFTER (D-47, D-48): reads from CommunityProvider via prop or context
// AppNav becomes context-aware — receives role/slug as props from layout
// OR: AppNav reads usePathname() to extract slug and queries context
// SIMPLER: Pass role and slug as props from the community layout to AppNav
```

### Pending requests badge on Clients tab (D-41)

```typescript
// Source: CONTEXT.md D-41, UI-SPEC.md [VERIFIED]
// The Clients tab badge shows pending join request count.
// AppNav needs to query join_requests for the current community.
// Pattern: pass pendingCount as prop from CommunityLayout → AppNav
// OR: AppNav queries for it on mount given communityId from context.
// Recommended: include pendingJoinRequestCount in CommunityProvider value.
```

### Notifications schema ALTER for new types

```sql
-- Source: migration analysis [VERIFIED: supabase/migrations/00006_notifications_schema.sql]
-- The CHECK constraint is named inline — need to drop and recreate.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'session_reminder',
    'announcement',
    'rsvp_confirmed',
    'waitlist_promoted',
    'event_updated',
    'session_updated',
    'session_cancelled',
    'rsvp_cancelled',
    'join_approved',    -- NEW D-44
    'join_rejected'     -- NEW D-45
  ));
```

### join_requests table (D-42)

```sql
-- Source: CONTEXT.md D-42 [VERIFIED]
CREATE TABLE public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected'))
    DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  UNIQUE (community_id, user_id)  -- prevent duplicate pending requests
);
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Self-insert (request to join)
CREATE POLICY "users_can_request_to_join"
  ON public.join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Self-read own requests
CREATE POLICY "users_read_own_requests"
  ON public.join_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Coach/admin read requests for their community
CREATE POLICY "coaches_admins_read_community_requests"
  ON public.join_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.community_members
    WHERE user_id = auth.uid()
    AND community_id = join_requests.community_id
    AND role IN ('admin', 'coach')
  ));

-- Coach/admin update (approve/reject)
CREATE POLICY "coaches_admins_update_requests"
  ON public.join_requests FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.community_members
    WHERE user_id = auth.uid()
    AND community_id = join_requests.community_id
    AND role IN ('admin', 'coach')
  ));
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JWT custom claims for community_id + user_role | DB-query role lookup per community | This phase | Unlocks multi-community; removes Custom Access Token Hook |
| Flat routes `/coach`, `/sessions` | Community-scoped `/c/[slug]/coach` | This phase | All pages under community context |
| Single `community_members` query for role | `CommunityProvider` context sharing resolved data | This phase | No per-page role lookup needed after layout |
| `getJWTClaims()` in server actions | Explicit `communityId` parameter + DB role check | This phase | Defense in depth, multi-community safe |

**Deprecated/outdated after this phase:**
- `getJWTClaims()` function in `server.ts` — remove entirely
- `JWTCustomClaims` type in `auth.ts` — remove
- `custom_access_token_hook` Supabase function — remove from DB
- All RLS policies using `auth.jwt() ->> 'community_id'` — replaced
- `/welcome` page and `WelcomePage.tsx` component — delete
- `joinCommunityAsClient()` action in `members.ts` — replace with join request flow

---

## Runtime State Inventory

> Phase involves removing the Custom Access Token Hook and rewriting JWT claims.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `community_members` rows with `coach_id` column (legacy FK, deprecated Phase 7) | No rename — column stays, just unused. No data migration. |
| Stored data | Existing `notifications` table CHECK constraint | ALTER TABLE to add new notification types (code/migration) |
| Live service config | Supabase Custom Access Token Hook — registered in Supabase dashboard (Auth > Hooks) | Must be manually disabled/removed in Supabase dashboard after deploying migration that drops the function. Schema migration drops the function; dashboard hook registration must also be cleared. |
| Live service config | Supabase auth hook grants (`grant execute on function public.custom_access_token_hook to supabase_auth_admin`) | Revoke in same migration that drops the function |
| OS-registered state | None — no OS-level registrations | None |
| Secrets/env vars | `SUPABASE_SERVICE_ROLE_KEY` (used by cron) — unchanged; cron unaffected (D-52) | None |
| Build artifacts | None — TypeScript compile will catch stale `getJWTClaims()` usages | Fix all TypeScript errors after removing the function |

**Critical manual step:** After deploying the SQL migration that drops `custom_access_token_hook`, a human must go to **Supabase dashboard → Authentication → Hooks** and remove the hook registration. The SQL migration cannot do this — it's a UI-only setting. If the hook is still registered but the function is dropped, Supabase auth will fail.

---

## Open Questions

1. **Supabase Custom Access Token Hook removal sequence**
   - What we know: SQL can drop the function. Dashboard registration is manual.
   - What's unclear: Does Supabase fail immediately when hook function is missing, or gracefully skip?
   - Recommendation: Plan must include explicit instruction for human to remove the hook in Supabase dashboard BEFORE deploying the migration that drops the function — or at minimum immediately after. Flag as human task in the plan.

2. **Proxy combined query performance**
   - What we know: D-13 calls for a single combined query. AppNav also needs all memberships for the switcher.
   - What's unclear: Exact SQL join to retrieve profile + all memberships + community slugs in one query.
   - Recommendation: Use Claude's Discretion to design the query. Pattern: LEFT JOIN community_members + JOIN communities filtered by user_id. If profile doesn't exist, return null profile (allows D-14 step 4 to fire).

3. **Old flat routes during migration**
   - What we know: D-06 says proxy handles `/coach` → redirect to `/c/[slug]/coach`. Proxy runs on every request.
   - What's unclear: Whether old page files should be deleted or just redirected.
   - Recommendation: Per D-02, files physically move. Old directories are deleted. Proxy handles any bookmarked URL redirects.

4. **Notification inserts for join_approved/join_rejected use service role**
   - What we know: notifications table has INSERT policy for service_role only (T-05-03 from Phase 5).
   - What's unclear: Whether server actions that approve/reject can insert notifications or need a separate service client.
   - Recommendation: Create a `createServiceClient()` helper in server.ts (using `SUPABASE_SERVICE_ROLE_KEY`) for notification inserts, matching Phase 5 cron pattern. Server actions call this after successful approve/reject.

---

## Environment Availability

Step 2.6: SKIPPED (no new external dependencies — all tooling already available; schema changes deploy manually via Supabase SQL Editor per project preference).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (detected from existing `*.test.ts` files in `src/lib/actions/`) |
| Config file | Check for `vitest.config.ts` at project root |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMM-01 | `/communities` page renders Your Communities section | manual/smoke | n/a — server component | ❌ Wave 0 |
| COMM-02 | Single-community users see picker (not auto-redirected) | manual | n/a | N/A |
| COMM-03 | Browse section shows unjoinable communities | manual/smoke | n/a | ❌ Wave 0 |
| COMM-04 | `requestToJoin` action inserts pending join_request | unit | `npx vitest run src/lib/actions/members.test.ts` | ❌ Wave 0 |
| COMM-04 | `approveJoinRequest` creates community_member + sends notification | unit | `npx vitest run src/lib/actions/members.test.ts` | ❌ Wave 0 |
| COMM-05 | `createCommunity` action creates community + admin membership | unit | `npx vitest run src/lib/actions/communities.test.ts` | ❌ Wave 0 |
| COMM-06 | Proxy redirects `/coach` to `/c/[slug]/coach` for 1-community user | unit | `npx vitest run src/lib/supabase/middleware.test.ts` | ❌ Wave 0 |
| COMM-06 | Proxy redirects to `/communities` when 0 or 2+ communities | unit | `npx vitest run src/lib/supabase/middleware.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/actions/members.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/actions/members.test.ts` — covers join request CRUD (COMM-04)
- [ ] `src/lib/actions/communities.test.ts` — covers createCommunity (COMM-05)
- [ ] `src/lib/supabase/middleware.test.ts` — covers proxy redirect logic (COMM-06)

*(Existing test files: `announcements.test.ts`, `events.test.ts`, `invites.test.ts`, `members.test.ts` already exist — `members.test.ts` may be extendable rather than new)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase `getUser()` in proxy (T-01-01 — already established) |
| V3 Session Management | yes | JWT removal of custom claims; session still managed by Supabase |
| V4 Access Control | yes | DB-query role checks (D-12); RLS policy EXISTS pattern (D-18) |
| V5 Input Validation | yes | Slug sanitization for createCommunity; all action inputs |
| V6 Cryptography | no | No cryptography changes; Supabase handles JWT signing |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Privilege escalation via community switch | Elevation of Privilege | CommunityLayout verifies membership in DB, not JWT; no client-controlled role claim |
| Horizontal membership bypass (accessing another community's data) | Tampering | RLS EXISTS policy on every table; explicit `.eq('community_id', communityId)` on all queries (D-20) |
| Forged `communityId` in server action params | Tampering | D-12: role verified in DB for the given communityId; user must have membership record |
| Join request spam (many requests to same community) | Denial of Service | UNIQUE constraint on (community_id, user_id) in join_requests prevents duplicates |
| Race condition on approve: user approved twice | Tampering | UNIQUE constraint on (community_id, user_id) in community_members; second insert fails gracefully |
| Custom Access Token Hook still active after SQL deploy | Spoofing | Manual Supabase dashboard step required (documented in Runtime State Inventory) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase dashboard hook registration must be manually removed; SQL migration alone is insufficient | Runtime State Inventory | If wrong (SQL removal is enough), the manual step is unnecessary but harmless. If right and skipped, auth breaks for all users. |
| A2 | `createServiceClient()` pattern using service role key is appropriate for inserting join notifications from server actions | Code Examples / Open Questions | If project policy restricts service role to cron only, notification inserts need a different approach |
| A3 | Existing `members.test.ts` file can be extended for join request tests rather than creating a new file | Validation Architecture | Low risk — new file creation is equally valid |
| A4 | Slug uniqueness collision handling appends `-2`, `-3` suffix | Code Examples | Product decision — could use timestamp suffix instead; functional either way |

**All other claims in this research are verified against the codebase, local Next.js 16.2.2 docs, or locked CONTEXT.md decisions.**

---

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md` — params as Promise, loading.tsx interaction caveats, layout re-render behavior
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md` — Suspense boundary placement, instant loading states, layout caveat
- `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md` — `loading.tsx` convention, nested routes, dynamic routes
- `src/proxy.ts`, `src/lib/supabase/middleware.ts` — current proxy implementation
- `src/lib/types/auth.ts` — current type definitions including JWTCustomClaims
- `src/lib/supabase/server.ts` — current `getJWTClaims()` implementation
- `src/lib/actions/members.ts` — current action patterns (return shape, auth pattern)
- `src/components/nav/AppNav.tsx` — current JWT role reading, realtime subscription, nav tab structure
- `supabase/migrations/00001_foundation_schema.sql` — current RLS policies and Custom Access Token Hook
- `supabase/migrations/00006_notifications_schema.sql` — notifications CHECK constraint
- `supabase/migrations/00008_coach_client_assignments.sql` — existing JWT-based RLS policies to migrate
- `.planning/phases/08-community-selector/08-CONTEXT.md` — all locked decisions (D-01 through D-52)
- `.planning/phases/08-community-selector/08-UI-SPEC.md` — visual patterns, component inventory, copy contract

### Secondary (MEDIUM confidence)
- `src/lib/types/notifications.ts` — NotificationType union (verified CHECK constraint needs updating)
- `src/app/coach/clients/page.tsx` — representative migrated page pattern (getJWTClaims usage to be removed)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json
- Architecture patterns: HIGH — grounded in Next.js 16 docs + locked CONTEXT.md decisions + codebase verification
- Pitfalls: HIGH — grounded in actual codebase code paths and Next.js docs
- SQL migration: HIGH — verified against existing migration files
- Test infrastructure: MEDIUM — vitest detected from test files but config not fully verified

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days — Next.js 16 stable, Supabase stable)
