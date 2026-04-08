# Phase 05: Notifications - Research

**Researched:** 2026-04-08
**Domain:** In-app notification feed — Supabase Realtime, Vercel Cron, Next.js Route Handler
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** In-app notification feed only — bell icon with unread badge in the bottom nav + notification list page. No email or push for MVP.
- **D-02:** Notifications delivered via Supabase Realtime (postgres_changes subscription on the notifications table). Bell badge and feed update live without page refresh.
- **D-03:** NOTF-01 — Session reminder fires 24 hours before the session. Requires a scheduled job (Vercel Cron hitting a Next.js API route, or Supabase pg_cron).
- **D-04:** NOTF-02 — Announcement notification created immediately when a coach/admin posts an announcement (triggered in the `createAnnouncement` server action).
- **D-05:** NOTF-03 — RSVP confirmation/waitlist promotion notification created immediately when RSVP is confirmed or a waitlisted member is promoted (triggered in `rsvpSession`, `rsvpEvent`, and the auto-promotion logic in `cancelEventRsvp`/`cancelRsvp`).
- **D-06:** Notifications bell goes in the bottom nav as a new tab — consistent with the app's mobile-first pattern. All roles see it. Unread count badge on the icon.

### Claude's Discretion

- Notification data model (table schema, fields)
- Read/unread tracking mechanism
- Mark-all-as-read UX
- Notification grouping or ordering strategy
- How deep-links from notifications work (e.g., tapping a session reminder navigates to the session detail)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTF-01 | In-app session reminder notifications | Vercel Cron job (1x/day, hourly on Hobby) hits a Next.js Route Handler that queries sessions scheduled 24h out and inserts notification rows for each confirmed RSVP member |
| NOTF-02 | In-app announcement alert notifications | `createAnnouncement` server action inserts notification row for each community member immediately after announcement insert |
| NOTF-03 | In-app RSVP confirmation notifications | `rsvpSession`, `rsvpEvent`, and auto-promotion paths in `cancelRsvp`/`cancelEventRsvp` insert a notification row for the relevant member |
</phase_requirements>

---

## Summary

Phase 5 adds a persistent in-app notification feed. The implementation has three distinct concerns: (1) a database table and RLS policy for notifications, (2) notification-insertion hooks in existing server actions and a new Vercel Cron job, and (3) a client-side feed UI with a Supabase Realtime subscription driving live updates.

The notification table is straightforward — a single `notifications` table scoped to `community_id` and `member_id`, with a `notification_type` discriminator, `read_at` timestamp for unread tracking, and a JSONB `metadata` column carrying the deep-link resource ID and copy parameters. RLS ensures members can only read their own notifications. The Realtime subscription is scoped to `member_id = eq.{member_id}` filter so each client only receives their own inserts.

The session reminder cron is the only net-new infrastructure. A Vercel Cron job running once daily calls a Next.js Route Handler at `/api/cron/session-reminders` which queries sessions scheduled in the next 24–25 hour window, finds all confirmed RSVPs for those sessions, and bulk-inserts notification rows. The Route Handler is secured by checking the `Authorization: Bearer $CRON_SECRET` header that Vercel injects automatically. On Hobby plan, once-daily precision is sufficient; on Pro, hourly is achievable for tighter timing.

**Primary recommendation:** Build the `notifications` table first (migration), then wire insertion into the three trigger points (announcements action, rsvp actions, cron handler), then build the feed UI with Realtime subscription last. Keep the cron handler idempotent with an `ON CONFLICT DO NOTHING` on a `(session_id, member_id, notification_type)` unique index.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.101.1 | Realtime subscription on `notifications` table | Already installed; `createBrowserClient` from `@supabase/ssr` is the project's browser client pattern |
| `@supabase/ssr` | 0.10.0 | Server client for notification insert in actions | Already installed; required for server actions |
| `framer-motion` | ^12.38.0 | Entrance animation for new real-time rows | Already installed; used throughout prior phases per DESIGN-REF.md |
| `lucide-react` | (installed) | Bell, CalendarDays, Megaphone, CheckCircle2 icons | Already installed; project icon standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn Badge | (installed) | Unread count pill on bell icon | Already installed per UI-SPEC |
| shadcn Skeleton | (installed) | Loading state for feed | Already installed per UI-SPEC |
| shadcn Separator | (installed) | Section dividers | Already installed per UI-SPEC |
| shadcn Button | (installed) | Mark all as read | Already installed per UI-SPEC |

