'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { RsvpActionResult, SessionActionResult } from '@/lib/types/sessions'

// SESS-05: RSVP to a session (confirmed or waitlisted based on capacity)
export async function rsvpSession(sessionId: string): Promise<RsvpActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  const communityId = claims.community_id
  if (!communityId) return { success: false, error: 'No community associated with your account' }

  // Get member record
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  // Check session is not cancelled and get capacity
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('capacity, cancelled_at, template_id')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) return { success: false, error: 'Session not found' }
  if (session.cancelled_at !== null) return { success: false, error: 'This session has been cancelled' }

  // Verify client is invited to this session's template
  if (session.template_id) {
    const { data: invitation } = await supabase
      .from('session_invitations')
      .select('id')
      .eq('template_id', session.template_id)
      .eq('member_id', member.id)
      .single()

    if (!invitation) return { success: false, error: 'You are not invited to this session' }
  }

  // Count confirmed RSVPs (non-cancelled)
  const { count: confirmedCount, error: confirmedError } = await supabase
    .from('session_rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('rsvp_type', 'confirmed')
    .is('cancelled_at', null)

  if (confirmedError) return { success: false, error: confirmedError.message }

  let rsvpType: 'confirmed' | 'waitlisted'
  let waitlistPosition: number | null = null

  if ((confirmedCount ?? 0) < session.capacity) {
    rsvpType = 'confirmed'
  } else {
    // Count current waitlisted (non-cancelled)
    const { count: waitlistCount, error: waitlistError } = await supabase
      .from('session_rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('rsvp_type', 'waitlisted')
      .is('cancelled_at', null)

    if (waitlistError) return { success: false, error: waitlistError.message }

    rsvpType = 'waitlisted'
    waitlistPosition = (waitlistCount ?? 0) + 1
  }

  const { error: insertError } = await supabase
    .from('session_rsvps')
    .insert({
      session_id: sessionId,
      member_id: member.id,
      community_id: communityId,
      rsvp_type: rsvpType,
      waitlist_position: waitlistPosition,
    })

  if (insertError) {
    // DB trigger check_session_capacity raises exception at capacity
    if (insertError.message.includes('capacity')) {
      return { success: false, error: "This session is now full. You've been added to the waitlist." }
    }
    return { success: false, error: insertError.message }
  }

  // NOTF-03: Notify member of RSVP confirmation (fire-and-forget)
  if (rsvpType === 'confirmed') {
    const { data: sessionInfo } = await supabase
      .from('sessions')
      .select('scheduled_at, venue')
      .eq('id', sessionId)
      .single()

    if (sessionInfo) {
      const serviceClient = createServiceClient()
      const { formatDateTime } = await import('@/lib/utils/dates')
      serviceClient.from('notifications').insert({
        community_id: communityId,
        member_id: member.id,
        notification_type: 'rsvp_confirmed' as const,
        title: "You're confirmed",
        body: `You're confirmed for the session on ${formatDateTime(sessionInfo.scheduled_at)}`,
        metadata: { resource_type: 'session' as const, resource_id: sessionId },
      }).then(() => {})
    }
  }

  revalidatePath('/sessions')
  revalidatePath('/coach')

  return { success: true, rsvpType, waitlistPosition: waitlistPosition ?? undefined }
}

// SESS-07: Cancel own RSVP
export async function cancelRsvp(sessionId: string): Promise<SessionActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get member record
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  // Get the active RSVP to determine its type before cancelling
  const { data: rsvp, error: rsvpError } = await supabase
    .from('session_rsvps')
    .select('id, rsvp_type')
    .eq('session_id', sessionId)
    .eq('member_id', member.id)
    .is('cancelled_at', null)
    .single()

  if (rsvpError || !rsvp) return { success: false, error: 'Active RSVP not found' }

  // Cancel the RSVP — T-02-08: member_id filter ensures users can only cancel their own
  const { error: cancelError } = await supabase
    .from('session_rsvps')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('member_id', member.id)
    .is('cancelled_at', null)

  if (cancelError) return { success: false, error: cancelError.message }

  // If the cancelled RSVP was waitlisted, resequence remaining waitlist positions
  if (rsvp.rsvp_type === 'waitlisted') {
    await resequenceWaitlist(supabase, sessionId)
  }

  revalidatePath('/sessions')
  revalidatePath('/coach')

  return { success: true }
}

