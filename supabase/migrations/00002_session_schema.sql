-- =============================================================================
-- 00002_session_schema.sql
-- Session management tables, RLS policies, capacity trigger, generation function
-- =============================================================================

-- 1. session_templates table
create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  coach_id uuid references public.community_members(id) not null,
  title text not null,
  venue text not null,
  capacity int not null check (capacity > 0),
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  duration_minutes int not null default 60,
  starts_on date not null,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
alter table public.session_templates enable row level security;

-- 2. sessions table
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  template_id uuid references public.session_templates(id),
  venue text not null,
  capacity int not null check (capacity > 0),
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  cancelled_at timestamptz,
  cancellation_reason text,
  court_number text,
  created_at timestamptz default now(),
  unique (template_id, scheduled_at)
);
alter table public.sessions enable row level security;

-- 3. session_rsvps table
create table public.session_rsvps (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  session_id uuid references public.sessions(id) on delete cascade not null,
  member_id uuid references public.community_members(id) on delete cascade not null,
  rsvp_type text not null check (rsvp_type in ('confirmed', 'waitlisted')),
  waitlist_position int,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  unique (session_id, member_id)
);
alter table public.session_rsvps enable row level security;

-- 4. session_coaches junction table
create table public.session_coaches (
  session_id uuid references public.sessions(id) on delete cascade not null,
  member_id uuid references public.community_members(id) on delete cascade not null,
  is_primary boolean not null default false,
  primary key (session_id, member_id)
);
alter table public.session_coaches enable row level security;

-- =============================================================================
-- Indexes (performance for RLS queries)
-- =============================================================================
create index idx_session_templates_coach_id on public.session_templates(coach_id);
create index idx_session_templates_community_id on public.session_templates(community_id);
create index idx_sessions_template_id on public.sessions(template_id);
create index idx_sessions_community_id on public.sessions(community_id);
create index idx_sessions_scheduled_at on public.sessions(scheduled_at);
create index idx_session_rsvps_session_id on public.session_rsvps(session_id);
create index idx_session_rsvps_member_id on public.session_rsvps(member_id);
create index idx_community_members_user_id on public.community_members(user_id);
create index idx_community_members_coach_id on public.community_members(coach_id);

-- =============================================================================
-- RLS Policies: session_templates
-- =============================================================================

-- SELECT: community-scoped visibility
-- Admin sees all templates in community
-- Coach sees their own templates
-- Client sees templates from their assigned coach
create policy "session_templates_select"
on public.session_templates for select to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and (
    ((select auth.jwt()) ->> 'user_role') = 'admin'
    or coach_id = (
      select id from public.community_members
      where user_id = (select auth.uid())
        and community_id = ((select auth.jwt()) ->> 'community_id')::uuid
      limit 1
    )
    or (
      ((select auth.jwt()) ->> 'user_role') = 'client'
      and coach_id in (
        select cm.coach_id
        from public.community_members cm
        where cm.user_id = (select auth.uid())
          and cm.community_id = ((select auth.jwt()) ->> 'community_id')::uuid
        limit 1
      )
    )
  )
);

-- INSERT: coach or admin in same community
create policy "session_templates_insert"
on public.session_templates for insert to authenticated
with check (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
);

-- UPDATE: coach who owns the template or admin
create policy "session_templates_update"
on public.session_templates for update to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and (
    ((select auth.jwt()) ->> 'user_role') = 'admin'
    or coach_id = (
      select id from public.community_members
      where user_id = (select auth.uid())
        and community_id = ((select auth.jwt()) ->> 'community_id')::uuid
      limit 1
    )
  )
);

-- DELETE: coach who owns the template or admin
create policy "session_templates_delete"
on public.session_templates for delete to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and (
    ((select auth.jwt()) ->> 'user_role') = 'admin'
    or coach_id = (
      select id from public.community_members
      where user_id = (select auth.uid())
        and community_id = ((select auth.jwt()) ->> 'community_id')::uuid
      limit 1
    )
  )
);

-- =============================================================================
-- RLS Policies: sessions (D-08 visibility scoping)
-- =============================================================================

-- SELECT: community-scoped with role-based visibility
-- Admin sees all sessions in community
-- Coach sees sessions from their templates OR sessions they are co-coaching
-- Client sees sessions where the template's coach_id matches their assigned coach
create policy "sessions_select"
on public.sessions for select to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and (
    ((select auth.jwt()) ->> 'user_role') = 'admin'
    or exists (
      select 1 from public.session_templates st
      where st.id = sessions.template_id
        and st.coach_id = (
          select id from public.community_members
          where user_id = (select auth.uid())
          limit 1
        )
    )
    or exists (
      select 1 from public.session_coaches sc
      where sc.session_id = sessions.id
        and sc.member_id = (
          select id from public.community_members
          where user_id = (select auth.uid())
          limit 1
        )
    )
    or (
      ((select auth.jwt()) ->> 'user_role') = 'client'
      and template_id in (
        select st.id from public.session_templates st
        join public.community_members cm on cm.id = st.coach_id
        join public.community_members client_cm on client_cm.coach_id = cm.id
        where client_cm.user_id = (select auth.uid())
      )
    )
  )
);

-- INSERT: coach or admin (session generation)
create policy "sessions_insert"
on public.sessions for insert to authenticated
with check (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
);

-- UPDATE: coach who owns template or co-coach or admin
create policy "sessions_update"
on public.sessions for update to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and (
    ((select auth.jwt()) ->> 'user_role') = 'admin'
    or exists (
      select 1 from public.session_templates st
      where st.id = sessions.template_id
        and st.coach_id = (
          select id from public.community_members
          where user_id = (select auth.uid())
          limit 1
        )
    )
    or exists (
      select 1 from public.session_coaches sc
      where sc.session_id = sessions.id
        and sc.member_id = (
          select id from public.community_members
          where user_id = (select auth.uid())
          limit 1
        )
    )
  )
);