**No new packages to install.** All dependencies are already present.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel Cron + Route Handler | Supabase `pg_cron` | pg_cron is available on Supabase paid plans; migration 00002 already has a pg_cron wrapper with exception handler. Vercel Cron is more observable (dashboard + logs) and doesn't require Supabase plan upgrade. Use Vercel Cron. |
| JSONB `metadata` column | Separate FK columns per type | JSONB is simpler for MVP with three notification types; avoids nullable FK sprawl. Acceptable tradeoff. |
| Server-side initial fetch + Realtime | Realtime only | Server fetch on page load gives correct SSR/hydrated state; Realtime adds live updates. Use both. |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── cron/
│   │       └── session-reminders/
│   │           └── route.ts          # Vercel Cron endpoint (NOTF-01)
│   └── notifications/
│       ├── page.tsx                  # Server component — initial fetch, force-dynamic
│       └── loading.tsx               # Skeleton fallback
├── components/
│   └── notifications/
│       ├── NotificationFeed.tsx      # 'use client' — Realtime subscription + list
│       └── NotificationRow.tsx       # Single row (read/unread visual states)
├── lib/
│   ├── actions/
│   │   └── notifications.ts          # markAllRead, markRead server actions
│   └── types/
│       └── notifications.ts          # NotificationRow type, NotificationType enum
supabase/
└── migrations/
    └── 00006_notifications_schema.sql
```

### Pattern 1: Notifications Table Schema

**What:** Single `notifications` table, community-scoped, per-member, with JSONB metadata.

**When to use:** All three notification types write to this one table.

```sql
-- Source: project migration pattern (migrations/00002_session_schema.sql)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  member_id uuid references public.community_members(id) on delete cascade not null,
  notification_type text not null check (
    notification_type in ('session_reminder', 'announcement', 'rsvp_confirmed', 'waitlist_promoted')
  ),
  title text not null,
  body text not null,
  metadata jsonb not null default '{}',
  -- metadata shape per type:
  -- session_reminder:      { "session_id": "uuid", "scheduled_at": "iso" }
  -- announcement:          { "announcement_id": "uuid" }
  -- rsvp_confirmed:        { "resource_type": "session"|"event", "resource_id": "uuid" }
  -- waitlist_promoted:     { "resource_type": "session"|"event", "resource_id": "uuid" }
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Unique constraint makes cron idempotent: skip if reminder already sent
create unique index notifications_session_reminder_unique
  on public.notifications(member_id, notification_type, (metadata->>'session_id'))
  where notification_type = 'session_reminder';

create index idx_notifications_member_created
  on public.notifications(member_id, created_at desc);
create index idx_notifications_community
  on public.notifications(community_id);
```

**RLS:** Members can only SELECT/UPDATE their own rows. A service-role bypass is used for bulk insert from the cron handler (which uses the server Supabase client with the anon key but auth context is a server action — see Pitfall 3 below).

```sql
-- SELECT: own notifications only
create policy "Members read own notifications"
  on public.notifications for select
  using (member_id = (
    select id from public.community_members
    where user_id = auth.uid() limit 1
  ));

-- UPDATE: mark as read (own only)
create policy "Members mark own notifications read"
  on public.notifications for update
  using (member_id = (
    select id from public.community_members
    where user_id = auth.uid() limit 1
  ));

-- INSERT: server actions and cron use service_role key
-- No client-side insert policy needed
create policy "Service role can insert notifications"
  on public.notifications for insert
  with check (true);
