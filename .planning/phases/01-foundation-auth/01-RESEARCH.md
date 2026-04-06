# Phase 1: Foundation & Auth - Research

**Researched:** 2026-04-07
**Domain:** Supabase Auth + Next.js 16 App Router SSR + Multi-tenant RLS
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single page at /auth with Login and Sign Up tabs — no separate routes
- **D-02:** Sign-up collects email + password only — name and details captured later in profile setup
- **D-03:** Auth errors displayed inline below the specific field that has the error
- **D-04:** Email verification required before accessing the app — user must click confirmation link
- **D-05:** Open sign-up — anyone can create an account and become a community member without an invite
- **D-06:** Admin generates a coach invite link; signing up through it assigns the Coach role automatically
- **D-07:** Coaches generate a shareable invite link; signing up through it assigns the client to that coach (optional — not required for app access)
- **D-08:** Invite links do not expire — valid until manually revoked by the creator
- **D-09:** Three roles enforced: Admin, Coach, Client (member). Coach-client relationship is optional, not gating
- **D-10:** Role-based home pages — Admin lands on admin dashboard, Coach on schedule view, Client on upcoming sessions
- **D-11:** Phase 1 post-login: welcome page prompting profile setup (since session pages don't exist yet)
- **D-12:** Unauthenticated users redirected to /auth — after login, returned to the originally requested page
- **D-13:** Users accessing pages above their role are silently redirected to their role-appropriate home page
- **D-14:** Navigation hides links to pages the user's role cannot access

### Claude's Discretion
- Loading spinner/skeleton design during auth state checks
- Exact form validation timing (on blur vs on submit)
- Password strength requirements (minimum length, complexity)
- Session refresh strategy (Supabase handles this, but edge cases like token expiry UX)

### Deferred Ideas (OUT OF SCOPE)
- Moderator/manager roles for community control (blacklist, ban, kick) — future phase
- OAuth / magic link login — explicitly out of scope per PROJECT.md
- Email notifications for invite/verification — in-app only for MVP
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up with email and password | Supabase `signUp()` + email verification flow; /auth page with tabs |
| AUTH-02 | User can log in and stay logged in across browser refresh | `@supabase/ssr` proxy pattern with `getAll`/`setAll` cookie management; token auto-refresh |
| AUTH-03 | Three user roles enforced: Admin, Coach, Client | Custom Access Token Hook injects role into JWT; `auth.jwt()` used in RLS + proxy routing |
| AUTH-04 | Admin can add and remove coaches from the community | `community_members` table with role column; Admin server action to update role; JWT refresh triggers hook to pick up new role |
| AUTH-05 | Coaches can invite clients via invite link | `invite_links` table; token-in-URL sign-up flow; on sign-up callback assigns role via invite token lookup |
| AUTH-06 | Multi-tenant data isolation via RLS (community-scoped) | `community_id` claim in JWT via Custom Access Token Hook; RLS policies use `auth.jwt()->'community_id'` on all tables |
</phase_requirements>

---

## Summary

This phase wires up Supabase Auth into a brand-new Next.js 16 App Router scaffold. The two hardest parts are (1) correctly integrating `@supabase/ssr` with Next.js 16's renamed file conventions, and (2) designing a Custom Access Token Hook that embeds both `role` and `community_id` into every JWT so RLS policies can enforce multi-tenant isolation without extra round-trips.

The Supabase SSR library (`@supabase/ssr` 0.10.0) is already installed. It requires two client factories — `createBrowserClient` for `'use client'` components and `createServerClient` for server components, Server Actions, and the proxy. The proxy (`proxy.ts` in Next.js 16 — no longer `middleware.ts`) is mandatory: it must call `supabase.auth.getClaims()` on every request so that expired tokens are refreshed before the page renders. Skipping the proxy is the single most common cause of intermittent session loss in Next.js/Supabase apps.

For roles and multi-tenancy, the Custom Access Token Hook (a PostgreSQL function registered in Supabase Dashboard > Authentication > Hooks) runs before every token issuance and injects `role` and `community_id` into the JWT. All RLS policies then read `auth.jwt()->'role'` and `auth.jwt()->'community_id'` directly — no extra table lookup on each query. Role changes need a forced token refresh (call `supabase.auth.refreshSession()`) to propagate immediately, satisfying success criterion 5.

**Primary recommendation:** Implement in this order: (1) DB schema + RLS, (2) Custom Access Token Hook, (3) Supabase client utilities, (4) proxy.ts, (5) /auth page, (6) role-based routing, (7) invite link system.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.101.1 | Supabase client — auth, DB queries | Already installed; official SDK |
| @supabase/ssr | 0.10.0 | SSR-safe cookie client factories | Already installed; replaces deprecated auth-helpers |
| zod | 4.3.6 (latest) | Form/server-action schema validation | Next.js docs recommend it explicitly for auth forms |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.2 (latest) | Unit test runner | Required by nyquist_validation; fastest for Next.js |
| @vitejs/plugin-react | 6.0.1 (latest) | React support in Vitest | Required with Vitest for JSX |
| @testing-library/react | 16.3.2 (latest) | Component testing | Testing form components |
| vite-tsconfig-paths | 6.1.1 (latest) | Path alias support in Vitest | Needed for `@/*` imports in tests |
| jsdom | 29.0.1 (latest) | DOM environment for Vitest | Browser simulation in tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| zod | yup | Zod has better TypeScript inference and is explicitly recommended in Next.js 16 docs |
| vitest | jest | Vitest is recommended in the local Next.js 16 docs and is faster; Jest requires more config for ESM |

### Installation (testing dependencies only — auth libraries already installed)
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom vite-tsconfig-paths jsdom
npm install zod
```

**Version verification:** Versions above confirmed via `npm view [package] version` on 2026-04-07. [VERIFIED: npm registry]

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── auth/
│   │   └── page.tsx              # /auth — login + signup tabs (D-01)
│   ├── welcome/
│   │   └── page.tsx              # Phase 1 post-login landing (D-11)
│   ├── admin/
│   │   └── page.tsx              # Admin home (D-10)
│   ├── coach/
│   │   └── page.tsx              # Coach home (D-10)
│   ├── (client)/
│   │   └── page.tsx              # Client home (D-10)
│   ├── auth/
│   │   └── confirm/
│   │       └── route.ts          # Email verification callback
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   └── supabase/
│       ├── client.ts             # createBrowserClient (browser)
│       ├── server.ts             # createServerClient (server components, actions)
│       └── middleware.ts         # createServerClient for proxy (can set cookies)
├── components/
│   ├── auth/
│   │   ├── AuthPage.tsx          # Tabs wrapper (login + signup)
│   │   ├── LoginForm.tsx
│   │   └── SignUpForm.tsx
│   └── nav/
│       └── NavBar.tsx            # Hides links based on role (D-14)
└── proxy.ts                      # Session refresh + route protection (root of src/)
```

> **Note:** In Next.js 16, the file at `src/proxy.ts` replaces the older `src/middleware.ts`. The function must be named `proxy` (not `middleware`). [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md]

### Pattern 1: Supabase Client Factories

Three distinct clients are needed — one per execution context. Never share a single instance across them.

**Browser client** (`src/lib/supabase/client.ts`) — used in `'use client'` components:
```typescript
// Source: @supabase/ssr README + createBrowserClient.d.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Server client** (`src/lib/supabase/server.ts`) — used in Server Components, Server Actions, Route Handlers (read-only cookies):
```typescript
// Source: @supabase/ssr createServerClient.d.ts + design.md
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // setAll omitted — server components cannot set cookies
        // The proxy handles token refresh writes
      },
    }
  )
}
```

**Proxy client** (`src/lib/supabase/middleware.ts`) — used inside proxy.ts only (can read AND write cookies):
```typescript
// Source: @supabase/ssr README + design.md (mandatory getAll + setAll)
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getClaims() validates JWT signature — do NOT use getSession() here
  const { data: { user } } = await supabase.auth.getUser()

  // Route protection logic here...

  return supabaseResponse
}
```

### Pattern 2: proxy.ts (Next.js 16 — replaces middleware.ts)
```typescript
// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
// File: src/proxy.ts (NOT src/middleware.ts in Next.js 16)
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Exclude static files, images, and _next internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 3: Custom Access Token Hook (SQL)

