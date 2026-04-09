import { createClient, getUserRole } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { EventsPageClient } from '@/components/events/EventsPageClient'
import type { EventWithRsvpStatus, EventRsvp, RawEventRow, RawAnnouncementRow } from '@/lib/types/events'

export const dynamic = 'force-dynamic'

export default async function EventsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
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

  const { data: community } = await supabase
    .from('communities')
    .select('id')
    .eq('slug', slug)
    .single()
  if (!community) {
    return (
      <>
        <AppNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Community not found.</p>
        </div>
      </>
    )
  }

  const communityId = community.id
  const membership = await getUserRole(supabase, communityId)
  if (!membership) {
    return (
      <>
        <AppNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Member record not found.</p>
        </div>
      </>
    )
  }

  const { role, memberId } = membership
  const userRole = role

  // Fetch all events for the community
  const { data: events } = await supabase
    .from('events')
    .select('*, creator:community_members!created_by(display_name)')
    .eq('community_id', communityId)
    .is('cancelled_at', null)
    .order('starts_at', { ascending: true })

  const eventIds = events?.map((e: { id: string }) => e.id) ?? []

  // Fetch user's RSVPs
  const { data: userRsvps } = eventIds.length > 0
    ? await supabase
        .from('event_rsvps')
        .select('*')
        .in('event_id', eventIds)
        .eq('member_id', memberId)
        .is('cancelled_at', null)
    : { data: [] }

  // Fetch all confirmed RSVPs for count
  const { data: allRsvps } = eventIds.length > 0
    ? await supabase
        .from('event_rsvps')
        .select('event_id, rsvp_type')
        .in('event_id', eventIds)
        .eq('rsvp_type', 'confirmed')
        .is('cancelled_at', null)
    : { data: [] }

  const userRsvpMap = new Map<string, EventRsvp>()
  for (const rsvp of (userRsvps ?? [])) {
    userRsvpMap.set(rsvp.event_id, rsvp as EventRsvp)
  }

  const rsvpCountMap = new Map<string, number>()
  for (const rsvp of (allRsvps ?? [])) {
    const cur = rsvpCountMap.get(rsvp.event_id) ?? 0
    rsvpCountMap.set(rsvp.event_id, cur + 1)
  }

  const eventsWithStatus: EventWithRsvpStatus[] = (events ?? []).map((e: RawEventRow) => ({
    ...e,
    rsvp_count: rsvpCountMap.get(e.id) ?? 0,
    user_rsvp: userRsvpMap.get(e.id) ?? null,
  }))

  const now = new Date().toISOString()
  const officialEvents = eventsWithStatus.filter(e => e.is_official && e.starts_at >= now)
  const communityEvents = eventsWithStatus.filter(e => !e.is_official && e.starts_at >= now)
  const pastOfficialEvents = eventsWithStatus.filter(e => e.is_official && e.starts_at < now).reverse()
  const pastCommunityEvents = eventsWithStatus.filter(e => !e.is_official && e.starts_at < now).reverse()

  // Fetch announcements
  const { data: rawAnnouncements } = await supabase
    .from('announcements')
    .select('*, author:community_members!created_by(display_name, user_id)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(10)

  const annAuthorUserIds = (rawAnnouncements ?? []).map((a: RawAnnouncementRow) => a.author?.user_id).filter(Boolean)
  const { data: annAuthorProfiles } = annAuthorUserIds.length > 0
    ? await supabase.from('player_profiles').select('user_id, display_name').in('user_id', annAuthorUserIds)
    : { data: [] }
  const annProfileMap = new Map((annAuthorProfiles ?? []).map(p => [p.user_id, p.display_name]))

  const announcements = (rawAnnouncements ?? []).map((a: RawAnnouncementRow) => ({
    ...a,
    author: {
      ...a.author,
      display_name: annProfileMap.get(a.author?.user_id) ?? a.author?.display_name ?? null,
    },
  }))

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
          <EventsPageClient
            officialEvents={officialEvents}
            communityEvents={communityEvents}
            pastOfficialEvents={pastOfficialEvents}
            pastCommunityEvents={pastCommunityEvents}
            announcements={announcements ?? []}
            userRole={userRole}
            communityId={communityId}
          />
        </div>
      </div>
    </>
  )
}
