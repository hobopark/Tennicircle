# External Integrations

**Analysis Date:** 2026-04-06

## APIs & External Services

**Supabase:**
- Supabase - Backend-as-a-Service for database, authentication, and real-time features
  - SDK/Client: @supabase/supabase-js 2.101.1
  - SSR Support: @supabase/ssr 0.10.0
  - Base URL: Environment variable `NEXT_PUBLIC_SUPABASE_URL` (https://REDACTED_PROJECT_REF.supabase.co)
  - Auth: Environment variable `NEXT_PUBLIC_SUPABASE_ANON_KEY` (JWT token for anonymous/public access)

## Data Storage

**Databases:**
- Supabase PostgreSQL (implied from Supabase integration)
  - Connection: Via @supabase/supabase-js client
  - Client: @supabase/supabase-js SDK
  - URL configured via `NEXT_PUBLIC_SUPABASE_URL`

**File Storage:**
- Supabase Storage (available but not explicitly used in current codebase)

**Caching:**
- Not configured

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: @supabase/supabase-js with SSR support via @supabase/ssr
  - Method: JWT-based authentication
  - Anon Key: Public key for row-level security (RLS) policies

## Monitoring & Observability

**Error Tracking:**
- Not detected

**Logs:**
- Not configured (only standard Next.js logging available)

## CI/CD & Deployment

**Hosting:**
- Deployment configuration suggests Vercel (boilerplate references Vercel templates and deploy links)
- Not explicitly configured

**CI Pipeline:**
- Not detected

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public API key (JWT token)

**Secrets location:**
- `.env.local` - Local development environment file (not committed)
- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to browser
- Sensitive secrets should use different env var names (without `NEXT_PUBLIC_` prefix) for server-only use

## Webhooks & Callbacks

**Incoming:**
- Not detected

**Outgoing:**
- Supabase webhooks can be configured in Supabase dashboard (not currently set up)

## Integration Status

**Active:**
- Supabase is integrated via SDK but not actively used in application code yet
- No Supabase client initialization code found in `src/app/` yet
- Environment variables are configured for Supabase connection

---

*Integration audit: 2026-04-06*
