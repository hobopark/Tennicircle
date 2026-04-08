import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { ClientDashboard } from '@/components/dashboard/ClientDashboard'
import type { EventWithRsvpStatus, EventRsvp } from '@/lib/types/events'

export default async function SessionsPage() {
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

  const claims = await getJWTClaims(supabase)
  const userRole = claims.user_role ?? 'client'

  // Get member record with joined_at for member-since stat
  const { data: member } = await supabase
    .from('community_members')
    .select('id, joined_at, created_at')
    .eq('user_id', user.id)
    .single()

  if (!member) {
    // No community member record yet — show a clean onboarding dashboard
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
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle()

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

  // Fetch those sessions, filter to future ones, sort, take 5
  const { data: allSessionRows } = upcomingSessionIds.length > 0
    ? await supabase
        .from('sessions')
        .select('id, title, scheduled_at, duration_minutes, venue, capacity, session_templates(title)')
        .in('id', upcomingSessionIds)
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(5)
    : { data: [] }

  // Build rsvp type map
  const rsvpTypeMap = new Map<string, string>()
  for (const r of (upcomingRsvpRows ?? [])) {
    rsvpTypeMap.set(r.session_id, r.rsvp_type)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingSessions = (allSessionRows ?? []).map((s: any) => ({
    id: s.id,
    title: s.title,
    scheduled_at: s.scheduled_at,
    duration_minutes: s.duration_minutes,
    venue: s.venue,
    capacity: s.capacity,
    rsvp_type: rsvpTypeMap.get(s.id) ?? 'confirmed',
    template_title: s.session_templates?.title ?? null,
  }))

  // Compute stats
  // Sessions this month: count confirmed RSVPs where session is in current month
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

  // Fetch sessions for those RSVPs to check month
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

  const memberSinceDate = new Date(member.joined_at ?? member.created_at)
  const memberSince = memberSinceDate.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })

  // Fetch upcoming events (next 5) — explicit community_id filter as RLS backup
  const communityId = claims.community_id
  const { data: events } = communityId
    ? await supabase
        .from('events')
        .select('*, creator:community_members!created_by(display_name, avatar_url)')
        .eq('community_id', communityId)
        .is('cancelled_at', null)
        .gte('starts_at', now)
        .order('starts_at', { ascending: true })
        .limit(5)
    : { data: [] }

  const eventIds = (events ?? []).map((e: { id: string }) => e.id)

  // Fetch user's RSVPs for upcoming events
  const { data: eventRsvps } = eventIds.length > 0
    ? await supabase
        .from('event_rsvps')
        .select('*')
        .in('event_id', eventIds)
        .eq('member_id', member.id)
        .is('cancelled_at', null)
    : { data: [] }

  // Fetch confirmed RSVP counts for events
  const { data: allEventRsvps } = eventIds.length > 0
    ? await supabase
        .from('event_rsvps')
        .select('event_id, rsvp_type')
        .in('event_id', eventIds)
        .eq('rsvp_type', 'confirmed')
        .is('cancelled_at', null)
    : { data: [] }

  const userEventRsvpMap = new Map<string, EventRsvp>()
  for (const rsvp of (eventRsvps ?? [])) {
    userEventRsvpMap.set(rsvp.event_id, rsvp as EventRsvp)
  }

  const eventRsvpCountMap = new Map<string, number>()
  for (const rsvp of (allEventRsvps ?? [])) {
    const cur = eventRsvpCountMap.get(rsvp.event_id) ?? 0
    eventRsvpCountMap.set(rsvp.event_id, cur + 1)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingEvents: EventWithRsvpStatus[] = (events ?? []).map((e: any) => ({
    ...e,
    rsvp_count: eventRsvpCountMap.get(e.id) ?? 0,
    user_rsvp: userEventRsvpMap.get(e.id) ?? null,
  }))

  // Fetch latest 2 announcements — explicit community_id filter
  const { data: announcements } = communityId
    ? await supabase
        .from('announcements')
        .select('*, author:community_members!created_by(display_name, avatar_url)')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(2)
    : { data: [] }

  const stats = {
    sessionsThisMonth,
    upcomingRsvps: upcomingSessions.length,
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
