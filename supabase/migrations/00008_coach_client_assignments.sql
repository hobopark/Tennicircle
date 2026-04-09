-- Phase 7 D-10: Multi-coach client assignments junction table
-- Replaces single community_members.coach_id FK for multi-coach support

create table public.coach_client_assignments (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  coach_member_id uuid references public.community_members(id) on delete cascade not null,
  client_member_id uuid references public.community_members(id) on delete cascade not null,
  assigned_at timestamptz default now(),
  unique (coach_member_id, client_member_id)
);

alter table public.coach_client_assignments enable row level security;

-- All authenticated community members can read assignments in their community
create policy "assignments_read_own_community"
on public.coach_client_assignments for select to authenticated
using (community_id = (auth.jwt() ->> 'community_id')::uuid);

-- Coaches can insert assignments where they are the coach
create policy "coaches_create_own_assignments"
on public.coach_client_assignments for insert to authenticated
with check (
  community_id = (auth.jwt() ->> 'community_id')::uuid
  and (
    (auth.jwt() ->> 'user_role') = 'admin'
    or (
      (auth.jwt() ->> 'user_role') = 'coach'
      and coach_member_id = (
        select id from public.community_members
        where user_id = auth.uid()
        and community_id = (auth.jwt() ->> 'community_id')::uuid
        limit 1
      )
    )
  )
);

-- Users can insert their own assignment as client (for invite sign-up flow)
create policy "users_insert_own_assignment"
on public.coach_client_assignments for insert to authenticated
with check (
  client_member_id = (
    select id from public.community_members
    where user_id = auth.uid()
    and community_id = coach_client_assignments.community_id
    limit 1
  )
);

-- Coaches can delete their own assignments; admins can delete any in community
create policy "coaches_delete_own_assignments"
on public.coach_client_assignments for delete to authenticated
using (
  community_id = (auth.jwt() ->> 'community_id')::uuid
  and (
    (auth.jwt() ->> 'user_role') = 'admin'
    or (
      (auth.jwt() ->> 'user_role') = 'coach'
      and coach_member_id = (
        select id from public.community_members
        where user_id = auth.uid()
        and community_id = (auth.jwt() ->> 'community_id')::uuid
        limit 1
      )
    )
  )
);

-- Allow users to insert their own community_members row (for open sign-up flow MGMT-04)
create policy "users_insert_own_membership"
on public.community_members for insert to authenticated
with check (user_id = auth.uid());

-- Note: community_members.coach_id column is NOT dropped.
-- It is deprecated — new code reads from coach_client_assignments.
-- Column will be dropped in a future migration after confirming no reads.
comment on column public.community_members.coach_id is 'DEPRECATED: Use coach_client_assignments table instead. Kept for backward compatibility.';
