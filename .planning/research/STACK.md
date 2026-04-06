# Stack Research

**Domain:** Tennis community management platform (multi-tenant SaaS, scheduling + RSVP + notifications)
**Researched:** 2026-04-06
**Confidence:** HIGH (versions verified against npm registry; patterns verified against official docs)

---

## Recommended Stack

### Core Technologies (decided, non-negotiable)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.2 | Full-stack framework | App Router gives RSC for data-heavy pages, client components for interactive UI; Vercel deploys it with zero config |
| React | 19.x (bundled with Next.js 16) | UI runtime | Concurrent features, useOptimistic for RSVP interactions |
| Supabase | cloud | Auth + Postgres + Realtime + Storage | Auth, RLS, real-time subscriptions, and file storage in one managed service; generous free tier; React Native compatible |
| Tailwind CSS | 4.2.2 | Styling | v4 works without tailwind.config.ts; inline CSS variable theming; first-class Next.js 16 support |
| TypeScript | 5.x (bundled with Next.js 16) | Type safety | Supabase generates typed schema; Zod v4 infers TS types; required for team scaling |
| Vercel | cloud | Deployment + edge | Zero-config Next.js deployment; edge middleware for Supabase session refresh |

### Supabase Client Libraries

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @supabase/supabase-js | 2.101.1 | Supabase client | Core SDK for all Supabase services |
| @supabase/ssr | 0.10.0 | Cookie-based sessions for Next.js | Required for server components + middleware auth; replaces deprecated @supabase/auth-helpers |

**Important:** Use `createBrowserClient` from `@supabase/ssr` for client components and `createServerClient` for server components/middleware. The project requires client-side auth flows (not cookie-only) for future React Native compatibility — the browser client handles this correctly; React Native will use `@supabase/supabase-js` directly.

### UI Components

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| shadcn/ui | latest (CLI-installed) | Component library | Components are copied into the project — no version lock, no bundle bloat from unused components; first-class Next.js App Router support with automatic "use client" directives; standard for Next.js + Tailwind stacks in 2025 |
| Lucide React | latest (shadcn dependency) | Icons | Ships with shadcn; consistent icon set; tree-shakeable |
| sonner | 2.0.7 | Toast notifications | Used by shadcn/ui as the recommended toast solution; replaces older Radix toast primitive; excellent DX |

**What NOT to use:** Chakra UI, MUI, Ant Design — all carry large bundle overhead and fight against Tailwind. Do not use Radix Toast directly; sonner is the shadcn-recommended replacement.

### Forms and Validation

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| react-hook-form | 7.72.1 | Form state management | Zero re-renders on input; integrates with Zod via resolver; works with React 19 useActionState for server actions |
| zod | 4.3.6 | Schema validation | Single schema used on both client (RHF resolver) and server action — no duplication; infers TypeScript types automatically |
| @hookform/resolvers | 5.2.2 | Connects Zod to RHF | Required adapter package |

**Pattern:** Define a Zod schema, use it with `zodResolver` in RHF for client-side validation, re-use the same schema in the Server Action for server-side validation. This single-source-of-truth approach prevents drift between client and server validation rules.

### Server State and Data Fetching

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @tanstack/react-query | 5.96.2 | Server state + caching | Manages async data, background refetch, optimistic updates; pairs naturally with Supabase queries in client components; avoids prop-drilling server data through deep trees |

**Pattern:** Use React Server Components (RSC) for initial data fetches (no library needed — just `await supabase.from(...)` in async components). Use TanStack Query in client components where you need real-time cache invalidation, optimistic updates (RSVP toggles, waitlist), or background polling.

**What NOT to use:** Redux, MobX — heavyweight for this use case. TanStack Query handles server state; Zustand (below) handles UI state. No single global store needed.

### Client (UI) State

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| zustand | 5.0.12 | Client UI state | Minimal boilerplate; handles modal open/close, sidebar state, notification badge counts, and other UI-only state that doesn't belong in server state; 3KB gzipped |

**Scope:** Zustand manages only ephemeral UI state. Do not use it for data that lives in Supabase. Keep stores small and co-located with the feature that needs them.

### Date, Time, and Calendar

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| date-fns | 4.1.0 | Date manipulation | Tree-shakeable (each function has its own ESM entry point); excellent TypeScript types; works naturally with shadcn/ui's date picker (which uses date-fns as its adapter); functional API fits React patterns |
| @fullcalendar/react + plugins | 6.1.20 | Calendar views | Coach dashboard weekly/daily schedule view; richest feature set (drag-and-drop, recurring events, resource management); 1M+ weekly downloads; open source core is sufficient for MVP |

