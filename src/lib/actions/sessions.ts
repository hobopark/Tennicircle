'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { CancelSessionSchema, SessionTemplateSchema, EditSessionSchema } from '@/lib/validations/sessions'
import type { SessionActionResult } from '@/lib/types/sessions'

// D-01, D-03, D-04, D-16: Coach creates a recurring session template
export async function createSessionTemplate(
  _prevState: SessionActionResult,
  formData: FormData
): Promise<SessionActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  const userRole = claims.user_role
  if (userRole !== 'coach' && userRole !== 'admin') {
    return { success: false, error: 'Only coaches and admins can create sessions' }
  }

  const communityId = claims.community_id
  if (!communityId) {
    return { success: false, error: 'No community associated with your account' }
  }

  // Parse co_coach_ids and invited_client_ids from comma-separated hidden inputs
  const coCoachIds = formData.get('co_coach_ids')?.toString().split(',').filter(Boolean) ?? []
  const invitedClientIds = formData.get('invited_client_ids')?.toString().split(',').filter(Boolean) ?? []

  // Build parse object
  const parseObj = { ...Object.fromEntries(formData), co_coach_ids: coCoachIds, invited_client_ids: invitedClientIds }

  const parsed = SessionTemplateSchema.safeParse(parseObj)
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  // Get member record
  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { success: false, error: 'Member record not found' }

  // Validate invited clients belong to this coach
  if (invitedClientIds.length > 0) {
    const { data: validClients } = await supabase
      .from('community_members')
      .select('id')
      .eq('coach_id', member.id)
      .eq('role', 'client')
      .in('id', invitedClientIds)

    if (!validClients || validClients.length !== invitedClientIds.length) {
      return { success: false, error: 'One or more selected clients are not assigned to you' }
    }
  }

  // Insert session template (exclude non-column fields)
  const { co_coach_ids: _coCoachIds, court_number: courtNumber, invited_client_ids: _invitedIds, ...templateData } = parsed.data

  const { data: newTemplate, error: templateError } = await supabase
    .from('session_templates')
    .insert({
      ...templateData,
      coach_id: member.id,
      community_id: communityId,
    })
    .select()
    .single()

  if (templateError) return { success: false, error: templateError.message }

  // Generate sessions immediately (do not wait for cron)
  await supabase.rpc('generate_sessions_from_templates')

  // Apply court number to generated sessions if provided
  if (newTemplate && courtNumber) {
    await supabase
      .from('sessions')
      .update({ court_number: courtNumber })
      .eq('template_id', newTemplate.id)
  }

  // Assign coaches to each generated session
  if (newTemplate) {
    const { data: generatedSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('template_id', newTemplate.id)

    if (generatedSessions && generatedSessions.length > 0) {
      const coachAssignments = generatedSessions.flatMap((session) => {
        const assignments = [
          { session_id: session.id, member_id: member.id, is_primary: true },
        ]
        if (coCoachIds.length > 0) {
          coCoachIds.forEach((coCoachId) => {
            assignments.push({ session_id: session.id, member_id: coCoachId, is_primary: false })
          })
        }
        return assignments
      })

      await supabase.from('session_coaches').insert(coachAssignments)
    }
  }

  // Insert session invitations for selected clients
  if (newTemplate && invitedClientIds.length > 0) {
    const invitations = invitedClientIds.map(clientId => ({
      template_id: newTemplate.id,
      member_id: clientId,
    }))
    await supabase.from('session_invitations').insert(invitations)

    // Auto-confirm invited clients for all generated sessions
    const { data: generatedForRsvp } = await supabase
      .from('sessions')
      .select('id')
      .eq('template_id', newTemplate.id)

    if (generatedForRsvp && generatedForRsvp.length > 0) {
      const autoRsvps = generatedForRsvp.flatMap((session) =>
        invitedClientIds.map(clientId => ({
          community_id: communityId,
          session_id: session.id,
          member_id: clientId,
          rsvp_type: 'confirmed' as const,
        }))
      )
      await supabase.from('session_rsvps').insert(autoRsvps)
    }
  }

  revalidatePath('/coach')
  revalidatePath('/sessions')

  return { success: true }
}

