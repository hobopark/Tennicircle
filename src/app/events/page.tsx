import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { EventsPageClient } from '@/components/events/EventsPageClient'
import type { EventWithRsvpStatus, EventRsvp } from '@/lib/types/events'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <>
        <AppNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Please sign in to view events.</p>
        </div>
      </>
    )
  }

  const claims = await getJWTClaims(supabase)
  const communityId = claims.community_id ?? ''
  const userRole = claims.user_role ?? 'client'

  // Get member record
  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return (
      <>
        <AppNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Member record not found.</p>
        </div>
      </>
    )
  }

  // Fetch all events for the community
  const { data: events } = await supabase
    .from('events')
    .select('*, creator:community_members!created_by(display_name, avatar_url)')
    .is('cancelled_at', null)
    .order('starts_at', { ascending: true })

  const eventIds = events?.map((e: { id: string }) => e.id) ?? []

  // Fetch user's RSVPs
  const { data: userRsvps } = eventIds.length > 0
    ? await supabase
        .from('event_rsvps')
        .select('*')
        .in('event_id', eventIds)
        .eq('member_id', member.id)
        .is('cancelled_at', null)
    : { data: [] }

  // Fetch all confirmed RSVPs for count (bulk fetch, count in JS)
  const { data: allRsvps } = eventIds.length > 0
    ? await supabase
        .from('event_rsvps')
        .select('event_id, rsvp_type')
        .in('event_id', eventIds)
        .eq('rsvp_type', 'confirmed')
        .is('cancelled_at', null)
    : { data: [] }

  // Build maps
  const userRsvpMap = new Map<string, EventRsvp>()
  for (const rsvp of (userRsvps ?? [])) {
    userRsvpMap.set(rsvp.event_id, rsvp as EventRsvp)
  }

  const rsvpCountMap = new Map<string, number>()
  for (const rsvp of (allRsvps ?? [])) {
    const cur = rsvpCountMap.get(rsvp.event_id) ?? 0
    rsvpCountMap.set(rsvp.event_id, cur + 1)
  }

  // Merge events with RSVP data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventsWithStatus: EventWithRsvpStatus[] = (events ?? []).map((e: any) => ({
    ...e,
    rsvp_count: rsvpCountMap.get(e.id) ?? 0,
    user_rsvp: userRsvpMap.get(e.id) ?? null,
  }))

  // Split by is_official
  const officialEvents = eventsWithStatus.filter(e => e.is_official)
  const communityEvents = eventsWithStatus.filter(e => !e.is_official)

  // Fetch announcements
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*, author:community_members!created_by(display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
          <EventsPageClient
            officialEvents={officialEvents}
            communityEvents={communityEvents}
            announcements={announcements ?? []}
            userRole={userRole}
            communityId={communityId}
          />
        </div>
      </div>
    </>
  )
}