**FullCalendar setup:** Must wrap in a Client Component (`"use client"`) due to class-component internals. Use dynamic import with `ssr: false` to prevent hydration issues:
```typescript
const FullCalendar = dynamic(() => import('./FullCalendarClient'), { ssr: false })
```

**Required FullCalendar plugins for this project:**
- `@fullcalendar/daygrid` — month view
- `@fullcalendar/timegrid` — week/day view for coach schedule
- `@fullcalendar/interaction` — drag-and-drop session editing
- `@fullcalendar/list` — agenda view for mobile

**What NOT to use:** `react-big-calendar` — less maintained, requires manual recurring event handling, no built-in drag-and-drop without additional packages. Moment.js — deprecated. `dayjs` — fine but date-fns is better for tree-shaking in a Next.js bundle.

### In-App Notifications

**Pattern (no extra library needed for MVP):**

1. Create a `notifications` table in Supabase with `user_id`, `type`, `payload`, `read_at`, `created_at`
2. Fetch unread count on mount via TanStack Query
3. Subscribe to `INSERT` events on `notifications` table via Supabase Realtime (filtered by `user_id`)
4. On new notification: invalidate TanStack Query cache → badge updates; show sonner toast for high-priority events
5. Notification bell component reads from TanStack Query cache

This avoids a third-party notification SDK for MVP. RLS automatically ensures users only subscribe to their own notifications.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase CLI | Local development, migrations, type generation | Run `supabase gen types typescript` to keep database types in sync |
| ESLint + next/eslint | Linting | Bundled with Next.js; catches RSC/client boundary mistakes |
| Prettier | Code formatting | Consistent style; add `prettier-plugin-tailwindcss` for class sorting |
| prettier-plugin-tailwindcss | Tailwind class sorting | Prevents review noise from inconsistent class ordering |

---

## Multi-Tenancy Patterns (Supabase RLS)

This is the most architecturally important area for TenniCircle.

### Data Isolation Strategy

Every tenant-scoped table gets a `community_id` column. RLS policies enforce isolation:

```sql
-- Example: sessions table
CREATE POLICY "members_see_own_community_sessions" ON sessions
  USING (community_id = (auth.jwt() -> 'app_metadata' ->> 'community_id')::uuid);
```

**Custom Access Token Hook** — use Supabase's Custom Access Token Auth Hook (Auth > Hooks in dashboard) to inject `community_id` and `role` into the JWT `app_metadata` at login time. This avoids a database join on every RLS check.

### Role Hierarchy (Admin > Coach > Member)

Use a `memberships` table:
```
memberships(id, community_id, user_id, role ENUM('admin','coach','member'), created_at)
```

RLS helper function:
```sql
CREATE FUNCTION auth.user_role(p_community_id uuid)
RETURNS text AS $$
  SELECT role FROM memberships
  WHERE user_id = auth.uid() AND community_id = p_community_id
$$ LANGUAGE sql SECURITY DEFINER;
```

Then policies use: `auth.user_role(community_id) IN ('coach', 'admin')`

### Critical RLS Rules
- Always index `community_id` and `user_id` columns used in policies — missing indexes are the #1 RLS performance killer
- Use `USING` for reads/deletes, `WITH CHECK` for writes, `UPDATE` needs both
- Test RLS from the Supabase client SDK (not SQL Editor — SQL Editor bypasses RLS)
- Service role key bypasses RLS — only use it in server-side admin operations

### Realtime Subscriptions with RLS

Supabase Realtime respects RLS for `postgres_changes` subscriptions — the server checks each client's RLS policy before broadcasting. However:
- RLS is NOT applied to DELETE events (no row to check against); filter client-side by ID
- Client session must be valid (non-expired JWT) when subscribing; refresh session before subscribing in useEffect
- Auth policies are cached per connection — reconnect when user role changes

---

## Installation