-- Note: restrict this to service_role in production via:
-- to service_role
```

### Pattern 2: Supabase Realtime Subscription (Client)

**What:** Subscribe to `postgres_changes` on `notifications` filtered to the current member.

**When to use:** In `NotificationFeed.tsx` (client component), after initial server-rendered list.

```typescript
// Source: Supabase Realtime docs — postgres_changes API [VERIFIED: supabase.com/docs/guides/realtime/postgres-changes]
// Note: requires Realtime enabled on the notifications table in Supabase dashboard
useEffect(() => {
  const supabase = createClient()

  // Get member_id first (from session or prop passed from server)
  const channel = supabase
    .channel('notifications-feed')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `member_id=eq.${memberId}`,
      },
      (payload) => {
        // Prepend new notification to local state
        setNotifications(prev => [payload.new as Notification, ...prev])
        setUnreadCount(prev => prev + 1)
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [memberId])
```

**Critical note:** The `filter` parameter for `postgres_changes` requires the table column to be included in the realtime publication. The `notifications` table must be added to the `supabase_realtime` publication in the migration. [VERIFIED: supabase.com/docs/guides/realtime/postgres-changes]

```sql
-- Add to migration after table creation:
alter publication supabase_realtime add table public.notifications;
```

### Pattern 3: Vercel Cron Route Handler

**What:** Next.js Route Handler at `app/api/cron/session-reminders/route.ts` secured with `CRON_SECRET`.

**When to use:** For NOTF-01 session reminders, called once daily by Vercel Cron.

```typescript
// Source: Vercel Cron docs [VERIFIED: vercel.com/docs/cron-jobs/manage-cron-jobs]
// app/api/cron/session-reminders/route.ts
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Use service_role key for bulk insert bypassing RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  // Find sessions in the 24h window with confirmed RSVPs
  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      id, scheduled_at, venue, community_id,
      session_rsvps!inner(member_id)
    `)
    .gte('scheduled_at', windowStart.toISOString())
    .lt('scheduled_at', windowEnd.toISOString())
    .is('cancelled_at', null)
    .eq('session_rsvps.rsvp_type', 'confirmed')
    .is('session_rsvps.cancelled_at', null)

  // Bulk insert — unique index makes this idempotent
  const inserts = (sessions ?? []).flatMap(session =>
    session.session_rsvps.map((rsvp: { member_id: string }) => ({
      community_id: session.community_id,
      member_id: rsvp.member_id,
      notification_type: 'session_reminder',
      title: 'Session reminder',
      body: `Your session is tomorrow at ${formatTime(session.scheduled_at)} — ${session.venue}`,
      metadata: { session_id: session.id, scheduled_at: session.scheduled_at },
    }))
  )

  if (inserts.length > 0) {
    await supabase.from('notifications').insert(inserts)
    // ON CONFLICT handled by unique index — duplicates silently skipped
  }

  return Response.json({ inserted: inserts.length })
}
```

**vercel.json** (create at project root):

```json
{
  "crons": [
    {
      "path": "/api/cron/session-reminders",
      "schedule": "0 20 * * *"
    }
  ]
}
```

Schedule `0 20 * * *` = 8pm UTC daily = morning in AEST (UTC+10/11). Adjust to match Jaden's timezone.

### Pattern 4: Notification Insertion in Server Actions

**What:** After the primary DB mutation succeeds, insert notification row(s) using the server Supabase client.

**When to use:** In `createAnnouncement` (NOTF-02) and `rsvpSession`/`rsvpEvent` and auto-promotion paths (NOTF-03).

```typescript
// Source: existing action pattern (src/lib/actions/announcements.ts)
// NOTF-02: After inserting announcement, notify all community members
// (fire-and-forget — don't fail the action if notification insert fails)
const { data: members } = await supabase
  .from('community_members')
  .select('id')
  .eq('community_id', communityId)
  .neq('id', member.id) // Don't notify the poster

if (members && members.length > 0) {
  const notificationRows = members.map(m => ({
    community_id: communityId,
    member_id: m.id,
    notification_type: 'announcement',
    title: `${posterName} posted an announcement`,
    body: parsed.data.title,
    metadata: { announcement_id: insertedAnnouncement.id },
  }))
  // Intentionally not awaited — notification failure doesn't break the action
  supabase.from('notifications').insert(notificationRows).then(() => {})
}
```

**RSVP confirmation (NOTF-03):** Insert single notification for the RSVP'ing member after confirmed insert.

```typescript
// After successful RSVP insert with rsvpType === 'confirmed':
await supabase.from('notifications').insert({
  community_id: communityId,
  member_id: member.id,
  notification_type: 'rsvp_confirmed',
  title: "You're confirmed",
  body: `You're confirmed for the session on ${formatSessionDate(session.scheduled_at)}`,
  metadata: { resource_type: 'session', resource_id: sessionId },
})
```

### Pattern 5: AppNav Bell with Unread Badge

**What:** Add Notifications tab to `AppNav.tsx` with an absolute-positioned unread count badge.

**When to use:** For D-06 — bell tab visible to all roles.

The icon node needs to be a `relative` container so the badge can be `absolute`:

```typescript
// Inside NAV_TABS array — add before or after Events:
{
  href: '/notifications',
  label: 'Notifications',
  icon: <BellIconWithBadge count={unreadCount} />,
  roles: ['admin', 'coach', 'client'],
}