Runs before every JWT is issued. Injects `role` and `community_id` into claims. This is the keystone of RLS.

```sql
-- Source: supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
-- Run in Supabase SQL Editor, then register in Dashboard > Authentication > Hooks

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role text;
  user_community_id uuid;
begin
  -- Look up membership record for this user
  select role, community_id
    into user_role, user_community_id
    from public.community_members
   where user_id = (event->>'user_id')::uuid
   limit 1; -- single community per user for MVP

  claims := event->'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    claims := jsonb_set(claims, '{community_id}', to_jsonb(user_community_id));
  else
    -- Open sign-up: user exists in auth.users but not yet in community_members
    claims := jsonb_set(claims, '{user_role}', '"pending"');
    claims := jsonb_set(claims, '{community_id}', 'null');
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on table public.community_members to supabase_auth_admin;
```

**Important:** Required JWT claims (`iss`, `aud`, `exp`, `iat`, `sub`, `role`, `aal`, `session_id`) must not be overwritten. Custom claims go in `user_role` and `community_id` — not `role`. [VERIFIED: supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook]

### Pattern 4: RLS Policy with community_id
```sql
-- Source: supabase.com/docs/guides/database/postgres/row-level-security
-- Applied to any multi-tenant table (sessions, profiles, etc.)

alter table public.sessions enable row level security;

create policy "community members only"
on public.sessions
for all
to authenticated
using (
  community_id = (auth.jwt() ->> 'community_id')::uuid
);
```

