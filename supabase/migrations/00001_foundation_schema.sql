-- 1. communities table
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);
alter table public.communities enable row level security;

-- 2. community_members table
create table public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('admin', 'coach', 'client')),
  coach_id uuid references public.community_members(id),
  joined_at timestamptz default now(),
  unique (community_id, user_id)
);
alter table public.community_members enable row level security;

-- 3. invite_links table
create table public.invite_links (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) not null,
  created_by uuid references public.community_members(id) not null,
  role text not null check (role in ('coach', 'client')),
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  revoked_at timestamptz,
  created_at timestamptz default now()
);
alter table public.invite_links enable row level security;

-- 4. RLS policies for communities
create policy "community_members_read_own_community"
on public.communities for select to authenticated
using (id = (auth.jwt() ->> 'community_id')::uuid);

-- 5. RLS policies for community_members
create policy "members_read_own_community"
on public.community_members for select to authenticated
using (community_id = (auth.jwt() ->> 'community_id')::uuid);

create policy "admins_manage_members"
on public.community_members for all to authenticated
using (
  community_id = (auth.jwt() ->> 'community_id')::uuid
  and (auth.jwt() ->> 'user_role') = 'admin'
);

-- 6. RLS policies for invite_links
create policy "members_read_own_community_invites"
on public.invite_links for select to authenticated
using (community_id = (auth.jwt() ->> 'community_id')::uuid);

create policy "coaches_admins_create_invites"
on public.invite_links for insert to authenticated
with check (
  community_id = (auth.jwt() ->> 'community_id')::uuid
  and (auth.jwt() ->> 'user_role') in ('admin', 'coach')
);

-- Public read for invite token lookup during sign-up (anon role)
create policy "public_read_active_invite_by_token"
on public.invite_links for select to anon
using (revoked_at is null);

-- 7. Custom Access Token Hook function
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
  select role, community_id
    into user_role, user_community_id
    from public.community_members
   where user_id = (event->>'user_id')::uuid
   limit 1;

  claims := event->'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    claims := jsonb_set(claims, '{community_id}', to_jsonb(user_community_id));
  else
    claims := jsonb_set(claims, '{user_role}', '"pending"');
    claims := jsonb_set(claims, '{community_id}', 'null');
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- 8. Grant permissions for auth hook
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on table public.community_members to supabase_auth_admin;

-- 9. Role-checking helper function
create or replace function public.get_user_role()
returns text as $$
  select auth.jwt() ->> 'user_role'
$$ language sql stable security definer set search_path = '';
