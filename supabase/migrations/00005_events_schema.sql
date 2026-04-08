-- =============================================================================
-- 00005_events_schema.sql
-- Events, event RSVPs, announcements tables + RLS + event-draws storage bucket
-- =============================================================================

-- 1. events table
create table public.events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  created_by uuid references public.community_members(id) not null,
  event_type text not null check (event_type in ('tournament', 'social', 'open_session')),
  title text not null,
  description text,
  venue text not null,
  starts_at timestamptz not null,
  duration_minutes int,
  capacity int check (capacity > 0),
  is_official boolean not null default false,
  draw_image_url text,
  cancelled_at timestamptz,
  created_at timestamptz default now()
);

alter table public.events enable row level security;

-- 2. event_rsvps table
create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  event_id uuid references public.events(id) on delete cascade not null,
  member_id uuid references public.community_members(id) on delete cascade not null,
  rsvp_type text not null default 'confirmed' check (rsvp_type in ('confirmed', 'waitlisted')),
  waitlist_position int,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  unique (event_id, member_id)
);

alter table public.event_rsvps enable row level security;

-- 3. announcements table
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  created_by uuid references public.community_members(id) not null,
  title text not null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.announcements enable row level security;

-- =============================================================================
-- Indexes (performance for RLS queries)
-- =============================================================================
create index idx_events_community_starts on public.events(community_id, starts_at);
create index idx_event_rsvps_event on public.event_rsvps(event_id);
create index idx_event_rsvps_member on public.event_rsvps(member_id);
create index idx_announcements_community on public.announcements(community_id, created_at desc);

-- =============================================================================
-- RLS Policies: events
-- =============================================================================

-- SELECT: all community members
create policy "Members can view events in their community"
  on public.events for select
  using (community_id = ((select auth.jwt()) ->> 'community_id')::uuid);

-- INSERT: any community member, but is_official restricted to coach/admin (T-04-01, T-04-02)
create policy "Members can create events in their community"
  on public.events for insert
  with check (
    community_id = ((select auth.jwt()) ->> 'community_id')::uuid
    and (
      is_official = false
      or ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
    )
  );

-- UPDATE: creator or admin only
create policy "Creator or admin can update events"
  on public.events for update
  using (
    community_id = ((select auth.jwt()) ->> 'community_id')::uuid
    and (
      created_by = (select id from public.community_members where user_id = auth.uid() limit 1)
      or ((select auth.jwt()) ->> 'user_role') = 'admin'
    )
  );

-- DELETE: creator or admin only
create policy "Creator or admin can delete events"
  on public.events for delete
  using (
    community_id = ((select auth.jwt()) ->> 'community_id')::uuid
    and (
      created_by = (select id from public.community_members where user_id = auth.uid() limit 1)
      or ((select auth.jwt()) ->> 'user_role') = 'admin'
    )
  );

-- =============================================================================
-- RLS Policies: event_rsvps
-- =============================================================================

-- SELECT: community members (T-04-04)
create policy "Members can view event RSVPs in their community"
  on public.event_rsvps for select
  using (community_id = ((select auth.jwt()) ->> 'community_id')::uuid);

-- INSERT: member can only RSVP as themselves (T-04-05)
create policy "Members can RSVP to events"
  on public.event_rsvps for insert
  with check (
    community_id = ((select auth.jwt()) ->> 'community_id')::uuid
    and member_id = (select id from public.community_members where user_id = auth.uid() limit 1)
  );

-- UPDATE: own RSVP only (for cancellation)
create policy "Members can update own RSVP"
  on public.event_rsvps for update
  using (
    community_id = ((select auth.jwt()) ->> 'community_id')::uuid
    and member_id = (select id from public.community_members where user_id = auth.uid() limit 1)
  );

-- =============================================================================
-- RLS Policies: announcements
-- =============================================================================

-- SELECT: community members
create policy "Members can view announcements in their community"
  on public.announcements for select
  using (community_id = ((select auth.jwt()) ->> 'community_id')::uuid);

-- INSERT: coach/admin only (T-04-03, D-09, EVNT-05)
create policy "Coaches and admins can post announcements"
  on public.announcements for insert
  with check (
    community_id = ((select auth.jwt()) ->> 'community_id')::uuid
    and ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
  );

-- UPDATE: creator or admin
create policy "Creator or admin can update announcements"
  on public.announcements for update
  using (
    community_id = ((select auth.jwt()) ->> 'community_id')::uuid
    and (
      created_by = (select id from public.community_members where user_id = auth.uid() limit 1)
      or ((select auth.jwt()) ->> 'user_role') = 'admin'
    )
  );

-- =============================================================================
-- Storage bucket for tournament draw images
-- =============================================================================
insert into storage.buckets (id, name, public) values ('event-draws', 'event-draws', true);

create policy "Members can upload event draw images"
  on storage.objects for insert
  with check (bucket_id = 'event-draws');

create policy "Anyone can view event draw images"
  on storage.objects for select
  using (bucket_id = 'event-draws');

create policy "Members can update event draw images"
  on storage.objects for update
  using (bucket_id = 'event-draws');
