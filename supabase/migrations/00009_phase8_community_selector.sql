-- =============================================================================
-- 00009_phase8_community_selector.sql
-- Phase 8: RLS rewrite (JWT → membership-based), join_requests table,
-- communities.description column, notification CHECK update
-- =============================================================================

-- =============================================================================
-- Section 1a: communities.description column (D-43)
-- =============================================================================
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS description text;

-- =============================================================================
-- Section 1b: Make player_profiles.community_id nullable (D-15 support)
-- D-15: Profile setup happens BEFORE community selection. The current schema
-- requires community_id NOT NULL, which deadlocks new users (can't create
-- profile without community, can't browse communities without profile).
-- Fix: make community_id nullable so a "global" profile row (community_id=NULL)
-- can be created during initial setup.
-- =============================================================================
ALTER TABLE public.player_profiles ALTER COLUMN community_id DROP NOT NULL;

-- Ensure at most one global profile per user (NULL community_id)
CREATE UNIQUE INDEX IF NOT EXISTS player_profiles_global_unique
  ON public.player_profiles(user_id) WHERE community_id IS NULL;

-- =============================================================================
-- Section 2: join_requests table (D-42)
-- =============================================================================
CREATE TABLE public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Unique constraint: one pending request per user per community
CREATE UNIQUE INDEX join_requests_pending_unique
  ON public.join_requests(community_id, user_id)
  WHERE status = 'pending';

-- RLS: Users can read their own requests
CREATE POLICY "users_read_own_requests" ON public.join_requests
  FOR SELECT USING (user_id = auth.uid());

-- RLS: Coaches and admins can read requests for their community
CREATE POLICY "staff_read_community_requests" ON public.join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = join_requests.community_id
      AND role IN ('admin', 'coach')
    )
  );

-- RLS: Any authenticated user can insert a request for themselves
CREATE POLICY "users_create_own_requests" ON public.join_requests
  FOR INSERT WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- RLS: Coaches and admins can update requests (approve/reject)
CREATE POLICY "staff_resolve_requests" ON public.join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = join_requests.community_id
      AND role IN ('admin', 'coach')
    )
  );

-- =============================================================================
-- Section 3: Notification CHECK constraint update (Pitfall 5)
-- Original: 00006_notifications_schema.sql
-- =============================================================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'session_reminder', 'announcement', 'rsvp_confirmed', 'waitlist_promoted',
    'event_updated', 'session_updated', 'session_cancelled', 'rsvp_cancelled',
    'join_approved', 'join_rejected'
  ));

-- =============================================================================
-- Section 4: Notifications RLS fix for multi-community
-- Original: 00006_notifications_schema.sql
-- The current policies use LIMIT 1 which breaks when users are in multiple
-- communities. Replace with IN subquery.
-- =============================================================================
DROP POLICY IF EXISTS "Members read own notifications" ON public.notifications;
CREATE POLICY "Members read own notifications" ON public.notifications
  FOR SELECT USING (
    member_id IN (
      SELECT id FROM public.community_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members mark own notifications read" ON public.notifications;
CREATE POLICY "Members mark own notifications read" ON public.notifications
  FOR UPDATE USING (
    member_id IN (
      SELECT id FROM public.community_members WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    member_id IN (
      SELECT id FROM public.community_members WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- Section 5: RLS policy rewrite — DROP all JWT-based policies and recreate
-- with membership-based checks (D-18, D-19)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- communities table (Original: 00001_foundation_schema.sql)
-- KEEP: authenticated_read_communities (00008) — allows browse
-- REWRITE: community_members_read_own_community
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "community_members_read_own_community" ON public.communities;
CREATE POLICY "community_members_read_own_community" ON public.communities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = communities.id
    )
  );

-- -----------------------------------------------------------------------------
-- SECURITY DEFINER helper — bypasses RLS to check membership without recursion.
-- Used by community_members policies and any policy that needs "is this user a
-- member of community X?" without triggering self-referential RLS on community_members.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_membership(p_community_id uuid, p_role text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE user_id = auth.uid()
      AND community_id = p_community_id
      AND (p_role IS NULL OR role = p_role)
  )
$$;

-- -----------------------------------------------------------------------------
-- community_members table (Original: 00001_foundation_schema.sql)
-- REWRITE: members_read_own_community, admins_manage_members
-- KEEP: users_insert_own_membership (00008)
-- Uses has_membership() to avoid self-referential RLS recursion (42P17)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "members_read_own_community" ON public.community_members;
CREATE POLICY "members_read_own_community" ON public.community_members
  FOR SELECT TO authenticated
  USING (public.has_membership(community_id));

DROP POLICY IF EXISTS "admins_manage_members" ON public.community_members;

-- Separate INSERT and UPDATE policies to replace the old FOR ALL policy
CREATE POLICY "admins_insert_members" ON public.community_members
  FOR INSERT TO authenticated
  WITH CHECK (public.has_membership(community_id, 'admin'));

CREATE POLICY "admins_update_members" ON public.community_members
  FOR UPDATE TO authenticated
  USING (public.has_membership(community_id, 'admin'));

CREATE POLICY "admins_delete_members" ON public.community_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm2
      WHERE cm2.user_id = auth.uid()
      AND cm2.community_id = community_members.community_id
      AND cm2.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- invite_links table (Original: 00001_foundation_schema.sql)
-- REWRITE: members_read_own_community_invites, coaches_admins_create_invites
-- KEEP: public_read_active_invite_by_token (public access by token)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "members_read_own_community_invites" ON public.invite_links;
CREATE POLICY "members_read_own_community_invites" ON public.invite_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = invite_links.community_id
    )
  );

