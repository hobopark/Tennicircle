-- =============================================================================
-- 00006_notifications_schema.sql
-- Notifications table + RLS + Realtime publication
-- =============================================================================

-- 1. notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  member_id uuid references public.community_members(id) on delete cascade not null,
  notification_type text not null check (
    notification_type in ('session_reminder', 'announcement', 'rsvp_confirmed', 'waitlist_promoted', 'event_updated', 'session_updated', 'session_cancelled', 'rsvp_cancelled')
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

alter table public.notifications enable row level security;

-- =============================================================================
-- Indexes
-- =============================================================================

-- Unique index for cron idempotency: skip if session reminder already sent
create unique index notifications_session_reminder_unique
  on public.notifications(member_id, notification_type, (metadata->>'session_id'))
  where notification_type = 'session_reminder';

-- Performance indexes
create index idx_notifications_member_created
  on public.notifications(member_id, created_at desc);

create index idx_notifications_community
  on public.notifications(community_id);

create index idx_notifications_unread
  on public.notifications(member_id) where read_at is null;

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- SELECT: members read own notifications only (T-05-01)
create policy "Members read own notifications"
  on public.notifications for select
  using (member_id = (
    select id from public.community_members
    where user_id = auth.uid() limit 1
  ));

-- UPDATE: members mark own notifications as read only (T-05-02)
create policy "Members mark own notifications read"
  on public.notifications for update
  using (member_id = (
    select id from public.community_members
    where user_id = auth.uid() limit 1
  ))
  with check (member_id = (
    select id from public.community_members
    where user_id = auth.uid() limit 1
  ));

-- INSERT: restricted to service_role only (T-05-03)
-- Authenticated users have NO insert permission — prevents horizontal privilege escalation.
-- All notification inserts happen via server actions or cron using the service_role client.
create policy "Service role can insert notifications"
  on public.notifications for insert
  to service_role
  with check (true);

-- =============================================================================
-- Realtime publication (CRITICAL for live feed updates in Plan 02)
-- =============================================================================
alter publication supabase_realtime add table public.notifications;
