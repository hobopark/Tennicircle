-- Migration: Atomic RSVP RPC function
-- Replaces multi-round-trip RSVP logic with a single transaction using FOR UPDATE row lock
-- to prevent double-booking under concurrent access (D-05, D-06)

create or replace function public.atomic_rsvp(
  p_session_id uuid,
  p_member_id  uuid,
  p_community_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity      int;
  v_template_id   uuid;
  v_confirmed     int;
  v_waitlisted    int;
  v_rsvp_type     text;
  v_position      int;
  v_existing_id   uuid;
  v_invitation_id uuid;
begin
  -- Lock the session row to serialize concurrent RSVPs
  select capacity, template_id into v_capacity, v_template_id
  from public.sessions
  where id = p_session_id
    and cancelled_at is null
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Session not found or cancelled');
  end if;

  -- Verify member is invited to this session template
  if v_template_id is not null then
    select id into v_invitation_id
    from public.session_invitations
    where template_id = v_template_id
      and member_id = p_member_id
    limit 1;

    if v_invitation_id is null then
      return jsonb_build_object('success', false, 'error', 'You are not invited to this session');
    end if;
  end if;

  -- Check for existing active RSVP
  select id into v_existing_id
  from public.session_rsvps
  where session_id = p_session_id
    and member_id = p_member_id
    and cancelled_at is null
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object('success', false, 'error', 'You already have an active RSVP for this session');
  end if;

  -- Count current confirmed RSVPs
  select count(*) into v_confirmed
  from public.session_rsvps
  where session_id = p_session_id
    and rsvp_type = 'confirmed'
    and cancelled_at is null;

  if v_confirmed < v_capacity then
    v_rsvp_type := 'confirmed';
    v_position  := null;
  else
    select count(*) into v_waitlisted
    from public.session_rsvps
    where session_id = p_session_id
      and rsvp_type = 'waitlisted'
      and cancelled_at is null;

    v_rsvp_type := 'waitlisted';
    v_position  := v_waitlisted + 1;
  end if;

  -- Upsert: reactivate cancelled record or insert new
  select id into v_existing_id
  from public.session_rsvps
  where session_id = p_session_id
    and member_id = p_member_id
    and cancelled_at is not null
  limit 1;

  if v_existing_id is not null then
    update public.session_rsvps
    set rsvp_type = v_rsvp_type,
        waitlist_position = v_position,
        cancelled_at = null
    where id = v_existing_id;
  else
    insert into public.session_rsvps
      (session_id, member_id, community_id, rsvp_type, waitlist_position)
    values
      (p_session_id, p_member_id, p_community_id, v_rsvp_type, v_position);
  end if;

  return jsonb_build_object(
    'success',           true,
    'rsvp_type',         v_rsvp_type,
    'waitlist_position', v_position
  );
end;
$$;