### Pattern 5: Role-checking RLS helper
```sql
-- Reusable helper for role-based policies
create or replace function public.get_user_role()
returns text as $$
  select auth.jwt() ->> 'user_role'
$$ language sql stable security definer set search_path = '';

-- Usage in policy:
-- using (public.get_user_role() = 'admin')
```

### Pattern 6: Forced role refresh after role change
```typescript
// Source: @supabase/supabase-js auth API — called in client after server action updates role
// This satisfies success criterion 5 (role changes take effect immediately)
const { error } = await supabase.auth.refreshSession()
```

### Core Database Schema

```sql
-- communities table (multi-tenancy foundation)
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

-- community_members table (drives the Custom Access Token Hook)
create table public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('admin', 'coach', 'client')),
  coach_id uuid references public.community_members(id), -- optional coach relationship (D-07)
  joined_at timestamptz default now(),
  unique (community_id, user_id)
);

-- invite_links table (supports D-06 and D-07)
create table public.invite_links (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) not null,
  created_by uuid references public.community_members(id) not null,
  role text not null check (role in ('coach', 'client')),
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  revoked_at timestamptz, -- null = active (D-08: no expiry)
  created_at timestamptz default now()
);
```

### Anti-Patterns to Avoid
- **Using `getSession()` for authorization in proxy:** Returns unverified claims from cookies. Use `getUser()` instead. [VERIFIED: @supabase/ssr README]
- **Using `middleware.ts` filename:** In Next.js 16, this convention is deprecated. File must be `proxy.ts` with function named `proxy`. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md v16.0.0]
- **Using `get`/`set`/`remove` cookie methods:** Deprecated in `@supabase/ssr` 0.4.0+. Use `getAll`/`setAll` only. Next major version removes the old API. [VERIFIED: @supabase/ssr docs/design.md]
- **Shared singleton Supabase client:** Cross-user session leaks on Vercel. Create a new client per request server-side. [CITED: .planning/STATE.md]
- **Storing role in `user_metadata`:** Users can modify their own `user_metadata`. Role must live in `app_metadata` or a separate table controlled by the service role. [VERIFIED: supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac]
- **Relying only on proxy for auth enforcement:** The proxy is the UX layer; RLS is the true security layer. Always enable RLS even if proxy redirects are in place.
- **Not calling proxy's `supabase.auth.getUser()` before any redirect logic:** The lazy session initialization means the token only refreshes when you actually call auth methods. Must call early in the proxy handler.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie management | Custom token/cookie storage | `@supabase/ssr` createServerClient/createBrowserClient | Cookie chunking (3180-byte limit), Base64-URL encoding, chunk cleanup on resize — all handled |
| Password hashing | bcrypt calls in sign-up action | Supabase auth.signUp() | Supabase handles bcrypt, salting, and storage in auth.users |
| JWT validation | Manual JWKS verification | `supabase.auth.getUser()` in proxy | Supabase validates against project's public keys on every call |
| Token refresh | Cron job / timer | @supabase/ssr proxy pattern | The proxy intercepts every navigation and refreshes proactively |
| Invite token generation | UUID/nanoid tokens stored in app | `gen_random_bytes(32)` in DB default | Cryptographically secure; generation happens at DB layer |
| Role-based query filtering | Application-level WHERE clauses | RLS policies with `auth.jwt()` | RLS runs at Postgres level; client cannot bypass it |

