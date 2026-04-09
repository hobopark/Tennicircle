'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUserRole } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { CreateEventSchema } from '@/lib/validations/events'
import type { EventActionResult, EventRsvpActionResult } from '@/lib/types/events'

/**
 * Convert a date + time (user input in Sydney local time) to a UTC ISO string.
 * Works correctly regardless of server timezone (localhost, Vercel, etc).
 */
function toSydneyIso(dateStr: string, timeStr: string): string {
  // Use Intl to get the UTC offset for Sydney on the target date
  // by comparing formatted parts in UTC vs Sydney
  const refDate = new Date(`${dateStr}T12:00:00Z`)
  const utcParts = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hour: 'numeric', hour12: false, day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(refDate)
  const sydParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Australia/Sydney', hour: 'numeric', hour12: false, day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(refDate)

  const utcHour = Number(utcParts.find(p => p.type === 'hour')?.value ?? 0)
  const utcDay = Number(utcParts.find(p => p.type === 'day')?.value ?? 0)
  const sydHour = Number(sydParts.find(p => p.type === 'hour')?.value ?? 0)
  const sydDay = Number(sydParts.find(p => p.type === 'day')?.value ?? 0)

  const offsetHours = (sydDay - utcDay) * 24 + (sydHour - utcHour)
  const sign = offsetHours >= 0 ? '+' : '-'
  const offset = `${sign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`

  return new Date(`${dateStr}T${timeStr}${offset}`).toISOString()
}

// EVNT-01: Create a community event
export async function createEvent(
  communityId: string,
  communitySlug: string,
  _prevState: EventActionResult,
  formData: FormData
): Promise<EventActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }

  // Get member record
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  // Parse and validate form data
  const parsed = CreateEventSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  // T-04-02: is_official is derived from server-side role — NEVER from formData
  const isOfficial = membership.role === 'coach' || membership.role === 'admin'

  // Combine date + time into ISO string (Sydney timezone-aware)
  const startsAt = toSydneyIso(parsed.data.starts_at_date, parsed.data.starts_at_time)

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

  revalidatePath(`/c/${communitySlug}/events`)
  revalidatePath(`/c/${communitySlug}/sessions`)

  return { success: true, data: insertedEvent }
}

// EVNT-03: RSVP to an event (confirmed or waitlisted based on capacity)
export async function rsvpEvent(
  communityId: string,
  communitySlug: string,
  eventId: string
): Promise<EventRsvpActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }

  // T-04-06: member_id derived from auth.uid() lookup, not from client input
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  // Fetch event to check capacity and cancelled status
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, capacity, cancelled_at, community_id, title, starts_at')
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

  // NOTF-03: Notify member of event RSVP confirmation (fire-and-forget)
  if (rsvpType === 'confirmed') {
    const serviceClient = createServiceClient()
    const { formatDateTime } = await import('@/lib/utils/dates')
    serviceClient.from('notifications').insert({
      community_id: communityId,
      member_id: member.id,
      notification_type: 'rsvp_confirmed' as const,
      title: "You're confirmed",
      body: `You're confirmed for ${event.title ?? 'the event'} on ${formatDateTime(event.starts_at)}`,
      metadata: { resource_type: 'event' as const, resource_id: eventId },
    }).then(() => {})
  }

  revalidatePath(`/c/${communitySlug}/events`)
  revalidatePath(`/c/${communitySlug}/sessions`)

  return { success: true, rsvpType }
}

