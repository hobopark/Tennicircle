import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { WeekCalendarGrid } from '@/components/calendar/WeekCalendarGrid'
import { AppNav } from '@/components/nav/AppNav'
import { AnnouncementCard } from '@/components/events/AnnouncementCard'

export default async function CoachPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const claims = await getJWTClaims(supabase)
  const communityId = claims.community_id

  // Get member ID and display_name for this coach
  const { data: member } = await supabase
    .from('community_members')
    .select('id, display_name')
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

  // Two-query strategy: template-owned sessions + co-coached sessions (merged in JS)
  // Query 1: Sessions from templates this coach owns
  const { data: templateIds } = await supabase
    .from('session_templates')
    .select('id')
    .eq('coach_id', member.id)

  const { data: ownedSessions } = templateIds && templateIds.length > 0
    ? await supabase
        .from('sessions')
        .select('*, session_rsvps(count), session_templates(title)')
        .in('template_id', templateIds.map(t => t.id))
        .order('scheduled_at', { ascending: true })
    : { data: [] }

  // Query 2: Sessions where this coach is a co-coach via session_coaches
  const { data: coCoachSessionIds } = await supabase
    .from('session_coaches')
    .select('session_id')
    .eq('member_id', member.id)

  const coCoachIds = coCoachSessionIds?.map(sc => sc.session_id) ?? []
  const { data: coCoachedSessions } = coCoachIds.length > 0
    ? await supabase
        .from('sessions')
        .select('*, session_rsvps(count), session_templates(title)')
        .in('id', coCoachIds)
        .order('scheduled_at', { ascending: true })
    : { data: [] }

  // Merge and deduplicate by session id
  const sessionMap = new Map<string, Record<string, unknown>>()
  for (const s of [...(ownedSessions ?? []), ...(coCoachedSessions ?? [])]) {
    if (!sessionMap.has(s.id)) sessionMap.set(s.id, s)
  }
  const sessions = Array.from(sessionMap.values()).sort(
    (a, b) => new Date(a.scheduled_at as string).getTime() - new Date(b.scheduled_at as string).getTime()
  )

  // Fetch attendee previews for all sessions (Query 3: session_rsvps with member join)
  const sessionIds = sessions.map(s => s.id as string)
  const attendeeDataMap: Record<string, {
    confirmedCount: number
    capacity: number | null
    attendeePreview: Array<{ display_name: string | null; avatar_url: string | null }>
  }> = {}

  if (sessionIds.length > 0) {
    const { data: attendees } = await supabase
      .from('session_rsvps')
      .select('session_id, rsvp_type, member:community_members(display_name)')
      .in('session_id', sessionIds)
      .eq('rsvp_type', 'confirmed')
      .is('cancelled_at', null)
      .order('created_at', { ascending: true })

    // Group attendees by session_id and compute confirmedCount + attendeePreview
    for (const session of sessions) {
      const id = session.id as string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessionAttendees = (attendees ?? []).filter((a: any) => a.session_id === id)
      const confirmedCount = sessionAttendees.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attendeePreview = sessionAttendees.slice(0, 5).map((a: any) => ({
        display_name: a.member?.display_name ?? null,
        avatar_url: null,
      }))

      attendeeDataMap[id] = {
        confirmedCount,
        capacity: (session.capacity as number) ?? null,
        attendeePreview,
      }
    }
  }

  // Coach dashboard stats
  const coachName = member.display_name ?? user.email?.split('@')[0] ?? 'Coach'
  const firstName = coachName.split(' ')[0]

  // Count total players (clients with profiles in the community)
  const { count: playerCount } = communityId
    ? await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .in('role', ['client', 'member'])
    : { count: 0 }

  // Sessions this month
  const currentMonthStart = new Date()
  currentMonthStart.setDate(1)
  currentMonthStart.setHours(0, 0, 0, 0)
  const nextMonthStart = new Date(currentMonthStart)
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1)

  const sessionsThisMonth = sessions.filter(s => {
    const d = new Date(s.scheduled_at as string)
    return d >= currentMonthStart && d < nextMonthStart
  }).length

  // Upcoming events count
  const now = new Date().toISOString()
  const { count: upcomingEventCount } = communityId
    ? await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .is('cancelled_at', null)
        .gte('starts_at', now)
    : { count: 0 }

  // Fetch latest announcements
  const { data: announcements } = communityId
    ? await supabase
        .from('announcements')
        .select('*, author:community_members!created_by(display_name)')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(3)
    : { data: [] }

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-5 pt-14 pb-24">
          {/* Greeting */}
          <p className="text-sm text-muted-foreground">G&apos;day, {firstName}</p>
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-heading font-bold text-2xl text-foreground">Coach Dashboard</h1>
            <Link
              href="/coach/sessions/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Create session
            </Link>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-primary/10 rounded-2xl border border-primary/20 p-4 text-center">
              <p className="font-heading font-bold text-2xl text-primary">{sessionsThisMonth}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sessions this month</p>
            </div>
            <div className="bg-emerald-500/10 rounded-2xl border border-emerald-500/20 p-4 text-center">
              <p className="font-heading font-bold text-2xl text-emerald-600 dark:text-emerald-400">{playerCount ?? 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total players</p>
            </div>
            <div className="bg-amber-500/10 rounded-2xl border border-amber-500/20 p-4 text-center">
              <p className="font-heading font-bold text-2xl text-amber-600 dark:text-amber-400">{upcomingEventCount ?? 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Upcoming events</p>
            </div>
          </div>

          {/* Schedule */}
          <h2 className="font-heading font-bold text-base mb-3">Schedule</h2>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <WeekCalendarGrid sessions={sessions as any} attendeeData={attendeeDataMap} />

          {/* Announcements */}
          {(announcements ?? []).length > 0 && (
            <div className="mt-6">
              <h2 className="font-heading font-bold text-base mb-3">Announcements</h2>
              <div className="flex flex-col gap-3">
                {(announcements ?? []).map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    canEdit={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
