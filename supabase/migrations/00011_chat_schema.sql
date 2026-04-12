-- 00011_chat_schema.sql
-- Community chat: chatrooms, members, messages, read cursors

-- =============================================================================
-- TABLES
-- =============================================================================

create table public.chatrooms (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  name text not null,
  created_by uuid references public.community_members(id) on delete set null,
  created_at timestamptz default now()
);

create index idx_chatrooms_community on public.chatrooms(community_id);

create table public.chatroom_members (
  id uuid primary key default gen_random_uuid(),
  chatroom_id uuid references public.chatrooms(id) on delete cascade not null,
  member_id uuid references public.community_members(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique (chatroom_id, member_id)
);

create index idx_chatroom_members_chatroom on public.chatroom_members(chatroom_id);
create index idx_chatroom_members_member on public.chatroom_members(member_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chatroom_id uuid references public.chatrooms(id) on delete cascade not null,
  sender_id uuid references public.community_members(id) on delete set null,
  content text,
  image_url text,
  created_at timestamptz default now(),
  constraint chat_messages_has_content check (content is not null or image_url is not null)
);

create index idx_chat_messages_chatroom_created on public.chat_messages(chatroom_id, created_at desc);

create table public.chat_read_cursors (
  id uuid primary key default gen_random_uuid(),
  chatroom_id uuid references public.chatrooms(id) on delete cascade not null,
  member_id uuid references public.community_members(id) on delete cascade not null,
  last_read_at timestamptz not null default now(),
  unique (chatroom_id, member_id)
);

create index idx_chat_read_cursors_member on public.chat_read_cursors(member_id);

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.chatrooms enable row level security;
alter table public.chatroom_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_read_cursors enable row level security;

-- =============================================================================
-- HELPER FUNCTIONS (security definer to avoid RLS recursion)
-- =============================================================================

create or replace function public.is_chatroom_member(p_chatroom_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.chatroom_members
    where chatroom_id = p_chatroom_id
    and member_id in (
      select id from public.community_members where user_id = auth.uid()
    )
  )
$$;

create or replace function public.is_chatroom_manager(p_chatroom_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.chatrooms
    where id = p_chatroom_id
    and created_by in (
      select id from public.community_members where user_id = auth.uid()
    )
  )
$$;

-- chatrooms ------------------------------------------------------------------

create policy "Members see own chatrooms"
  on public.chatrooms for select to authenticated
  using (public.is_chatroom_member(id));

create policy "Community members create chatrooms"
  on public.chatrooms for insert to authenticated
  with check (
    community_id in (
      select community_id from public.community_members where user_id = auth.uid()
    )
  );

create policy "Manager can update chatroom"
  on public.chatrooms for update to authenticated
  using (public.is_chatroom_manager(id))
  with check (public.is_chatroom_manager(id));

-- chatroom_members -----------------------------------------------------------

create policy "Members see chatroom membership"
  on public.chatroom_members for select to authenticated
  using (public.is_chatroom_member(chatroom_id));

create policy "Manager or self adds chatroom members"
  on public.chatroom_members for insert to authenticated
  with check (
    public.is_chatroom_manager(chatroom_id)
    or member_id in (
      select id from public.community_members where user_id = auth.uid()
    )
  );

create policy "Manager removes chatroom members"
  on public.chatroom_members for delete to authenticated
  using (public.is_chatroom_manager(chatroom_id));

-- chat_messages --------------------------------------------------------------

create policy "Members read chatroom messages"
  on public.chat_messages for select to authenticated
  using (public.is_chatroom_member(chatroom_id));

create policy "Members send messages"
  on public.chat_messages for insert to authenticated
  with check (
    sender_id in (
      select id from public.community_members where user_id = auth.uid()
    )
    and public.is_chatroom_member(chatroom_id)
  );

-- chat_read_cursors ----------------------------------------------------------

create policy "Members manage own read cursors"
  on public.chat_read_cursors for all to authenticated
  using (
    member_id in (
      select id from public.community_members where user_id = auth.uid()
    )
  )
  with check (
    member_id in (
      select id from public.community_members where user_id = auth.uid()
    )
  );

-- =============================================================================
-- REALTIME
-- =============================================================================

alter publication supabase_realtime add table public.chat_messages;

-- =============================================================================
-- STORAGE: chat-media bucket
-- Create via Supabase Dashboard: bucket name "chat-media", public, 10MB limit
-- Then apply these policies:
-- =============================================================================

-- insert policy "Authenticated users upload chat media"
--   on storage.objects for insert to authenticated
--   with check (bucket_id = 'chat-media');

-- select policy "Public read chat media"
--   on storage.objects for select to public
--   using (bucket_id = 'chat-media');