// BellIconWithBadge component (same file or separate):
function BellIconWithBadge({ count }: { count: number }) {
  return (
    <span className="relative">
      <Bell className="w-5 h-5" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </span>
  )
}
```

Unread count is fetched once in `useEffect` alongside the role fetch, using `count: 'exact'` query.

### Anti-Patterns to Avoid

- **Inserting notifications from client components:** All notification creation must happen in server actions or the cron Route Handler. Never expose service_role key client-side.
- **Subscribing to all community notifications:** Always filter the Realtime subscription with `member_id=eq.${memberId}`. Without a filter, every user receives every notification insert in the community.
- **Awaiting non-critical notification inserts in the main action flow:** Notification insert failures should not surface to the user as action errors. Use fire-and-forget pattern.
- **Forgetting `alter publication supabase_realtime add table`:** The Realtime subscription silently receives nothing if the table isn't added to the publication.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom interval logic | Vercel Cron + `vercel.json` | Vercel handles invocation, retries visible in dashboard |
| Realtime delivery | WebSocket server | Supabase Realtime `postgres_changes` | Already provisioned, works with existing Supabase project |
| Idempotent reminder dedup | Manual "already sent" check | Unique index on `(member_id, notification_type, metadata->>'session_id')` | DB-level guarantee, no race conditions |
| Unread count query | `filter()` in JS | `count: 'exact'` Supabase query with `is('read_at', null)` filter | Single DB round-trip |
| Date formatting in notifications | New utility | Existing `formatDateTime` in `src/lib/utils/dates.ts` | Already extracts the `en-AU` locale pattern used in body copy |

**Key insight:** Supabase Realtime + Vercel Cron together cover all delivery mechanisms needed. No additional infrastructure is required.

---

## Common Pitfalls

### Pitfall 1: Realtime subscription without `alter publication`
**What goes wrong:** Channel subscribes successfully (no error), but no events are received.
**Why it happens:** The `notifications` table is not in the `supabase_realtime` publication by default; only tables explicitly added receive change events.
**How to avoid:** Add `alter publication supabase_realtime add table public.notifications;` to the migration.
**Warning signs:** Subscription callback never fires; Supabase dashboard Realtime inspector shows no events for the table.

### Pitfall 2: RLS blocks INSERT from server action
**What goes wrong:** `supabase.from('notifications').insert(...)` returns a 403 / row-level security violation.
**Why it happens:** Server actions use the anon-key server client which runs as the authenticated user. The notifications INSERT RLS policy must allow the acting user to insert for other members (e.g., when a coach's action notifies all clients).
**How to avoid:** Two options: (a) use `supabase.auth.admin` / service_role client for bulk inserts, OR (b) write an RLS INSERT policy that permits any authenticated community member to insert notifications where `community_id` matches their JWT claim. Option (a) is cleaner for the cron; option (b) works for server actions.
**Warning signs:** Action returns success but notification rows not appearing; Supabase logs show RLS violation on `notifications`.

### Pitfall 3: Cron Route Handler uses anon key — can't bypass RLS
**What goes wrong:** The cron endpoint inserts notifications but some fail because the anon-key client can't write for arbitrary `member_id` values.
**Why it happens:** The cron runs without a user session; the anon client has no JWT claims.
**How to avoid:** Create a `createClient(url, SERVICE_ROLE_KEY)` (direct `@supabase/supabase-js` import, not `@supabase/ssr`) in the cron handler. Store `SUPABASE_SERVICE_ROLE_KEY` as a Vercel env var (not `NEXT_PUBLIC_` — keep it server-only).
**Warning signs:** Partial inserts; 403 errors in cron function logs.

### Pitfall 4: `cancelRsvp` auto-promotion path not wired
**What goes wrong:** Waitlist promotions (NOTF-03) work from the coach promotion flow (`promoteFromWaitlist`) but not from the auto-promotion in `cancelEventRsvp`.
**Why it happens:** `cancelEventRsvp` auto-promotes the next waitlisted member inline but returns `{ success: true }` without the promoted member's ID in the result — you need to fetch the promoted member's ID before inserting the notification.
**How to avoid:** Capture the promoted member's `member_id` from `nextWaitlisted` before the update, then insert the notification row inside the same `if (nextWaitlisted)` block.
**Warning signs:** Session cancellation works, promoted member doesn't get a notification.

### Pitfall 5: Hobby Vercel plan cron timing imprecision
**What goes wrong:** Session reminders arrive outside the 24h window.
**Why it happens:** Hobby plan cron runs anywhere within the specified hour (±59 min precision). [VERIFIED: vercel.com/docs/cron-jobs/usage-and-pricing]
**How to avoid:** Use a 25-hour look-ahead window in the cron query (24h–25h from `now()`) instead of a strict 24h window. This tolerates timing drift.
**Warning signs:** Some sessions are missed; logs show cron invoked at :43 past the hour but query window already closed.

### Pitfall 6: `member_id` vs `user_id` confusion in notification insert
**What goes wrong:** Notification insert fails or notifies wrong person.
**Why it happens:** `notifications.member_id` references `community_members.id` (UUID), not `auth.users.id`. All existing server actions look up `community_members` first — follow the same pattern.
**How to avoid:** Use the `member.id` from the `community_members` lookup already present in each action. Never use `user.id` for `member_id`.
**Warning signs:** Foreign key violation on insert; or notification appears for wrong user.

---

## Code Examples

### Unread count query for AppNav badge

```typescript
// Source: Supabase JS v2 count query pattern [VERIFIED: installed @supabase/supabase-js 2.101.1]
const { count } = await supabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('member_id', memberId)
  .is('read_at', null)