// SESS-08: Coach promotes a waitlisted member to confirmed
export async function promoteFromWaitlist(rsvpId: string): Promise<SessionActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Auth check: only coach or admin — T-02-07
  const promoteClaims = await getJWTClaims(supabase)
  if (promoteClaims.user_role !== 'coach' && promoteClaims.user_role !== 'admin') {
    return { success: false, error: 'Only coaches can promote from waitlist' }
  }

  // Verify the RSVP's session belongs to this coach's community
  const { data: rsvpCheck } = await supabase
    .from('session_rsvps')
    .select('community_id')
    .eq('id', rsvpId)
    .single()

  if (rsvpCheck && rsvpCheck.community_id !== promoteClaims.community_id) {
    return { success: false, error: 'You cannot manage sessions outside your community' }
  }

  // Get the RSVP and session capacity
  const { data: rsvp, error: rsvpError } = await supabase
    .from('session_rsvps')
    .select('*, sessions(capacity)')
    .eq('id', rsvpId)
    .single()

  if (rsvpError || !rsvp) return { success: false, error: 'RSVP not found' }

  // Verify RSVP is currently waitlisted and not cancelled
  if (rsvp.rsvp_type !== 'waitlisted') {
    return { success: false, error: 'RSVP is not on the waitlist' }
  }
  if (rsvp.cancelled_at !== null) {
    return { success: false, error: 'RSVP has already been cancelled' }
  }

  // Count confirmed RSVPs for the session (non-cancelled)
  const { count: confirmedCount, error: countError } = await supabase
    .from('session_rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', rsvp.session_id)
    .eq('rsvp_type', 'confirmed')
    .is('cancelled_at', null)

  if (countError) return { success: false, error: countError.message }

  const sessionCapacity = rsvp.sessions?.capacity ?? 0
  if ((confirmedCount ?? 0) >= sessionCapacity) {
    return { success: false, error: 'Session is at capacity. Cancel an existing RSVP first.' }
  }

  // Promote: update rsvp_type to confirmed, clear waitlist_position
  const { error: updateError } = await supabase
    .from('session_rsvps')
    .update({ rsvp_type: 'confirmed', waitlist_position: null })
    .eq('id', rsvpId)

  if (updateError) return { success: false, error: updateError.message }

  // NOTF-03: Notify promoted member (fire-and-forget)
  const { data: promoSession } = await supabase
    .from('sessions')
    .select('scheduled_at, venue, community_id')
    .eq('id', rsvp.session_id)
    .single()

  if (promoSession) {
    const serviceClient = createServiceClient()
    const { formatDateTime } = await import('@/lib/utils/dates')
    serviceClient.from('notifications').insert({
      community_id: promoSession.community_id,
      member_id: rsvp.member_id,
      notification_type: 'waitlist_promoted' as const,
      title: "You've been moved off the waitlist",
      body: `You've been moved off the waitlist for the session on ${formatDateTime(promoSession.scheduled_at)}`,
      metadata: { resource_type: 'session' as const, resource_id: rsvp.session_id },
    }).then(() => {})
  }

  // Resequence remaining waitlist positions for the session
  await resequenceWaitlist(supabase, rsvp.session_id)

  revalidatePath('/sessions')
  revalidatePath('/coach')

  return { success: true }
}

// SESS-09: Coach removes a waitlisted member from the waitlist
export async function removeFromWaitlist(rsvpId: string): Promise<SessionActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Auth check: only coach or admin
  const removeClaims = await getJWTClaims(supabase)
  if (removeClaims.user_role !== 'coach' && removeClaims.user_role !== 'admin') {
    return { success: false, error: 'Only coaches can remove from waitlist' }
  }

  // Get the RSVP record
  const { data: rsvp, error: rsvpError } = await supabase
    .from('session_rsvps')
    .select('*')
    .eq('id', rsvpId)
    .single()

  if (rsvpError || !rsvp) return { success: false, error: 'RSVP not found' }

  // Verify RSVP is currently waitlisted and not cancelled
  if (rsvp.rsvp_type !== 'waitlisted') {
    return { success: false, error: 'RSVP is not on the waitlist' }
  }
  if (rsvp.cancelled_at !== null) {
    return { success: false, error: 'RSVP has already been cancelled' }
  }

  // Cancel the waitlisted RSVP
  const { error: updateError } = await supabase
    .from('session_rsvps')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', rsvpId)

  if (updateError) return { success: false, error: updateError.message }

  // Resequence remaining waitlist positions for the session
  await resequenceWaitlist(supabase, rsvp.session_id)

  revalidatePath('/sessions')
  revalidatePath('/coach')

  return { success: true }
}

// Helper: resequence waitlist positions for a session after a cancellation or promotion
// Assigns 1-based positions ordered by created_at to maintain FIFO ordering
async function resequenceWaitlist(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  sessionId: string
): Promise<void> {
  const { data: waitlisted } = await supabase
    .from('session_rsvps')
    .select('id')
    .eq('session_id', sessionId)
    .eq('rsvp_type', 'waitlisted')
    .is('cancelled_at', null)
    .order('created_at', { ascending: true })

  if (!waitlisted || waitlisted.length === 0) return

  await Promise.all(
    waitlisted.map((rsvp: { id: string }, index: number) =>
      supabase
        .from('session_rsvps')
        .update({ waitlist_position: index + 1 })
        .eq('id', rsvp.id)
    )
  )
}