**Key insight:** The auth-helpers-to-ssr migration is complete — `@supabase/auth-helpers-nextjs` is deprecated. All SSR patterns must use `@supabase/ssr` directly.

---

## Common Pitfalls

### Pitfall 1: middleware.ts vs proxy.ts filename
**What goes wrong:** Naming the file `middleware.ts` works in Next.js 15 but is deprecated in Next.js 16. The function inside must also be renamed from `middleware` to `proxy`.
**Why it happens:** Next.js 16 renamed the file convention to better reflect its purpose. Backward compatibility exists but is deprecated.
**How to avoid:** Create `src/proxy.ts` with `export function proxy(request: NextRequest)`. Do not create `middleware.ts`.
**Warning signs:** Deprecation warning in Next.js console output at startup. [VERIFIED: proxy.md v16.0.0 changelog]

### Pitfall 2: getSession() vs getUser() in server code
**What goes wrong:** `getSession()` reads cookies directly without verifying the JWT signature. A malicious client could craft cookies with a spoofed user ID and pass the session check.
**Why it happens:** `getSession()` is zero-network, so it feels like the "fast" choice for server code.
**How to avoid:** Use `getUser()` in proxy and server components for any authorization decision. Reserve `getSession()` only if you need the session object for data (e.g., access_token) and you're already past an auth gate.
**Warning signs:** `getUser()` making more requests than expected — this is correct and expected. [VERIFIED: @supabase/ssr README]

### Pitfall 3: Custom Access Token Hook not assigned in Dashboard
**What goes wrong:** The PL/pgSQL hook function exists in the database but is never called because it hasn't been registered in Dashboard > Authentication > Hooks (Beta).
**Why it happens:** Creating the function is step 1; registering it is step 2. Easy to miss.
**How to avoid:** After deploying the SQL, verify the hook is enabled in the Supabase Dashboard. Test by decoding a JWT (e.g., jwt.io) to confirm `user_role` and `community_id` claims are present.
**Warning signs:** RLS policies fail with permission denied; JWT does not contain `user_role` claim. [VERIFIED: supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook]

### Pitfall 4: Role changes not reflected until JWT expires (up to 1 hour)
**What goes wrong:** Admin updates a user's role in the database. The user refreshes the page. Their role in the JWT is still the old one, so RLS policies and routing still treat them as the old role.
**Why it happens:** JWTs are cached until their `exp` claim. The Custom Access Token Hook only runs when a new token is issued.
**How to avoid:** After any role change server action, call `supabase.auth.refreshSession()` on the client, or trigger it from the server via a redirect that forces re-auth. Success criterion 5 requires this.
**Warning signs:** User sees stale role after an admin operation. [ASSUMED — standard JWT behavior, but the exact refresh trigger mechanism needs implementation decision]

### Pitfall 5: setAll not implemented on both request AND response in proxy
**What goes wrong:** Token refresh writes cookies to the response but not back to the request. Subsequent reads within the same request lifecycle see the old token.
**Why it happens:** The design.md example shows that `setAll` must call `request.cookies.set` AND `supabaseResponse.cookies.set` — a subtle two-step requirement.
**How to avoid:** Follow the exact proxy client pattern above (Pattern 3). Do not simplify to only writing to the response.
**Warning signs:** Random session drops on fresh page loads; "session: null" errors in server components after recent login. [VERIFIED: @supabase/ssr docs/design.md]

### Pitfall 6: Invite link assignment race condition
**What goes wrong:** User signs up via invite link but the sign-up callback fails to look up the invite token, so they get the default 'client' role (or no role) instead of the intended role.
**Why it happens:** The invite token must be passed through the email verification flow as a URL param, which Supabase email templates don't automatically forward.
**How to avoid:** Store the invite token in a query param that persists through the `redirectTo` URL in `auth.signUp()`. The `/auth/confirm` route handler reads it after email confirmation and writes the community_members record.
**Warning signs:** Users who signed up via coach invite link have wrong role. [ASSUMED — based on Supabase auth flow design; exact token threading implementation not verified in official docs]