DROP POLICY IF EXISTS "coaches_admins_create_invites" ON public.invite_links;
CREATE POLICY "coaches_admins_create_invites" ON public.invite_links
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = invite_links.community_id
      AND role IN ('admin', 'coach')
    )
  );

-- -----------------------------------------------------------------------------
-- session_templates table (Original: 00002_session_schema.sql)
-- REWRITE: session_templates_select, session_templates_insert,
--          session_templates_update, session_templates_delete
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "session_templates_select" ON public.session_templates;
CREATE POLICY "session_templates_select" ON public.session_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = session_templates.community_id
    )
  );

DROP POLICY IF EXISTS "session_templates_insert" ON public.session_templates;
CREATE POLICY "session_templates_insert" ON public.session_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = session_templates.community_id
      AND role IN ('admin', 'coach')
    )
  );

DROP POLICY IF EXISTS "session_templates_update" ON public.session_templates;
CREATE POLICY "session_templates_update" ON public.session_templates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = session_templates.community_id
      AND role IN ('admin', 'coach')
    )
  );

DROP POLICY IF EXISTS "session_templates_delete" ON public.session_templates;
CREATE POLICY "session_templates_delete" ON public.session_templates
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = session_templates.community_id
      AND role IN ('admin', 'coach')
    )
  );

-- -----------------------------------------------------------------------------
-- sessions table (Original: 00002_session_schema.sql, updated in 00003)
-- REWRITE: sessions_select, sessions_insert, sessions_update, sessions_delete
-- Note: sessions_select was already replaced in 00003; we drop that version too.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "sessions_select" ON public.sessions;
CREATE POLICY "sessions_select" ON public.sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = sessions.community_id
    )
    AND (
      -- Admin and coach see all community sessions
      EXISTS (
        SELECT 1 FROM public.community_members
        WHERE user_id = auth.uid()
        AND community_id = sessions.community_id
        AND role IN ('admin', 'coach')
      )
      OR (
        -- Client sees only sessions where they are invited on the template
        sessions.template_id IN (
          SELECT si.template_id FROM public.session_invitations si
          JOIN public.community_members cm ON cm.id = si.member_id
          WHERE cm.user_id = auth.uid()
          AND cm.community_id = sessions.community_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "sessions_insert" ON public.sessions;
CREATE POLICY "sessions_insert" ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = sessions.community_id
      AND role IN ('admin', 'coach')
    )
  );

DROP POLICY IF EXISTS "sessions_update" ON public.sessions;
CREATE POLICY "sessions_update" ON public.sessions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = sessions.community_id
      AND role IN ('admin', 'coach')
    )
  );

DROP POLICY IF EXISTS "sessions_delete" ON public.sessions;
CREATE POLICY "sessions_delete" ON public.sessions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = sessions.community_id
      AND role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- session_rsvps table (Original: 00002_session_schema.sql)
-- REWRITE: session_rsvps_select, session_rsvps_insert,
--          session_rsvps_update, session_rsvps_delete
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "session_rsvps_select" ON public.session_rsvps;
CREATE POLICY "session_rsvps_select" ON public.session_rsvps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = session_rsvps.community_id
    )
  );

