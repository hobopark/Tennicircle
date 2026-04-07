-- =============================================================================
-- 00004_player_profiles.sql
-- Player profiles, coach assessments, progress notes + display_name column
-- =============================================================================

-- 1. Add display_name to community_members (Phase 2 code already queries this column)
alter table public.community_members
  add column if not exists display_name text;

-- 2. player_profiles table
create table public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  display_name text,
  phone text,
  bio text,
  avatar_url text,
  self_skill_level text check (self_skill_level in ('beginner', 'intermediate', 'advanced')),
  utr numeric(5,2),
  coaching_bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (community_id, user_id)
);

alter table public.player_profiles enable row level security;

create policy "player_profiles_select"
on public.player_profiles for select to authenticated
using (community_id = ((select auth.jwt()) ->> 'community_id')::uuid);

create policy "player_profiles_insert"
on public.player_profiles for insert to authenticated
with check (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and user_id = (select auth.uid())
);

create policy "player_profiles_update"
on public.player_profiles for update to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and user_id = (select auth.uid())
);

-- 3. coach_assessments table
create table public.coach_assessments (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  subject_member_id uuid references public.community_members(id) on delete cascade not null,
  coach_member_id uuid references public.community_members(id) on delete cascade not null,
  skill_level text not null check (skill_level in ('beginner', 'intermediate', 'advanced')),
  assessed_at timestamptz default now(),
  unique (community_id, subject_member_id, coach_member_id)
);

alter table public.coach_assessments enable row level security;

create policy "coach_assessments_select"
on public.coach_assessments for select to authenticated
using (community_id = ((select auth.jwt()) ->> 'community_id')::uuid);

create policy "coach_assessments_insert"
on public.coach_assessments for insert to authenticated
with check (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
);

create policy "coach_assessments_update"
on public.coach_assessments for update to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
);

-- 4. progress_notes table
create table public.progress_notes (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  session_id uuid references public.sessions(id) on delete cascade not null,
  subject_member_id uuid references public.community_members(id) on delete cascade not null,
  coach_member_id uuid references public.community_members(id) on delete cascade not null,
  note_text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (session_id, subject_member_id, coach_member_id)
);

alter table public.progress_notes enable row level security;

create policy "progress_notes_select"
on public.progress_notes for select to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and (
    ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
    or subject_member_id = (
      select id from public.community_members
      where user_id = (select auth.uid())
        and community_id = ((select auth.jwt()) ->> 'community_id')::uuid
      limit 1
    )
  )
);

create policy "progress_notes_insert"
on public.progress_notes for insert to authenticated
with check (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and ((select auth.jwt()) ->> 'user_role') in ('admin', 'coach')
);

create policy "progress_notes_update"
on public.progress_notes for update to authenticated
using (
  community_id = ((select auth.jwt()) ->> 'community_id')::uuid
  and coach_member_id = (
    select id from public.community_members
    where user_id = (select auth.uid())
    limit 1
  )
);

-- 5. Create avatars storage bucket (public)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 6. Storage RLS: authenticated users can upload to their own path
create policy "avatars_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = ((select auth.jwt()) ->> 'community_id')
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

create policy "avatars_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = ((select auth.jwt()) ->> 'community_id')
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

create policy "avatars_select"
on storage.objects for select to authenticated
using (bucket_id = 'avatars');
