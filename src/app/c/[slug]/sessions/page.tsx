import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { ClientDashboard } from '@/components/dashboard/ClientDashboard'
import type { EventWithRsvpStatus, EventRsvp, RawEventRow, RawAnnouncementRow } from '@/lib/types/events'
import type { SessionWithTemplate } from '@/lib/types/sessions'

export const dynamic = 'force-dynamic'

export default async function SessionsPage({
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
          <p className="text-muted-foreground">Please sign in to view your dashboard.</p>
        </div>
      </>
    )
  }

  // Resolve community by slug
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

  const { data: member } = await supabase
    .from('community_members')
    .select('id, joined_at, role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle()

  const userRole = member?.role ?? 'client'

  if (!member) {
    const fallbackName = user.email?.split('@')[0] ?? 'Member'
    return (
      <>
        <AppNav />
        <div className="min-h-screen bg-background">
          <ClientDashboard
            firstName={fallbackName}
            displayName={fallbackName}
            stats={{ sessionsThisMonth: 0, upcomingRsvps: 0, memberSince: 'Just joined' }}
            upcomingSessions={[]}
            upcomingEvents={[]}
            announcements={[]}
            userRole={userRole}
          />
        </div>
      </>
    )
  }

  // Fetch profile for display_name / first name
  // Prefer community-specific profile, fall back to global (community_id = NULL)
  const { data: profiles } = await supabase
    .from('player_profiles')
    .select('display_name, community_id')
    .eq('user_id', user.id)
    .order('community_id', { ascending: true, nullsFirst: false })
    .limit(2)

  const profile = profiles?.find(p => p.community_id === community.id)
    ?? profiles?.[0]
    ?? null

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Member'
  const firstName = displayName.split(' ')[0]

  const now = new Date().toISOString()

  // Fetch upcoming confirmed session RSVPs for this member (next 5)
  const { data: upcomingRsvpRows } = await supabase
    .from('session_rsvps')
    .select('rsvp_type, session_id')
    .eq('member_id', member.id)
    .is('cancelled_at', null)
    .eq('rsvp_type', 'confirmed')
    .limit(20)

  const upcomingSessionIds = (upcomingRsvpRows ?? []).map((r: { session_id: string }) => r.session_id)

  const { data: rawSessionRows } = upcomingSessionIds.length > 0
    ? await supabase
        .from('sessions')
        .select('id, scheduled_at, duration_minutes, venue, capacity, session_templates(title, coach:community_members!coach_id(user_id))')
        .in('id', upcomingSessionIds)
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(5)
    : { data: [] }
  const allSessionRows = (rawSessionRows ?? []) as unknown as SessionWithTemplate[]

  // Resolve coach names from player_profiles
  const coachUserIds = [...new Set(allSessionRows.map(s => (s.session_templates as { coach?: { user_id?: string } })?.coach?.user_id).filter(Boolean))] as string[]
  const { data: coachProfiles } = coachUserIds.length > 0
    ? await supabase.from('player_profiles').select('user_id, display_name').in('user_id', coachUserIds)
    : { data: [] }
  const coachNameMap = new Map((coachProfiles ?? []).map(p => [p.user_id, p.display_name]))

  const rsvpTypeMap = new Map<string, string>()
  for (const r of (upcomingRsvpRows ?? [])) {
    rsvpTypeMap.set(r.session_id, r.rsvp_type)
  }

  const upcomingSessions = allSessionRows.map(s => {
    const coachUserId = (s.session_templates as { coach?: { user_id?: string } })?.coach?.user_id
    return {
      id: s.id,
      title: s.session_templates?.title ?? null,
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes,
      venue: s.venue,
      capacity: s.capacity,
      rsvp_type: rsvpTypeMap.get(s.id) ?? 'confirmed',
      template_title: s.session_templates?.title ?? null,
      coach_name: coachUserId ? coachNameMap.get(coachUserId) ?? null : null,
    }
  })

  // Compute stats
  const currentMonthStart = new Date()
  currentMonthStart.setDate(1)
  currentMonthStart.setHours(0, 0, 0, 0)
  const nextMonthStart = new Date(currentMonthStart)
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1)

  const { data: thisMonthRsvps } = await supabase
    .from('session_rsvps')
    .select('session_id')
    .eq('member_id', member.id)
    .is('cancelled_at', null)
    .eq('rsvp_type', 'confirmed')

  const thisMonthRsvpIds = (thisMonthRsvps ?? []).map((r: { session_id: string }) => r.session_id)
  let sessionsThisMonth = 0
  if (thisMonthRsvpIds.length > 0) {
    const { data: monthSessions } = await supabase
      .from('sessions')
      .select('id')
      .in('id', thisMonthRsvpIds)
      .gte('scheduled_at', currentMonthStart.toISOString())
      .lt('scheduled_at', nextMonthStart.toISOString())
    sessionsThisMonth = (monthSessions ?? []).length
  }

  const memberSinceDate = new Date(member.joined_at ?? new Date().toISOString())
  const memberSince = memberSinceDate.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', month: 'short', year: 'numeric' })

  // Fetch events the user is confirmed for (exclude waitlisted from dashboard)
  const { data: myEventRsvps } = await supabase
    .from('event_rsvps')
    .select('event_id, rsvp_type, id, community_id, member_id, waitlist_position, cancelled_at, created_at')
    .eq('member_id', member.id)
    .eq('rsvp_type', 'confirmed')
    .is('cancelled_at', null)

  const myEventIds = (myEventRsvps ?? []).map(r => r.event_id)

  const { data: events } = myEventIds.length > 0
    ? await supabase
        .from('events')
        .select('*, creator:community_members!created_by(display_name)')
        .in('id', myEventIds)
        .is('cancelled_at', null)
        .gte('starts_at', now)
        .order('starts_at', { ascending: true })
        .limit(5)
    : { data: [] }

  const eventIds = (events ?? []).map((e: { id: string }) => e.id)

  const { data: allEventRsvps } = eventIds.length > 0
    ? await supabase
        .from('event_rsvps')
        .select('event_id, rsvp_type')
        .in('event_id', eventIds)
        .eq('rsvp_type', 'confirmed')
        .is('cancelled_at', null)
    : { data: [] }

  const userEventRsvpMap = new Map<string, EventRsvp>()
  for (const rsvp of (myEventRsvps ?? [])) {
    userEventRsvpMap.set(rsvp.event_id, rsvp as EventRsvp)
  }

  const eventRsvpCountMap = new Map<string, number>()
  for (const rsvp of (allEventRsvps ?? [])) {
    const cur = eventRsvpCountMap.get(rsvp.event_id) ?? 0
    eventRsvpCountMap.set(rsvp.event_id, cur + 1)
  }

  const upcomingEvents: EventWithRsvpStatus[] = (events ?? []).map((e: RawEventRow) => ({
    ...e,
    rsvp_count: eventRsvpCountMap.get(e.id) ?? 0,
    user_rsvp: userEventRsvpMap.get(e.id) ?? null,
  }))

  // Fetch latest 2 announcements
  const { data: rawAnnouncements } = await supabase
    .from('announcements')
    .select('*, author:community_members!created_by(display_name, user_id)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(2)

  const annUserIds = (rawAnnouncements ?? []).map((a: RawAnnouncementRow) => a.author?.user_id).filter(Boolean)
  const { data: annProfiles } = annUserIds.length > 0
    ? await supabase.from('player_profiles').select('user_id, display_name').in('user_id', annUserIds)
    : { data: [] }
  const annNameMap = new Map((annProfiles ?? []).map(p => [p.user_id, p.display_name]))
  const announcements = (rawAnnouncements ?? []).map((a: RawAnnouncementRow) => ({
    ...a,
    author: { ...a.author, display_name: annNameMap.get(a.author?.user_id) ?? a.author?.display_name ?? null },
  }))

  const upcomingSessionRsvpCount = upcomingSessions.length
  const upcomingEventRsvpCount = upcomingEvents.filter(e => e.user_rsvp && e.user_rsvp.cancelled_at === null).length

  const stats = {
    sessionsThisMonth,
    upcomingRsvps: upcomingSessionRsvpCount + upcomingEventRsvpCount,
    memberSince,
  }

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <ClientDashboard
          firstName={firstName}
          displayName={displayName}
          stats={stats}
          upcomingSessions={upcomingSessions}
          upcomingEvents={upcomingEvents}
          announcements={announcements ?? []}
          userRole={userRole}
        />
      </div>
    </>
  )
}