DROP POLICY IF EXISTS "session_rsvps_insert" ON public.session_rsvps;
CREATE POLICY "session_rsvps_insert" ON public.session_rsvps
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = session_rsvps.community_id
    )
    AND member_id = (
      SELECT id FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = session_rsvps.community_id
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "session_rsvps_update" ON public.session_rsvps;
CREATE POLICY "session_rsvps_update" ON public.session_rsvps
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = session_rsvps.community_id
      AND role IN ('admin', 'coach')
    )
  );

DROP POLICY IF EXISTS "session_rsvps_delete" ON public.session_rsvps;
CREATE POLICY "session_rsvps_delete" ON public.session_rsvps
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = session_rsvps.community_id
    )
    AND (
      member_id = (
        SELECT id FROM public.community_members
        WHERE user_id = auth.uid()
        AND community_id = session_rsvps.community_id
        LIMIT 1
      )
      OR EXISTS (
        SELECT 1 FROM public.community_members
        WHERE user_id = auth.uid()
        AND community_id = session_rsvps.community_id
        AND role IN ('admin', 'coach')
      )
    )
  );

-- -----------------------------------------------------------------------------
-- session_coaches table (Original: 00002_session_schema.sql)
-- REWRITE: session_coaches_select, session_coaches_insert,
--          session_coaches_update, session_coaches_delete
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "session_coaches_select" ON public.session_coaches;
CREATE POLICY "session_coaches_select" ON public.session_coaches
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.community_members cm ON cm.community_id = s.community_id
      WHERE s.id = session_coaches.session_id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "session_coaches_insert" ON public.session_coaches;
CREATE POLICY "session_coaches_insert" ON public.session_coaches
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.community_members cm ON cm.community_id = s.community_id
      WHERE s.id = session_coaches.session_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'coach')
    )
  );

DROP POLICY IF EXISTS "session_coaches_update" ON public.session_coaches;
CREATE POLICY "session_coaches_update" ON public.session_coaches
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.community_members cm ON cm.community_id = s.community_id
      WHERE s.id = session_coaches.session_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'coach')
    )
  );

DROP POLICY IF EXISTS "session_coaches_delete" ON public.session_coaches;
CREATE POLICY "session_coaches_delete" ON public.session_coaches
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.community_members cm ON cm.community_id = s.community_id
      WHERE s.id = session_coaches.session_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'coach')
    )
  );

-- -----------------------------------------------------------------------------
-- session_invitations table (Original: 00003_session_invitations.sql)
-- REWRITE: session_invitations_select, session_invitations_insert,
--          session_invitations_delete
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "session_invitations_select" ON public.session_invitations;
CREATE POLICY "session_invitations_select" ON public.session_invitations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.session_templates st
      JOIN public.community_members cm ON cm.community_id = st.community_id
      WHERE st.id = session_invitations.template_id
      AND cm.user_id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.session_templates st
        JOIN public.community_members cm ON cm.community_id = st.community_id
        WHERE st.id = session_invitations.template_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'coach')
      )
      OR member_id = (
        SELECT cm.id FROM public.session_templates st
        JOIN public.community_members cm ON cm.community_id = st.community_id
        WHERE st.id = session_invitations.template_id
        AND cm.user_id = auth.uid()
        LIMIT 1
      )
    )
  );

DROP POLICY IF EXISTS "session_invitations_insert" ON public.session_invitations;
CREATE POLICY "session_invitations_insert" ON public.session_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_templates st
      JOIN public.community_members cm ON cm.community_id = st.community_id
      WHERE st.id = session_invitations.template_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'coach')
    )
  );

DROP POLICY IF EXISTS "session_invitations_delete" ON public.session_invitations;
CREATE POLICY "session_invitations_delete" ON public.session_invitations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.session_templates st
      JOIN public.community_members cm ON cm.community_id = st.community_id
      WHERE st.id = session_invitations.template_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'coach')
    )
  );

-- -----------------------------------------------------------------------------
-- player_profiles table (Original: 00004_player_profiles.sql)
-- REWRITE: player_profiles_select (two policies), player_profiles_insert,
--          player_profiles_update
-- CRITICAL: Two SELECT policies — self-read for proxy, community read for roster.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "player_profiles_select" ON public.player_profiles;