// D-14: Coach edits a session instance with this/future scope
export async function editSession(
  sessionId: string,
  scope: 'this' | 'future',
  formData: FormData
): Promise<SessionActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const editClaims = await getJWTClaims(supabase)
  const userRole = editClaims.user_role
  if (userRole !== 'coach' && userRole !== 'admin') {
    return { success: false, error: 'Only coaches and admins can edit sessions' }
  }

  // Parse only non-empty fields
  const rawData: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (value !== '') rawData[key] = value
  }

  const parsed = EditSessionSchema.safeParse(rawData)
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  // Title lives on session_templates, not sessions — only update on "future" scope
  const { title: newTitle, ...sessionFields } = parsed.data
  const updates: Record<string, unknown> = { ...sessionFields }

  if (scope === 'this') {
    // If start_time is provided, combine with current session date to get scheduled_at
    if (parsed.data.start_time) {
      const { data: currentSession } = await supabase
        .from('sessions')
        .select('scheduled_at')
        .eq('id', sessionId)
        .single()

      if (currentSession) {
        // Parse session date in local time, then convert to ISO UTC
        const sessionDate = new Date(currentSession.scheduled_at).toLocaleDateString('en-CA') // YYYY-MM-DD
        const localDateTime = new Date(`${sessionDate}T${parsed.data.start_time}:00`)
        updates.scheduled_at = localDateTime.toISOString()
        delete updates.start_time
      }
    }

    // Verify ownership: coach can only edit sessions they coach (T-02-12)
    const communityId = editClaims.community_id
    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (member && userRole !== 'admin') {
      const { data: coachRecord } = await supabase
        .from('session_coaches')
        .select('member_id')
        .eq('session_id', sessionId)
        .eq('member_id', member.id)
        .single()

      if (!coachRecord) {
        return { success: false, error: 'You can only edit your own sessions' }
      }
    }

    const { error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)

    if (error) return { success: false, error: error.message }
  } else {
    // scope === 'future'
    const { data: session } = await supabase
      .from('sessions')
      .select('template_id, scheduled_at')
      .eq('id', sessionId)
      .single()

    if (!session?.template_id) {
      return { success: false, error: 'Cannot edit future sessions — this session has no template' }
    }

    // Verify ownership for future scope
    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (member && userRole !== 'admin') {
      const { data: template } = await supabase
        .from('session_templates')
        .select('coach_id')
        .eq('id', session.template_id)
        .single()

      if (template?.coach_id !== member.id) {
        return { success: false, error: 'You can only edit your own sessions' }
      }
    }

    // Build template-level updates (excludes court_number which is per-instance)
    const { court_number: _cn, start_time, title: _titleExtracted, ...templateFieldUpdates } = parsed.data
    const templateUpdates: Record<string, unknown> = { ...templateFieldUpdates }
    if (start_time) templateUpdates.start_time = start_time
    if (newTitle) templateUpdates.title = newTitle

    if (Object.keys(templateUpdates).length > 0) {
      const { error: templateError } = await supabase
        .from('session_templates')
        .update(templateUpdates)
        .eq('id', session.template_id)

      if (templateError) return { success: false, error: templateError.message }
    }

    // Build session-level updates, convert start_time to scheduled_at for each session
    const sessionUpdates: Record<string, unknown> = {}
    if (parsed.data.venue) sessionUpdates.venue = parsed.data.venue
    if (parsed.data.capacity) sessionUpdates.capacity = parsed.data.capacity
    if (parsed.data.duration_minutes) sessionUpdates.duration_minutes = parsed.data.duration_minutes
    if (parsed.data.court_number !== undefined) sessionUpdates.court_number = parsed.data.court_number

    // Note: start_time for future sessions is handled at template level; per-session scheduled_at
    // update for start_time changes requires fetching each session's date — skip per-instance time update here.
    // The template update above ensures new generated sessions get the new time.

    if (Object.keys(sessionUpdates).length > 0) {
      // CRITICAL: gte includes current session, does not touch past sessions (T-02-06)
      const { error: sessionsError } = await supabase
        .from('sessions')
        .update(sessionUpdates)
        .eq('template_id', session.template_id)
        .gte('scheduled_at', session.scheduled_at)

      if (sessionsError) return { success: false, error: sessionsError.message }
    }
  }

  revalidatePath('/sessions')
  revalidatePath('/coach')

  return { success: true }
}

// D-17: Coaches and admins can cancel a session with a required reason
export async function cancelSession(
  sessionId: string,
  formData: FormData
): Promise<SessionActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Auth check: only coach or admin
  const cancelClaims = await getJWTClaims(supabase)
  if (cancelClaims.user_role !== 'coach' && cancelClaims.user_role !== 'admin') {
    return { success: false, error: 'Only coaches and admins can cancel sessions' }
  }

  // Validate cancellation reason
  const parsed = CancelSessionSchema.safeParse({
    cancellation_reason: formData.get('cancellation_reason'),
  })

  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { error } = await supabase
    .from('sessions')
    .update({
      cancelled_at: new Date().toISOString(),
      cancellation_reason: parsed.data.cancellation_reason,
    })
    .eq('id', sessionId)

  if (error) return { success: false, error: error.message }

  // Cascade: cancel all active RSVPs for this session
  await supabase
    .from('session_rsvps')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .is('cancelled_at', null)

  revalidatePath('/sessions')
  revalidatePath('/coach')

  return { success: true }
}
