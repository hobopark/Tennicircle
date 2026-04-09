import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, ChevronLeft } from 'lucide-react'
import { createClient, getUserRole } from '@/lib/supabase/server'
import { WeekCalendarGrid } from '@/components/calendar/WeekCalendarGrid'
import { AppNav } from '@/components/nav/AppNav'
import type { SessionWithTemplate, RsvpWithMember } from '@/lib/types/sessions'

export default async function CoachSchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: community } = await supabase
    .from('communities')
    .select('id')
    .eq('slug', slug)
    .single()
  if (!community) redirect('/communities')

  const membership = await getUserRole(supabase, community.id)
  if (!membership) redirect('/communities')
  const { role, memberId } = membership

  if (role !== 'coach' && role !== 'admin') redirect(`/c/${slug}/sessions`)

  // Template-owned sessions
  const { data: templateIds } = await supabase
    .from('session_templates')
    .select('id')
    .eq('coach_id', memberId)

  const { data: ownedSessions } = templateIds && templateIds.length > 0
    ? await supabase
        .from('sessions')
        .select('*, session_rsvps(count), session_templates(title)')
        .in('template_id', templateIds.map(t => t.id))
        .order('scheduled_at', { ascending: true })
    : { data: [] }

  // Co-coached sessions
  const { data: coCoachSessionIds } = await supabase
    .from('session_coaches')
    .select('session_id')
    .eq('member_id', memberId)

  const coCoachIds = coCoachSessionIds?.map(sc => sc.session_id) ?? []
  const { data: coCoachedSessions } = coCoachIds.length > 0
    ? await supabase
        .from('sessions')
        .select('*, session_rsvps(count), session_templates(title)')
        .in('id', coCoachIds)
        .order('scheduled_at', { ascending: true })
    : { data: [] }

  // Merge and deduplicate
  const sessionMap = new Map<string, SessionWithTemplate>()
  for (const s of [...(ownedSessions ?? []), ...(coCoachedSessions ?? [])] as SessionWithTemplate[]) {
    if (!sessionMap.has(s.id)) sessionMap.set(s.id, s)
  }
  const sessions = Array.from(sessionMap.values()).sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )

  // Attendee previews
  const sessionIds = sessions.map(s => s.id)
  const attendeeDataMap: Record<string, {
    confirmedCount: number
    capacity: number | null
    attendeePreview: Array<{ display_name: string | null; avatar_url: string | null }>
  }> = {}

  if (sessionIds.length > 0) {
    const { data: rawAttendees } = await supabase
      .from('session_rsvps')
      .select('session_id, rsvp_type, member:community_members(display_name, user_id)')
      .in('session_id', sessionIds)
      .eq('rsvp_type', 'confirmed')
      .is('cancelled_at', null)
      .order('created_at', { ascending: true })
    const attendees = (rawAttendees ?? []) as unknown as RsvpWithMember[]

    const attendeeUserIds = [...new Set(attendees.map(a => a.member?.user_id).filter(Boolean))]
    const { data: profiles } = attendeeUserIds.length > 0
      ? await supabase
          .from('player_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', attendeeUserIds)
      : { data: [] }

    const profileByUserId = new Map(
      (profiles ?? []).map(p => [p.user_id, p])
    )

    for (const session of sessions) {
      const id = session.id
      const sessionAttendees = attendees.filter(a => a.session_id === id)
      const attendeePreview = sessionAttendees.slice(0, 5).map(a => {
        const profile = profileByUserId.get(a.member?.user_id)
        return {
          display_name: profile?.display_name ?? a.member?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        }
      })

      attendeeDataMap[id] = {
        confirmedCount: sessionAttendees.length,
        capacity: session.capacity ?? null,
        attendeePreview,
      }
    }
  }

  // Fetch events the coach is attending
  const { data: myEventRsvps } = await supabase
    .from('event_rsvps')
    .select('event_id')
    .eq('member_id', memberId)
    .eq('rsvp_type', 'confirmed')
    .is('cancelled_at', null)

  const myEventIds = (myEventRsvps ?? []).map(r => r.event_id)
  const { data: myEvents } = myEventIds.length > 0
    ? await supabase
        .from('events')
        .select('id, title, starts_at, duration_minutes, venue, event_type')
        .in('id', myEventIds)
        .is('cancelled_at', null)
    : { data: [] }

  const calendarEvents = (myEvents ?? []).map(e => ({
    id: e.id,
    title: e.title,
    starts_at: e.starts_at,
    duration_minutes: e.duration_minutes,
    venue: e.venue,
    event_type: e.event_type,
  }))

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-5 pt-14 pb-24">
          <Link
            href={`/c/${slug}/coach`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-heading font-bold text-2xl text-foreground">Schedule</h1>
            <Link
              href={`/c/${slug}/coach/sessions/new`}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Create session
            </Link>
          </div>
          <WeekCalendarGrid sessions={sessions} attendeeData={attendeeDataMap} events={calendarEvents} />
        </div>
      </div>
    </>
  )
}