-- Policy 1: Users can always read their own profiles (needed by proxy and /profile)
CREATE POLICY "player_profiles_read_own" ON public.player_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Community members can read each other's profiles (roster, member views)
CREATE POLICY "player_profiles_read_community" ON public.player_profiles
  FOR SELECT TO authenticated
  USING (
    community_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = player_profiles.community_id
    )
  );

DROP POLICY IF EXISTS "player_profiles_insert" ON public.player_profiles;
CREATE POLICY "player_profiles_insert" ON public.player_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "player_profiles_update" ON public.player_profiles;
CREATE POLICY "player_profiles_update" ON public.player_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- coach_assessments table (Original: 00004_player_profiles.sql)
-- REWRITE: coach_assessments_select, coach_assessments_insert,
--          coach_assessments_update
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "coach_assessments_select" ON public.coach_assessments;
CREATE POLICY "coach_assessments_select" ON public.coach_assessments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = coach_assessments.community_id
    )
  );

DROP POLICY IF EXISTS "coach_assessments_insert" ON public.coach_assessments;
CREATE POLICY "coach_assessments_insert" ON public.coach_assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = coach_assessments.community_id
      AND role IN ('admin', 'coach')
    )
  );

DROP POLICY IF EXISTS "coach_assessments_update" ON public.coach_assessments;
CREATE POLICY "coach_assessments_update" ON public.coach_assessments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = coach_assessments.community_id
      AND role IN ('admin', 'coach')
    )
  );

-- -----------------------------------------------------------------------------
-- progress_notes table (Original: 00004_player_profiles.sql)
-- REWRITE: progress_notes_select, progress_notes_insert, progress_notes_update
-- SELECT: community member or the player themselves
-- INSERT/UPDATE: admin/coach in community
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "progress_notes_select" ON public.progress_notes;
CREATE POLICY "progress_notes_select" ON public.progress_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = progress_notes.community_id
      AND role IN ('admin', 'coach')
    )
    OR subject_member_id IN (
      SELECT id FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = progress_notes.community_id
    )
  );

DROP POLICY IF EXISTS "progress_notes_insert" ON public.progress_notes;
CREATE POLICY "progress_notes_insert" ON public.progress_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = progress_notes.community_id
      AND role IN ('admin', 'coach')
    )
  );

DROP POLICY IF EXISTS "progress_notes_update" ON public.progress_notes;
CREATE POLICY "progress_notes_update" ON public.progress_notes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = progress_notes.community_id
      AND role IN ('admin', 'coach')
    )
  );

-- -----------------------------------------------------------------------------
-- Storage policies for avatars (Original: 00004_player_profiles.sql)
-- REWRITE: avatars_insert, avatars_update
-- KEEP: avatars_select (public read, no JWT needed)
-- Path structure changes from avatars/{community_id}/{user_id}/... to
-- avatars/{user_id}/... — no more community_id in storage paths.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- avatars_select: keep public read (no changes needed, no JWT claims used)

-- -----------------------------------------------------------------------------
-- events table (Original: 00005_events_schema.sql)
-- REWRITE: all 4 policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view events in their community" ON public.events;
CREATE POLICY "Members can view events in their community" ON public.events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = events.community_id
    )
  );

DROP POLICY IF EXISTS "Members can create events in their community" ON public.events;
CREATE POLICY "Members can create events in their community" ON public.events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = events.community_id
    )
    AND (
      is_official = false
      OR EXISTS (
        SELECT 1 FROM public.community_members
        WHERE user_id = auth.uid()
        AND community_id = events.community_id
        AND role IN ('admin', 'coach')
      )
    )
  );

DROP POLICY IF EXISTS "Creator or admin can update events" ON public.events;
CREATE POLICY "Creator or admin can update events" ON public.events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = events.community_id
    )
    AND (
      created_by IN (
        SELECT id FROM public.community_members
        WHERE user_id = auth.uid()
        AND community_id = events.community_id
      )
      OR EXISTS (
        SELECT 1 FROM public.community_members
        WHERE user_id = auth.uid()
        AND community_id = events.community_id
        AND role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS "Creator, coach, or admin can delete events" ON public.events;
CREATE POLICY "Creator, coach, or admin can delete events" ON public.events
  FOR DELETE
  USING (
    created_by IN (
      SELECT id FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = events.community_id
    )
    OR EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = events.community_id
      AND role IN ('admin', 'coach')
    )
  );

-- -----------------------------------------------------------------------------
-- event_rsvps table (Original: 00005_events_schema.sql)
-- REWRITE: all 3 policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view event RSVPs in their community" ON public.event_rsvps;
CREATE POLICY "Members can view event RSVPs in their community" ON public.event_rsvps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = event_rsvps.community_id
    )
  );