-- DELETE: admin only
create policy "sessions_delete"
on public.sessions for delete to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and ((select auth.jwt()) ->> 'user_role') = 'admin'
);

-- =============================================================================
-- RLS Policies: session_rsvps
-- =============================================================================

-- SELECT: community-scoped (members see RSVPs for sessions they can see)
create policy "session_rsvps_select"
on public.session_rsvps for select to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
);

-- INSERT: authenticated member in community (client RSVPs for self)
create policy "session_rsvps_insert"
on public.session_rsvps for insert to authenticated
with check (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and member_id = (
    select id from public.community_members
    where user_id = (select auth.uid())
      and community_id = ((select auth.jwt()) ->> 'community_id')::uuid
    limit 1
  )
);

-- UPDATE: coach/admin in community (for promoting waitlist)
create policy "session_rsvps_update"
on public.session_rsvps for update to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
);

-- DELETE: member who owns the RSVP or coach/admin
create policy "session_rsvps_delete"
on public.session_rsvps for delete to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and (
    member_id = (
      select id from public.community_members
      where user_id = (select auth.uid())
        and community_id = ((select auth.jwt()) ->> 'community_id')::uuid
      limit 1
    )
    or ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
  )
);

-- =============================================================================
-- RLS Policies: session_coaches
-- =============================================================================

-- SELECT: community-scoped (anyone who can see the session)
create policy "session_coaches_select"
on public.session_coaches for select to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_coaches.session_id
      and s.community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  )
);

-- INSERT: coach who owns the template or admin
create policy "session_coaches_insert"
on public.session_coaches for insert to authenticated
with check (
  exists (
    select 1 from public.sessions s
    join public.session_templates st on st.id = s.template_id
    where s.id = session_coaches.session_id
      and s.community_id = ((select auth.jwt()) ->> 'community_id')::uuid
      and (
        ((select auth.jwt()) ->> 'user_role') = 'admin'
        or st.coach_id = (
          select id from public.community_members
          where user_id = (select auth.uid())
          limit 1
        )
      )
  )
);

-- UPDATE: coach who owns template or admin
create policy "session_coaches_update"
on public.session_coaches for update to authenticated
using (
  exists (
    select 1 from public.sessions s
    join public.session_templates st on st.id = s.template_id
    where s.id = session_coaches.session_id
      and s.community_id = ((select auth.jwt()) ->> 'community_id')::uuid
      and (
        ((select auth.jwt()) ->> 'user_role') = 'admin'
        or st.coach_id = (
          select id from public.community_members
          where user_id = (select auth.uid())
          limit 1
        )
      )
  )
);

-- DELETE: coach who owns template or admin
create policy "session_coaches_delete"
on public.session_coaches for delete to authenticated
using (
  exists (
    select 1 from public.sessions s
    join public.session_templates st on st.id = s.template_id
    where s.id = session_coaches.session_id
      and s.community_id = ((select auth.jwt()) ->> 'community_id')::uuid
      and (
        ((select auth.jwt()) ->> 'user_role') = 'admin'
        or st.coach_id = (
          select id from public.community_members
          where user_id = (select auth.uid())
          limit 1
        )
      )
  )
);

-- =============================================================================
-- Capacity enforcement trigger (SESS-06)
-- =============================================================================
create or replace function public.check_session_capacity()
returns trigger language plpgsql as $$
declare
  confirmed_count int;
  session_capacity int;
begin
  if NEW.rsvp_type = 'confirmed' then
    select count(*) into confirmed_count
    from public.session_rsvps
    where session_id = NEW.session_id
      and rsvp_type = 'confirmed'
      and cancelled_at is null;

    select capacity into session_capacity
    from public.sessions
    where id = NEW.session_id;

    if confirmed_count >= session_capacity then
      raise exception 'Session is at capacity';
    end if;
  end if;

  return NEW;
end;
$$;

create trigger enforce_session_capacity
before insert on public.session_rsvps
for each row execute function public.check_session_capacity();

-- =============================================================================
-- Session generation function (SESS-02)
-- =============================================================================
create or replace function public.generate_sessions_from_templates()
returns void language plpgsql as $$
declare
  tmpl record;
  occurrence_date date;
  occurrence_ts timestamptz;
  days_until int;
begin
  for tmpl in
    select * from public.session_templates
    where is_active = true
      and (ends_on is null or ends_on >= current_date)
  loop
    days_until := (tmpl.day_of_week - extract(dow from current_date)::int + 7) % 7;
    occurrence_date := current_date + days_until;

    while occurrence_date <= coalesce(tmpl.ends_on, current_date + interval '8 weeks') loop
      occurrence_ts := (occurrence_date || ' ' || tmpl.start_time)::timestamptz;

      insert into public.sessions (
        community_id, template_id, venue, capacity,
        scheduled_at, duration_minutes
      )
      values (
        tmpl.community_id, tmpl.id, tmpl.venue, tmpl.capacity,
        occurrence_ts, tmpl.duration_minutes
      )
      on conflict (template_id, scheduled_at) do nothing;

      occurrence_date := occurrence_date + 7;
    end loop;
  end loop;
end;
$$;

-- =============================================================================
-- pg_cron job (nightly session generation)
-- Wrapped in exception handler so migration succeeds even if pg_cron unavailable
-- =============================================================================
do $$ begin
  perform cron.schedule(
    'generate-upcoming-sessions',
    '0 2 * * *',
    $cron$ select public.generate_sessions_from_templates() $cron$
  );
exception when others then
  raise notice 'pg_cron not available: skipping schedule setup. Run manually or configure via Vercel Cron.';
end $$;
