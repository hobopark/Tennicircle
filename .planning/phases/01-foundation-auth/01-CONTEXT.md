# Phase 1: Foundation & Auth - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can sign up, log in, and be correctly scoped to their community with their role enforced. Multi-tenant data model with RLS. Auth flows use Supabase client-side auth (future React Native compatibility). Email/password only for MVP.

</domain>

<decisions>
## Implementation Decisions

### Auth flow UX
- **D-01:** Single page at /auth with Login and Sign Up tabs — no separate routes
- **D-02:** Sign-up collects email + password only — name and details captured later in profile setup
- **D-03:** Auth errors displayed inline below the specific field that has the error
- **D-04:** Email verification required before accessing the app — user must click confirmation link

### Role assignment & invites
- **D-05:** Open sign-up — anyone can create an account and become a community member without an invite
- **D-06:** Admin generates a coach invite link; signing up through it assigns the Coach role automatically
- **D-07:** Coaches generate a shareable invite link; signing up through it assigns the client to that coach (optional — not required for app access)
- **D-08:** Invite links do not expire — valid until manually revoked by the creator
- **D-09:** Three roles enforced: Admin, Coach, Client (member). Coach-client relationship is optional, not gating

### Post-login routing
- **D-10:** Role-based home pages — Admin lands on admin dashboard, Coach on schedule view, Client on upcoming sessions
- **D-11:** Phase 1 post-login: welcome page prompting profile setup (since session pages don't exist yet)

### Protected page behavior
- **D-12:** Unauthenticated users redirected to /auth — after login, returned to the originally requested page
- **D-13:** Users accessing pages above their role are silently redirected to their role-appropriate home page
- **D-14:** Navigation hides links to pages the user's role cannot access

### Claude's Discretion
- Loading spinner/skeleton design during auth state checks
- Exact form validation timing (on blur vs on submit)
- Password strength requirements (minimum length, complexity)
- Session refresh strategy (Supabase handles this, but edge cases like token expiry UX)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Project-level references
- `.planning/PROJECT.md` — Vision, constraints, key decisions including client-side auth flow rationale
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-06 acceptance criteria
- `.planning/codebase/STACK.md` — Supabase SDK versions, Next.js 16 configuration
- `.planning/codebase/ARCHITECTURE.md` — Current app structure, entry points

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — codebase is a fresh Next.js 16 scaffold with only the default page and layout

### Established Patterns
- TypeScript strict mode enabled
- Tailwind CSS 4 with PostCSS for styling
- Next.js App Router with React Server Components by default
- Path alias `@/*` maps to `./src/*`
- Geist font family configured in root layout

### Integration Points
- `@supabase/supabase-js` 2.101.1 and `@supabase/ssr` 0.10.0 installed but not yet integrated
- `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
- Root layout (`src/app/layout.tsx`) is the wrapping point for auth providers
- No middleware exists yet — needs creation for route protection

</code_context>

<specifics>
## Specific Ideas

- App should feel like a community platform — open sign-up is key, not coach-gated
- Coach invite links are relationship-builders, similar to how WhatsApp group invite links work (Jaden's current workflow)
- Welcome + profile setup as the Phase 1 landing page since sessions aren't built yet

</specifics>

<deferred>
## Deferred Ideas

- Moderator/manager roles for community control (blacklist, ban, kick) — future phase, new capability
- OAuth / magic link login — explicitly out of scope per PROJECT.md
- Email notifications for invite/verification — in-app only for MVP

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-04-07*