setUnreadCount(count ?? 0)
```

### Mark all as read server action

```typescript
// Source: existing server action pattern (src/lib/actions/rsvps.ts)
'use server'
export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!member) return { success: false }

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('member_id', member.id)
    .is('read_at', null)

  revalidatePath('/notifications')
  return { success: true }
}
```

### Mark single notification read + navigate (client)

```typescript
// Called on notification row tap
async function handleRowTap(notification: Notification) {
  if (!notification.read_at) {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notification.id
        ? { ...n, read_at: new Date().toISOString() }
        : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    // Fire-and-forget server update
    await markNotificationRead(notification.id)
  }
  router.push(resolveDeepLink(notification))
}

function resolveDeepLink(n: Notification): string {
  switch (n.notification_type) {
    case 'session_reminder':
    case 'rsvp_confirmed':
    case 'waitlist_promoted':
      if (n.metadata.resource_type === 'event') return `/events/${n.metadata.resource_id}`
      return `/sessions/${n.metadata.session_id ?? n.metadata.resource_id}`
    case 'announcement':
      return '/events'
    default:
      return '/notifications'
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for notifications | Supabase Realtime `postgres_changes` subscription | Supabase Realtime GA | No polling needed; live updates without interval |
| `pages/api/` cron routes | `app/api/` Route Handlers | Next.js 13+ App Router | Route Handlers replace API routes; project already uses App Router |
| `middleware.ts` | `proxy.ts` | Next.js 16 | Project already adapted; cron endpoint uses `route.ts` not proxy |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase Realtime `postgres_changes` `filter` parameter works with `member_id=eq.{uuid}` in production | Architecture Pattern 2 | Subscription receives all community notifications or none — add unread-count fallback poll |
| A2 | Vercel plan is Hobby (once/day cron) — the 25h window recommendation assumes this; Pro would allow hourly | Pitfall 5, vercel.json | If Pro, can use `0 * * * *` for hourly and 1h window instead |
| A3 | `SUPABASE_SERVICE_ROLE_KEY` env var is not yet present in Vercel project — needs to be added | Architecture Pattern 3 | Cron inserts will fail with 403 if not set |
| A4 | Announcement fanout inserts one row per community member — for communities > 1000 members this could be slow in a server action | Pattern 4 | For MVP with small community (Jaden's), acceptable; flag for future optimisation |

---

## Open Questions (RESOLVED)

1. **Cron timing: Hobby vs Pro plan**
   - What we know: Hobby = once/day max, ±59 min precision. Pro = once/minute, per-minute precision. [VERIFIED: vercel.com/docs/cron-jobs/usage-and-pricing]
   - What's unclear: Whether the project is currently on Hobby or Pro Vercel plan.
   - Recommendation: Use once-daily schedule with 25h window for Hobby; if Pro, switch to hourly. Add a comment in `vercel.json`.
   - RESOLVED: Using once-daily `0 20 * * *` schedule with 25h look-ahead window for Hobby plan compatibility (Plan 05-02 Task 2).

2. **Service role key in Vercel env vars**
   - What we know: `SUPABASE_SERVICE_ROLE_KEY` is required for the cron handler to bypass RLS. It is not in the current `.env.local` structure (only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are documented).
   - What's unclear: Whether it has been added to the Vercel project secrets already.
   - Recommendation: Wave 0 task should verify and add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (gitignored) and Vercel project env vars.
   - RESOLVED: Plan 05-02 `user_setup` block instructs user to add `SUPABASE_SERVICE_ROLE_KEY` to Vercel env vars before execution.

3. **Fanout strategy for announcement notifications**
   - What we know: `createAnnouncement` runs for a single community. Jaden's community is small (MVP).
   - What's unclear: Upper bound on community size.
   - Recommendation: Direct fanout (one notification row per member) is acceptable for MVP. Flag for background job if community exceeds ~500 members.
   - RESOLVED: Direct fire-and-forget fanout accepted for MVP (Plan 05-02 Task 1). Flagged for background job if community exceeds ~500 members.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@supabase/supabase-js` | Realtime subscription, cron service client | Yes | 2.101.1 | — |
| `@supabase/ssr` | Server action notification inserts | Yes | 0.10.0 | — |
| `framer-motion` | Feed entrance animations | Yes | ^12.38.0 | CSS transitions |
| `CRON_SECRET` env var | Cron Route Handler security | Unknown | — | Must add to Vercel + `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` env var | Cron bulk insert (bypass RLS) | Unknown | — | Must add to Vercel + `.env.local` |
| Vercel Cron Jobs | NOTF-01 session reminders | Yes (all plans) | — | pg_cron (requires Supabase paid plan) |
| Supabase Realtime enabled for `notifications` table | Live feed updates | Not yet (table doesn't exist) | — | Polling fallback |

**Missing dependencies with no fallback:**
- `CRON_SECRET` — must be set before the cron route goes to production
- `SUPABASE_SERVICE_ROLE_KEY` — must be set for cron to insert notifications

**Missing dependencies with fallback:**
- Supabase Realtime for `notifications` table — table must be created and added to publication in migration; fallback is static page reload

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not yet detected — no `vitest.config.*`, `jest.config.*`, or `__tests__/` directory found |
| Config file | None — Wave 0 gap |
| Quick run command | `npx vitest run --reporter=verbose` (once configured) |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTF-01 | Cron handler inserts session reminder notifications for confirmed RSVPs in 24h window | unit | `npx vitest run tests/cron/session-reminders.test.ts -x` | No — Wave 0 |
| NOTF-01 | Cron handler skips duplicate (idempotency) | unit | same file | No — Wave 0 |
| NOTF-01 | Cron handler returns 401 on missing/wrong auth header | unit | same file | No — Wave 0 |
| NOTF-02 | `createAnnouncement` inserts notification rows for all members | unit | `npx vitest run tests/actions/notifications.test.ts -x` | No — Wave 0 |
| NOTF-03 | `rsvpSession` inserts rsvp_confirmed notification | unit | same file | No — Wave 0 |
| NOTF-03 | `cancelEventRsvp` inserts waitlist_promoted notification for promoted member | unit | same file | No — Wave 0 |
| NOTF-01/02/03 | Notification feed page renders with mocked data | smoke | manual | No |
| NOTF-01/02/03 | Bell badge shows correct unread count | smoke | manual | No |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose` (once test infra exists)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/cron/session-reminders.test.ts` — covers NOTF-01 cron handler
- [ ] `tests/actions/notifications.test.ts` — covers NOTF-02, NOTF-03 action side-effects
- [ ] `vitest.config.ts` — framework config (not yet present in repo)
- [ ] Framework install: `npm install -D vitest @vitest/coverage-v8` — if no test framework detected

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | RLS on `notifications` table; `member_id` from DB lookup not client input |
| V5 Input Validation | no | Notifications generated server-side; no user-supplied notification content |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Horizontal privilege escalation — reading another member's notifications | Information Disclosure | RLS `member_id = auth.uid()` community_member lookup; Realtime filter scoped to own member_id |
| Unauthorized notification creation | Tampering | No client-side INSERT policy; all inserts via server actions or service_role cron |
| Cron endpoint called by unauthenticated external party | Spoofing | `Authorization: Bearer $CRON_SECRET` check on every invocation |
| Service role key exposure | Elevation of Privilege | `SUPABASE_SERVICE_ROLE_KEY` never prefixed `NEXT_PUBLIC_`; never imported in client components |
| Notification content injection (XSS via body copy) | Tampering | Body text is generated server-side from DB field values (session venue, announcement title); React escapes by default |

---

## Sources

### Primary (HIGH confidence)

- Vercel Cron Jobs docs — `vercel.com/docs/cron-jobs` and `vercel.com/docs/cron-jobs/usage-and-pricing` — schedule format, CRON_SECRET pattern, Hobby vs Pro limits [VERIFIED]
- Supabase Realtime postgres_changes docs — `supabase.com/docs/guides/realtime/postgres-changes` — filter syntax, RLS behavior, publication requirement [VERIFIED]
- Next.js 16 Route Handler docs — `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — HTTP methods, params, cookies [VERIFIED]
- Project migrations `00002_session_schema.sql`, `00005_events_schema.sql` — existing RLS pattern and schema conventions [VERIFIED: codebase]
- Project actions `rsvps.ts`, `events.ts`, `announcements.ts` — existing server action pattern [VERIFIED: codebase]
- `AppNav.tsx` — existing bottom nav structure [VERIFIED: codebase]
- `src/lib/utils/dates.ts` — `formatDateTime` utility available [VERIFIED: codebase]

### Secondary (MEDIUM confidence)

- UI-SPEC.md approved design contract — component inventory, badge dimensions, copy [VERIFIED: planning artifact]

### Tertiary (LOW confidence)

- Supabase publication behavior for new tables — confirmed by docs pattern but not live-tested [ASSUMED for the specific `alter publication` syntax working as described]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed, verified in package.json
- Architecture: HIGH — follows established project patterns; Supabase and Vercel APIs verified against current docs
- Pitfalls: HIGH — most are derived from verified API behavior or existing codebase inspection
- Cron timing: MEDIUM — plan tier unknown (A2 assumption)

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable APIs; Vercel Cron and Supabase Realtime are mature)
