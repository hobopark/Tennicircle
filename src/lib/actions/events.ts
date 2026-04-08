'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { CreateEventSchema } from '@/lib/validations/events'
import type { EventActionResult, EventRsvpActionResult } from '@/lib/types/events'

// EVNT-01: Create a community event
export async function createEvent(
  _prevState: EventActionResult,
  formData: FormData
): Promise<EventActionResult> {
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

  // Parse and validate form data
  const parsed = CreateEventSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  // T-04-02: is_official is derived from JWT role — NEVER from formData
  const isOfficial = claims.user_role === 'coach' || claims.user_role === 'admin'

  // Combine date + time into ISO string
  const startsAt = new Date(
    `${parsed.data.starts_at_date}T${parsed.data.starts_at_time}`
  ).toISOString()

  // Convert empty/zero optional fields to null
  const durationMinutes =
    parsed.data.duration_minutes && parsed.data.duration_minutes > 0
      ? parsed.data.duration_minutes
      : null

  const capacity =
    parsed.data.capacity && parsed.data.capacity > 0
      ? parsed.data.capacity
      : null

  // Handle draw_image_url from form (for tournament type)
  const drawImageUrl = formData.get('draw_image_url')?.toString() || null

  const { data: insertedEvent, error: insertError } = await supabase
    .from('events')
    .insert({
      community_id: communityId,
      created_by: member.id,
      event_type: parsed.data.event_type,
      title: parsed.data.title,
      description: parsed.data.description || null,
      venue: parsed.data.venue,
      starts_at: startsAt,
      duration_minutes: durationMinutes,
      capacity,
      is_official: isOfficial,
      draw_image_url: drawImageUrl,
    })
    .select()
    .single()

  if (insertError) return { success: false, error: insertError.message }

  revalidatePath('/events')
  revalidatePath('/sessions')

  return { success: true, data: insertedEvent }
}

// EVNT-03: RSVP to an event (confirmed or waitlisted based on capacity)
export async function rsvpEvent(eventId: string): Promise<EventRsvpActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  const communityId = claims.community_id
  if (!communityId) return { success: false, error: 'No community associated with your account' }

  // T-04-06: member_id derived from auth.uid() lookup, not from client input
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  // Fetch event to check capacity and cancelled status
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, capacity, cancelled_at, community_id')
    .eq('id', eventId)
    .single()

  if (eventError || !event) return { success: false, error: 'Event not found' }
  if (event.cancelled_at !== null) return { success: false, error: 'This event has been cancelled' }

  let rsvpType: 'confirmed' | 'waitlisted'
  let waitlistPosition: number | null = null

  if (event.capacity !== null) {
    // Count confirmed RSVPs
    const { count: confirmedCount, error: confirmedError } = await supabase
      .from('event_rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('rsvp_type', 'confirmed')
      .is('cancelled_at', null)

    if (confirmedError) return { success: false, error: confirmedError.message }

    if ((confirmedCount ?? 0) >= event.capacity) {
      // Count waitlisted RSVPs for position
      const { count: waitlistCount, error: waitlistError } = await supabase
        .from('event_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('rsvp_type', 'waitlisted')
        .is('cancelled_at', null)

      if (waitlistError) return { success: false, error: waitlistError.message }

      rsvpType = 'waitlisted'
      waitlistPosition = (waitlistCount ?? 0) + 1
    } else {
      rsvpType = 'confirmed'
    }
  } else {
    // No capacity limit
    rsvpType = 'confirmed'
  }

  const { error: insertError } = await supabase
    .from('event_rsvps')
    .insert({
      event_id: eventId,
      member_id: member.id,
      community_id: communityId,
      rsvp_type: rsvpType,
      waitlist_position: waitlistPosition,
    })

  if (insertError) {
    // Handle unique constraint (already RSVP'd)
    if (
      insertError.code === '23505' ||
      insertError.message.includes('unique') ||
      insertError.message.includes('duplicate')
    ) {
      return { success: false, error: "You have already RSVP'd to this event" }
    }
    return { success: false, error: insertError.message }
  }

  revalidatePath('/events')
  revalidatePath('/sessions')

  return { success: true, rsvpType }
}

// EVNT-04: Cancel own RSVP for an event
export async function cancelEventRsvp(eventId: string): Promise<EventRsvpActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // T-04-06: member_id derived from auth.uid() lookup
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  const { error: cancelError } = await supabase
    .from('event_rsvps')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('member_id', member.id)
    .is('cancelled_at', null)

  if (cancelError) return { success: false, error: cancelError.message }

  revalidatePath('/events')
  revalidatePath('/sessions')

  return { success: true }
}

// EVNT-05: Delete an event (creator or admin only)
export async function deleteEvent(eventId: string): Promise<EventActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)

  // T-04-08: Server action verifies user is event creator or admin before deletion
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  // Fetch event to verify ownership
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, created_by')
    .eq('id', eventId)
    .single()

  if (eventError || !event) return { success: false, error: 'Event not found' }

  if (event.created_by !== member.id && claims.user_role !== 'admin') {
    return { success: false, error: 'You can only delete your own events' }
  }

  const { error: deleteError } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (deleteError) return { success: false, error: deleteError.message }

  revalidatePath('/events')

  return { success: true }
}