```bash
# Core (Next.js created separately via: npx create-next-app@latest)
npm install @supabase/supabase-js @supabase/ssr

# UI
npm install sonner lucide-react
# shadcn/ui components added individually via:
# npx shadcn@latest add button card dialog form input label select table tabs

# Forms + Validation
npm install react-hook-form zod @hookform/resolvers

# State
npm install @tanstack/react-query zustand

# Date + Calendar
npm install date-fns
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list

# Dev
npm install -D prettier prettier-plugin-tailwindcss
# Supabase CLI installed globally:
# npm install -g supabase
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| UI Components | shadcn/ui | Chakra UI | Large bundle; fights Tailwind; not standard for Next.js + Tailwind stacks |
| UI Components | shadcn/ui | MUI | Material design aesthetic wrong for sports community app; heavy bundle |
| Forms | react-hook-form + zod | Formik | Formik is slower (re-renders on every keystroke); less active maintenance |
| Calendar | FullCalendar | react-big-calendar | Less maintained; no built-in recurring event support; requires more custom code |
| Calendar | FullCalendar | Custom solution | Drag-and-drop, recurring events, and resource scheduling are hard to build correctly |
| Server State | TanStack Query | SWR | TanStack Query v5 has better optimistic update patterns and more granular cache control for this use case |
| Client State | Zustand | Redux Toolkit | Redux adds unnecessary boilerplate for UI-only state; Zustand is 3KB vs 20KB+ |
| Date Library | date-fns | dayjs | date-fns is tree-shakeable per function; better TypeScript types; shadcn date picker uses date-fns |
| Notifications | Custom (DB table + Realtime) | Novu, Knock, Courier | Third-party notification SDKs add cost and complexity unnecessary for MVP's in-app-only requirement |
| Auth | Supabase Auth (built-in) | Clerk, Auth0 | Already using Supabase; Supabase Auth is sufficient for email/password + RLS; avoids external dependency |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @supabase/auth-helpers | Deprecated; replaced by @supabase/ssr | @supabase/ssr 0.10.0 |
| Moment.js | 67KB, no tree-shaking, mutable; officially deprecated | date-fns 4.x |
| next-auth (Auth.js) | Adds complexity when Supabase Auth already handles this; can conflict with Supabase session management | @supabase/ssr auth patterns |
| Prisma/Drizzle | Supabase provides a Postgres client and type generation; ORMs add a layer that fights against RLS | @supabase/supabase-js direct queries + generated types |
| Redux Toolkit | Overkill for UI state; confuses server state with client state | Zustand (UI state) + TanStack Query (server state) |
| react-query v3/v4 | Breaking API changes from v5; v5 is the current standard | @tanstack/react-query 5.x |
| Tailwind v3 | v4 removes config file requirement; better performance; shadcn/ui 2025 targets v4 | Tailwind CSS 4.2.2 |
| server-only Supabase client for subscriptions | Realtime subscriptions must be client-side (WebSocket); server components can't hold connections | createBrowserClient in client components |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next 16.2.2 | react 19.x, tailwindcss 4.x | Bundled together via create-next-app |
| @supabase/ssr 0.10.0 | @supabase/supabase-js 2.x | Always install both; ssr wraps supabase-js |
| zod 4.3.6 | @hookform/resolvers 5.2.2 | Resolvers v5 required for Zod v4; do NOT use resolvers v4 with Zod v4 |
| @fullcalendar/* 6.1.x | react 19.x | All FullCalendar packages must be same minor version; use "use client" wrapper |
| date-fns 4.x | shadcn/ui date picker | shadcn date picker uses date-fns as peer dependency |
| tailwindcss 4.x | shadcn/ui | Run `npx shadcn@latest init` which auto-detects Tailwind v4 |

---

## Sources

- npm registry (verified versions directly): @supabase/supabase-js 2.101.1, @supabase/ssr 0.10.0, next 16.2.2, tailwindcss 4.2.2, zod 4.3.6, react-hook-form 7.72.1, @hookform/resolvers 5.2.2, @tanstack/react-query 5.96.2, zustand 5.0.12, date-fns 4.1.0, @fullcalendar/react 6.1.20, sonner 2.0.7 — HIGH confidence
- [Supabase RLS official docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS patterns, USING/WITH CHECK semantics — HIGH confidence
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization) — RLS enforcement on postgres_changes — HIGH confidence
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — JWT custom claims for multi-tenancy — HIGH confidence
- [Supabase SSR Next.js guide](https://supabase.com/docs/guides/auth/server-side/nextjs) — createBrowserClient / createServerClient patterns — HIGH confidence
- [TanStack Query v5 SSR docs](https://tanstack.com/query/v5/docs/react/guides/ssr) — App Router hydration patterns — HIGH confidence
- [shadcn/ui Next.js installation](https://ui.shadcn.com/docs/installation/next) — Tailwind v4 + App Router setup — HIGH confidence
- [FullCalendar React docs](https://fullcalendar.io/docs/react) — React component, Next.js integration — HIGH confidence
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) — RLS behaviour on realtime, DELETE caveat — HIGH confidence
- [makerkit.dev RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — Production multi-tenant patterns across 100+ deployments — MEDIUM confidence (third-party but well-regarded)
- [Building Real-time Notification System with Supabase](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs) — Notification architecture pattern — MEDIUM confidence

---

*Stack research for: TenniCircle — tennis community management platform*
*Researched: 2026-04-06*