---

## Code Examples

### Sign-up with email verification
```typescript
// Source: @supabase/supabase-js auth API
// Used in SignUpForm Server Action
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    // redirectTo includes invite token so it survives email verification
    emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?invite=${inviteToken}`,
  },
})
```

### Login
```typescript
// Source: @supabase/supabase-js auth API
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
```

### Email confirmation route handler (`/auth/confirm/route.ts`)
```typescript
// Source: Supabase Next.js SSR guide pattern
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const inviteToken = searchParams.get('invite')

  if (token_hash && type === 'email') {
    const supabase = await createClient()
    await supabase.auth.verifyOtp({ type: 'email', token_hash })
    // Process invite token if present — create community_members record
    // Then redirect to welcome page
    return NextResponse.redirect(new URL('/welcome', request.url))
  }
  return NextResponse.redirect(new URL('/auth?error=invalid_link', request.url))
}
```

### Reading user role from JWT in server component
```typescript
// Source: supabase.com/docs/guides/auth/server-side pattern
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
const role = user?.app_metadata?.user_role ?? 'pending'
```

### Form validation with Zod (Next.js 16 recommended pattern)
```typescript
// Source: node_modules/next/dist/docs/01-app/02-guides/authentication.md
import { z } from 'zod'

const AuthSchema = z.object({
  email: z.email({ error: 'Please enter a valid email.' }).trim(),
  password: z
    .string()
    .min(8, { error: 'Be at least 8 characters long.' })
    .trim(),
})
```

> **Note:** Zod 4 uses `z.email()` as a top-level function, not `z.string().email()`. The API changed in v4.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023-2024 | Old package is deprecated; SSR package is the standard |
| `get`/`set`/`remove` cookie methods | `getAll`/`setAll` | `@supabase/ssr` 0.4.0 | Old methods deprecated; next major version removes them |
| `middleware.ts` + `export function middleware` | `proxy.ts` + `export function proxy` | Next.js v16.0.0 | Backward compat exists but deprecated; new projects must use proxy.ts |
| `getSession()` for auth checks | `getUser()` for server auth | `@supabase/ssr` 0.4.0 | getSession() is unverified; getUser() validates JWT |
| Storing role in `user_metadata` | Custom Access Token Hook + `app_metadata` | Supabase hooks GA | user_metadata is user-writable; hooks provide server-controlled claims |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | After a server-side role change, calling `supabase.auth.refreshSession()` on the client will force the Custom Access Token Hook to re-run and issue a new JWT with the updated role | Common Pitfalls #4 | Role changes don't take effect immediately — violates success criterion 5. Mitigation: test this flow during implementation |
| A2 | The invite token can be threaded through Supabase's email confirmation URL via the `emailRedirectTo` `invite=` query param and recovered in the `/auth/confirm` route handler | Common Pitfalls #6, Code Examples | Invite flow silently fails to assign roles. Mitigation: verify with a test sign-up through an invite link during implementation |
| A3 | The Supabase project at `NEXT_PUBLIC_SUPABASE_URL` has the Custom Access Token Hook feature available (requires Supabase project on Pro or Free tier with hooks enabled) | Architecture Patterns #3 | Cannot implement role/community JWT injection at all. Mitigation: verify in Supabase Dashboard > Authentication > Hooks before starting DB work |
| A4 | `community_members` table with `limit 1` in the hook is safe for MVP (one community per user). The blocker flagged in STATE.md about multi-community membership is confirmed as non-issue for Phase 1 | Architecture Patterns #3 | If Jaden's test data puts users in multiple communities, the hook returns an arbitrary one. Mitigation: design is intentionally single-community for MVP; document this assumption |

---

## Open Questions

1. **Multi-community membership in the Custom Access Token Hook**
   - What we know: STATE.md flags this as a research question — "currently assumes single-community per user"
   - What's unclear: If a user is in multiple communities, the hook's `limit 1` picks arbitrarily. No mechanism to switch community context in the JWT for MVP.
   - Recommendation: Confirm with Joon that single-community per user is the MVP assumption. If multi-community is needed later, the pattern changes significantly (community context must be a per-request claim, not a per-token claim). Lock this as an MVP constraint before implementation.

2. **Supabase Auth Hook availability on free tier**
   - What we know: Custom Access Token Hook is required for role + community_id in JWT
   - What's unclear: Whether the Supabase project is on a tier that enables Auth Hooks (Beta)
   - Recommendation: Verify in Supabase Dashboard before designing tasks around the hook. If unavailable, the fallback is reading role from a `profiles` table on each protected page — slower but functional.

3. **Email verification redirect URL in production vs local**
   - What we know: `emailRedirectTo` must be an absolute URL, and Supabase only allows configured site URLs
   - What's unclear: Whether `NEXT_PUBLIC_SITE_URL` is configured in Supabase project settings and `.env.local`
   - Recommendation: Add `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.local` and set the production URL in Supabase Dashboard > Authentication > URL Configuration before implementing email verification.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + runtime | ✓ | 25.8.1 | — |
| npm | Package management | ✓ | 11.11.0 | — |
| Next.js | App framework | ✓ | 16.2.2 (installed) | — |
| @supabase/supabase-js | Auth + DB | ✓ | 2.101.1 (installed) | — |
| @supabase/ssr | SSR auth | ✓ | 0.10.0 (installed) | — |
| Supabase project (cloud) | Auth, DB, RLS | ✓ (configured in .env.local) | — | — |
| Supabase Auth Hooks | Custom JWT claims | [ASSUMED] | — | Read role from DB per-request (slower) |
| zod | Form validation | ✗ (not yet installed) | 4.3.6 available | yup (less preferred) |
| vitest + testing deps | Unit tests | ✗ (not yet installed) | 4.1.2 available | — (required by nyquist_validation) |

**Missing dependencies with no fallback:**
- zod and vitest must be installed in Wave 0

**Missing dependencies with fallback:**
- Supabase Auth Hooks: If unavailable on current plan, role can be fetched from `community_members` table in server components. This impacts performance but not correctness.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (not yet installed) |
| Config file | `vitest.config.mts` — see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | SignUpForm renders and submits email+password | unit (component) | `npx vitest run src/__tests__/auth/SignUpForm.test.tsx` | ❌ Wave 0 |
| AUTH-01 | signUp Server Action validates with Zod and calls supabase.auth.signUp | unit (action) | `npx vitest run src/__tests__/actions/auth.test.ts` | ❌ Wave 0 |
| AUTH-02 | createBrowserClient singleton is returned on repeated calls | unit | `npx vitest run src/__tests__/lib/supabase-client.test.ts` | ❌ Wave 0 |
| AUTH-03 | proxy redirects unauthenticated requests to /auth | unit (proxy) | `npx vitest run src/__tests__/proxy.test.ts` | ❌ Wave 0 |
| AUTH-03 | proxy redirects coach trying to access /admin to /coach | unit (proxy) | same file | ❌ Wave 0 |
| AUTH-04 | updateRole server action updates community_members row | unit (action/mock) | `npx vitest run src/__tests__/actions/members.test.ts` | ❌ Wave 0 |
| AUTH-05 | invite link generation creates a row in invite_links | unit (action/mock) | `npx vitest run src/__tests__/actions/invites.test.ts` | ❌ Wave 0 |
| AUTH-06 | RLS policy SQL is present in migration | manual (Supabase dashboard) | N/A — manual-only | N/A |

> **Manual-only justification (AUTH-06 RLS):** RLS policies run inside Postgres. Testing them properly requires a live Supabase instance with the schema applied. This is an integration concern beyond Vitest unit tests. Verify via Supabase SQL Editor during implementation.

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/auth/SignUpForm.test.tsx` — covers AUTH-01 form rendering
- [ ] `src/__tests__/actions/auth.test.ts` — covers AUTH-01 server action
- [ ] `src/__tests__/lib/supabase-client.test.ts` — covers AUTH-02 client factory
- [ ] `src/__tests__/proxy.test.ts` — covers AUTH-03 route protection
- [ ] `src/__tests__/actions/members.test.ts` — covers AUTH-04 role management
- [ ] `src/__tests__/actions/invites.test.ts` — covers AUTH-05 invite links
- [ ] `vitest.config.mts` — Vitest configuration with jsdom + tsconfigPaths
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom vite-tsconfig-paths jsdom`
- [ ] `npm install zod`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (signUp, signInWithPassword, email verification) |
| V3 Session Management | yes | @supabase/ssr cookie management with getAll/setAll; proxy pattern for token refresh |
| V4 Access Control | yes | RLS policies + Custom Access Token Hook for role/community enforcement |
| V5 Input Validation | yes | zod schema validation in Server Actions (email, password) |
| V6 Cryptography | no | Supabase handles password hashing (bcrypt) and JWT signing — do not hand-roll |

### Known Threat Patterns for Supabase + Next.js

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Spoofed session cookie | Spoofing | Use `getUser()` not `getSession()` in proxy — validates JWT signature |
| JWT with stale role after role removal | Elevation of Privilege | Force `refreshSession()` after role changes; RLS is ground truth |
| RLS bypass via service role key on client | Tampering | Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser — only use in server-only files |
| Invite token brute-force | Tampering | Use `gen_random_bytes(32)` = 256-bit entropy; no expiry by design (D-08) but revocation is supported |
| Open redirect via `redirectTo` after login | Spoofing | Validate `redirectTo` against an allowlist of app-internal paths before using |
| Parallel refresh token exhaustion | Denial of Service | Supabase SSR design.md documents this — proxy pattern mitigates for navigations; handle null sessions gracefully in fetch calls |
| Unverified email accessing protected routes | Spoofing | Supabase `user.email_confirmed_at` — check in proxy before granting access |

---

## Project Constraints (from CLAUDE.md)

The following directives from CLAUDE.md apply to all implementation in this phase:

| Directive | Applies To |
|-----------|-----------|
| Next.js App Router only (no Pages Router) | All routing, layouts, and pages |
| TypeScript strict mode | All new files |
| Tailwind CSS 4 for styling (no CSS-in-JS) | Auth page UI, nav bar |
| `@/*` path alias maps to `./src/*` | All imports |
| Arrow functions for component definitions | All new components |
| Server Components by default; `'use client'` only when needed | Auth form components will need `'use client'` for `useActionState` |
| No Prettier — ESLint only | Code style enforcement |
| `export default function ComponentName` pattern | All page/layout components |
| Must keep API layer clean for future React Native | Use Server Actions for auth mutations — not API routes — so client calls are not coupled to Next.js |
| Multi-tenancy must be in data model from day one | `community_id` on every data table; RLS from the first migration |
| **Read `node_modules/next/dist/docs/` before writing any code** | Heed proxy.ts rename specifically |

---

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — proxy.ts file convention, Next.js 16 rename from middleware.ts, version history
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md` — Server Action auth pattern, Zod integration, useActionState
- `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md` — Vitest setup for Next.js
- `node_modules/@supabase/ssr/README.md` — getSession vs getUser vs getClaims, concurrent refresh race condition, middleware pattern requirement
- `node_modules/@supabase/ssr/docs/design.md` — getAll/setAll requirement, cookie chunking, setAll on both request AND response
- `node_modules/@supabase/ssr/dist/main/createServerClient.d.ts` — createServerClient API, lazy initialization, setAll requirement
- `node_modules/@supabase/ssr/dist/main/createBrowserClient.d.ts` — createBrowserClient API

### Secondary (MEDIUM confidence)
- [Supabase Custom Claims & RBAC docs](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — Custom Access Token Hook SQL pattern, RLS integration, `auth.jwt()` usage
- [Supabase Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — Hook function signature, required vs optional claims
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — `enable row level security`, `auth.jwt()` in policies
- [Supabase SSR Creating a Client](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — two client types pattern, proxy requirements, getClaims() recommendation

### Tertiary (LOW confidence — flagged for validation)
- WebSearch result confirming Supabase documentation now references proxy.ts for Next.js 16 — needs direct Supabase docs confirmation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; versions confirmed via npm registry
- Architecture patterns: HIGH — client factories, proxy pattern, and RLS SQL verified from installed package source and Next.js 16 docs
- Custom Access Token Hook: MEDIUM — SQL pattern verified from official Supabase docs; hook registration UI step is manual
- Pitfalls: HIGH — all major pitfalls sourced from the installed @supabase/ssr README and design.md
- Invite token threading: LOW (A2) — pattern is logical but exact Supabase behavior through email verification needs implementation validation

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable libraries, but check Supabase hooks availability on project plan)