// EVNT-04: Cancel own RSVP for an event
export async function cancelEventRsvp(
  communityId: string,
  communitySlug: string,
  eventId: string
): Promise<EventRsvpActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }

  // T-04-06: member_id derived from auth.uid() lookup
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  // Get the active RSVP to determine its type before cancelling
  const { data: existingRsvp, error: rsvpFetchError } = await supabase
    .from('event_rsvps')
    .select('id, rsvp_type, member_id')
    .eq('event_id', eventId)
    .eq('member_id', member.id)
    .is('cancelled_at', null)
    .maybeSingle()

  if (rsvpFetchError) return { success: false, error: rsvpFetchError.message }
  if (!existingRsvp) return { success: false, error: 'No active RSVP found for this event' }

  const { error: cancelError } = await supabase
    .from('event_rsvps')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', existingRsvp.id)

  if (cancelError) return { success: false, error: cancelError.message }

  // If a confirmed spot was freed, promote the first waitlisted member
  if (existingRsvp.rsvp_type === 'confirmed') {
    const { data: nextWaitlisted } = await supabase
      .from('event_rsvps')
      .select('id, member_id')
      .eq('event_id', eventId)
      .eq('rsvp_type', 'waitlisted')
      .is('cancelled_at', null)
      .order('waitlist_position', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextWaitlisted) {
      await supabase
        .from('event_rsvps')
        .update({ rsvp_type: 'confirmed', waitlist_position: null })
        .eq('id', nextWaitlisted.id)

      // NOTF-03: Notify promoted member (fire-and-forget)
      const { data: eventInfo } = await supabase
        .from('events')
        .select('title, starts_at')
        .eq('id', eventId)
        .single()

      if (eventInfo) {
        const serviceClient = createServiceClient()
        const { formatDateTime } = await import('@/lib/utils/dates')
        serviceClient.from('notifications').insert({
          community_id: communityId,
          member_id: nextWaitlisted.member_id,
          notification_type: 'waitlist_promoted' as const,
          title: "You've been moved off the waitlist",
          body: `You've been moved off the waitlist for ${eventInfo.title} on ${formatDateTime(eventInfo.starts_at)}`,
          metadata: { resource_type: 'event' as const, resource_id: eventId },
        }).then(() => {})
      }
    }
  }

  // Notify event creator about the RSVP cancellation (fire-and-forget)
  {
    const { data: eventInfo } = await supabase
      .from('events')
      .select('title, starts_at, created_by, community_id')
      .eq('id', eventId)
      .single()

    // Resolve member display name: community_members → player_profiles → fallback
    const { data: memberRec } = await supabase
      .from('community_members')
      .select('display_name, user_id')
      .eq('id', member.id)
      .single()

    let memberName = memberRec?.display_name || ''
    if (!memberName && memberRec?.user_id) {
      const { data: profile } = await supabase
        .from('player_profiles')
        .select('display_name')
        .eq('user_id', memberRec.user_id)
        .maybeSingle()
      memberName = profile?.display_name || ''
    }
    if (!memberName) memberName = 'A member'

    if (eventInfo && eventInfo.created_by !== member.id) {
      const serviceClient = createServiceClient()
      const { formatDateTime } = await import('@/lib/utils/dates')
      serviceClient.from('notifications').insert({
        community_id: eventInfo.community_id,
        member_id: eventInfo.created_by,
        notification_type: 'rsvp_cancelled' as const,
        title: 'RSVP cancelled',
        body: `${memberName} cancelled their RSVP for ${eventInfo.title} on ${formatDateTime(eventInfo.starts_at)}`,
        metadata: { resource_type: 'event' as const, resource_id: eventId },
      }).then(() => {})
    }
  }

  revalidatePath(`/c/${communitySlug}/events`)
  revalidatePath(`/c/${communitySlug}/sessions`)

  return { success: true }
}

// Update an existing event (creator or admin only)
export async function updateEvent(
  communityId: string,
  communitySlug: string,
  eventId: string,
  _prevState: EventActionResult,
  formData: FormData
): Promise<EventActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }

  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  // Verify ownership
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, created_by')
    .eq('id', eventId)
    .single()

  if (eventError || !event) return { success: false, error: 'Event not found' }
  if (event.created_by !== member.id && membership.role !== 'admin') {
    return { success: false, error: 'You can only edit your own events' }
  }

  const parsed = CreateEventSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  // Combine date + time into ISO string (Sydney timezone-aware)
  const startsAt = toSydneyIso(parsed.data.starts_at_date, parsed.data.starts_at_time)

  const durationMinutes = parsed.data.duration_minutes && parsed.data.duration_minutes > 0
    ? parsed.data.duration_minutes : null
  const capacity = parsed.data.capacity && parsed.data.capacity > 0
    ? parsed.data.capacity : null

  const drawImageUrl = formData.get('draw_image_url')?.toString() || null

  const { data: updated, error: updateError } = await supabase
    .from('events')
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      venue: parsed.data.venue,
      starts_at: startsAt,
      duration_minutes: durationMinutes,
      capacity,
      draw_image_url: drawImageUrl,
    })
    .eq('id', eventId)
    .select()
    .single()

  if (updateError) return { success: false, error: updateError.message }

  // Notify RSVP'd members about event update (fire-and-forget)
  {
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('member_id')
      .eq('event_id', eventId)
      .is('cancelled_at', null)

    if (rsvps && rsvps.length > 0) {
      const serviceClient = createServiceClient()
      const { formatDateTime } = await import('@/lib/utils/dates')
      const notificationRows = rsvps.map(r => ({
        community_id: communityId,
        member_id: r.member_id,
        notification_type: 'event_updated' as const,
        title: 'Event updated',
        body: `${parsed.data.title} on ${formatDateTime(startsAt)} has been updated`,
        metadata: { resource_type: 'event' as const, resource_id: eventId },
      }))
      serviceClient.from('notifications').insert(notificationRows).then(() => {})
    }
  }

  revalidatePath(`/c/${communitySlug}/events`)
  revalidatePath(`/c/${communitySlug}/events/${eventId}`)

  return { success: true, data: updated }
}

// EVNT-05: Delete an event (creator or admin only)
export async function deleteEvent(
  communityId: string,
  communitySlug: string,
  eventId: string
): Promise<EventActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }

  // T-04-08: Server action verifies user is event creator or admin before deletion
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  // Fetch event to verify ownership
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, created_by')
    .eq('id', eventId)
    .single()

  if (eventError || !event) return { success: false, error: 'Event not found' }

  if (event.created_by !== member.id && membership.role !== 'admin' && membership.role !== 'coach') {
    return { success: false, error: 'You can only delete your own events' }
  }

  const { error: deleteError } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (deleteError) return { success: false, error: deleteError.message }

  revalidatePath(`/c/${communitySlug}/events`)

  return { success: true }
}