DROP POLICY IF EXISTS "Members can RSVP to events" ON public.event_rsvps;
CREATE POLICY "Members can RSVP to events" ON public.event_rsvps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = event_rsvps.community_id
    )
    AND member_id IN (
      SELECT id FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = event_rsvps.community_id
    )
  );

DROP POLICY IF EXISTS "Members can update own RSVP" ON public.event_rsvps;
CREATE POLICY "Members can update own RSVP" ON public.event_rsvps
  FOR UPDATE
  USING (
    member_id IN (
      SELECT id FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = event_rsvps.community_id
    )
  );

-- -----------------------------------------------------------------------------
-- announcements table (Original: 00005_events_schema.sql)
-- REWRITE: all 4 policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view announcements in their community" ON public.announcements;
CREATE POLICY "Members can view announcements in their community" ON public.announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = announcements.community_id
    )
  );

DROP POLICY IF EXISTS "Coaches and admins can post announcements" ON public.announcements;
CREATE POLICY "Coaches and admins can post announcements" ON public.announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = announcements.community_id
      AND role IN ('admin', 'coach')
    )
  );

DROP POLICY IF EXISTS "Creator or admin can update announcements" ON public.announcements;
CREATE POLICY "Creator or admin can update announcements" ON public.announcements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = announcements.community_id
    )
    AND (
      created_by IN (
        SELECT id FROM public.community_members
        WHERE user_id = auth.uid()
        AND community_id = announcements.community_id
      )
      OR EXISTS (
        SELECT 1 FROM public.community_members
        WHERE user_id = auth.uid()
        AND community_id = announcements.community_id
        AND role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS "Coach or admin can delete announcements" ON public.announcements;
CREATE POLICY "Coach or admin can delete announcements" ON public.announcements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = announcements.community_id
      AND role IN ('admin', 'coach')
    )
  );

-- event-draws storage policies: no JWT claims used, kept as-is (no changes needed)

-- -----------------------------------------------------------------------------
-- coach_client_assignments table (Original: 00008_coach_client_assignments.sql)
-- REWRITE: assignments_read_own_community, coaches_create_own_assignments,
--          users_insert_own_assignment, coaches_delete_own_assignments
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "assignments_read_own_community" ON public.coach_client_assignments;
CREATE POLICY "assignments_read_own_community" ON public.coach_client_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = coach_client_assignments.community_id
    )
  );

DROP POLICY IF EXISTS "coaches_create_own_assignments" ON public.coach_client_assignments;
CREATE POLICY "coaches_create_own_assignments" ON public.coach_client_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = coach_client_assignments.community_id
      AND role IN ('admin', 'coach')
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.community_members
        WHERE user_id = auth.uid()
        AND community_id = coach_client_assignments.community_id
        AND role = 'admin'
      )
      OR coach_member_id = (
        SELECT id FROM public.community_members
        WHERE user_id = auth.uid()
        AND community_id = coach_client_assignments.community_id
        LIMIT 1
      )
    )
  );

DROP POLICY IF EXISTS "users_insert_own_assignment" ON public.coach_client_assignments;
CREATE POLICY "users_insert_own_assignment" ON public.coach_client_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    client_member_id IN (
      SELECT id FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = coach_client_assignments.community_id
    )
  );

DROP POLICY IF EXISTS "coaches_delete_own_assignments" ON public.coach_client_assignments;
CREATE POLICY "coaches_delete_own_assignments" ON public.coach_client_assignments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE user_id = auth.uid()
      AND community_id = coach_client_assignments.community_id
      AND role = 'admin'
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.community_members
        WHERE user_id = auth.uid()
        AND community_id = coach_client_assignments.community_id
        AND role = 'coach'
      )
      AND coach_member_id = (
        SELECT id FROM public.community_members
        WHERE user_id = auth.uid()
        AND community_id = coach_client_assignments.community_id
        LIMIT 1
      )
    )
  );

-- =============================================================================
-- Section 6: Remove Custom Access Token Hook (D-10)
-- Original: 00001_foundation_schema.sql
-- Note: The hook binding in Supabase Dashboard must also be removed manually.
-- =============================================================================
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Also drop the old role-checking helper that relied on JWT claims
DROP FUNCTION IF EXISTS public.get_user_role();
