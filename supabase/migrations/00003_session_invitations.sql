-- =============================================================================
-- 00003_session_invitations.sql
-- Per-template client invitations for private sessions
-- =============================================================================

-- 1. session_invitations table
CREATE TABLE public.session_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.session_templates(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES public.community_members(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (template_id, member_id)
);
ALTER TABLE public.session_invitations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_session_invitations_template_id ON public.session_invitations(template_id);
CREATE INDEX idx_session_invitations_member_id ON public.session_invitations(member_id);

-- =============================================================================
-- RLS Policies: session_invitations
-- =============================================================================

-- SELECT: Coaches/admins see all invitations in community; clients see their own
CREATE POLICY "session_invitations_select"
ON public.session_invitations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.session_templates st
    WHERE st.id = session_invitations.template_id
      AND st.community_id = ((SELECT auth.jwt()) ->> 'community_id')::uuid
  )
  AND (
    ((SELECT auth.jwt()) ->> 'user_role') IN ('admin', 'coach')
    OR member_id = (
      SELECT id FROM public.community_members
      WHERE user_id = (SELECT auth.uid())
        AND community_id = ((SELECT auth.jwt()) ->> 'community_id')::uuid
      LIMIT 1
    )
  )
);

-- INSERT: Coach or admin
CREATE POLICY "session_invitations_insert"
ON public.session_invitations FOR INSERT TO authenticated
WITH CHECK (
  ((SELECT auth.jwt()) ->> 'user_role') IN ('admin', 'coach')
);

-- DELETE: Coach or admin
CREATE POLICY "session_invitations_delete"
ON public.session_invitations FOR DELETE TO authenticated
USING (
  ((SELECT auth.jwt()) ->> 'user_role') IN ('admin', 'coach')
);

-- =============================================================================
-- Update sessions SELECT policy: clients only see invited sessions
-- =============================================================================
DROP POLICY IF EXISTS "sessions_select" ON public.sessions;

CREATE POLICY "sessions_select"
ON public.sessions FOR SELECT TO authenticated
USING (
  community_id = ((SELECT auth.jwt()) ->> 'community_id')::uuid
  AND (
    -- Admin and coach see all community sessions
    ((SELECT auth.jwt()) ->> 'user_role') IN ('admin', 'coach')
    OR (
      -- Client sees only sessions where they are invited on the template
      ((SELECT auth.jwt()) ->> 'user_role') = 'client'
      AND template_id IN (
        SELECT si.template_id FROM public.session_invitations si
        WHERE si.member_id = (
          SELECT id FROM public.community_members
          WHERE user_id = (SELECT auth.uid())
            AND community_id = ((SELECT auth.jwt()) ->> 'community_id')::uuid
          LIMIT 1
        )
      )
    )
  )
);
