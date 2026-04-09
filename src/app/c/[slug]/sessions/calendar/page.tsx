import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { WeekCalendarGrid } from '@/components/calendar/WeekCalendarGrid'

export default async function SessionsCalendarPage({
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
          <p className="text-muted-foreground">Please sign in to view the calendar.</p>
        </div>
      </>
    )
  }

  // Fetch sessions visible to this client (RLS + invitation filtering)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*, session_rsvps(count), session_templates(title, coach:community_members!coach_id(user_id))')
    .order('scheduled_at', { ascending: true })

  // Get member ID for RSVP lookup
  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Resolve coach names from player_profiles
  const coachUserIds = [...new Set(
    (sessions ?? [])
      .map((s) => (s as unknown as { session_templates?: { coach?: { user_id?: string } } }).session_templates?.coach?.user_id)
      .filter(Boolean)
  )] as string[]
  const { data: coachProfiles } = coachUserIds.length > 0
    ? await supabase.from('player_profiles').select('user_id, display_name').in('user_id', coachUserIds)
    : { data: [] }
  const coachNameMap = new Map((coachProfiles ?? []).map(p => [p.user_id, p.display_name]))

  // Fetch user's active RSVPs to mark confirmed sessions
  const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id)
  const { data: userRsvps } = member && sessionIds.length > 0
    ? await supabase
        .from('session_rsvps')
        .select('session_id')
        .eq('member_id', member.id)
        .is('cancelled_at', null)
        .in('session_id', sessionIds)
    : { data: [] }

  const confirmedSessionIds = new Set((userRsvps ?? []).map((r: { session_id: string }) => r.session_id))

  // Fetch confirmed RSVP counts per session
  const { data: allRsvps } = sessionIds.length > 0
    ? await supabase
        .from('session_rsvps')
        .select('session_id, rsvp_type')
        .in('session_id', sessionIds)
        .eq('rsvp_type', 'confirmed')
        .is('cancelled_at', null)
    : { data: [] }

  const attendeeDataMap: Record<string, { confirmedCount: number; capacity: number | null; attendeePreview: Array<{ display_name: string | null; avatar_url: string | null }> }> = {}
  for (const s of (sessions ?? [])) {
    const id = s.id
    const confirmed = (allRsvps ?? []).filter(r => r.session_id === id)
    attendeeDataMap[id] = {
      confirmedCount: confirmed.length,
      capacity: (s as unknown as { capacity: number }).capacity ?? null,
      attendeePreview: [],
    }
  }

  // Fetch events the client is attending
  const { data: myEventRsvps } = member
    ? await supabase
        .from('event_rsvps')
        .select('event_id')
        .eq('member_id', member.id)
        .eq('rsvp_type', 'confirmed')
        .is('cancelled_at', null)
    : { data: [] }

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

  const taggedSessions = (sessions ?? []).map((s) => {
    const coachUserId = (s as unknown as { session_templates?: { coach?: { user_id?: string } } }).session_templates?.coach?.user_id
    return {
      ...s,
      _userConfirmed: confirmedSessionIds.has(s.id),
      _coachName: coachUserId ? coachNameMap.get(coachUserId) ?? null : null,
    }
  }) as unknown as Parameters<typeof WeekCalendarGrid>[0]['sessions']

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="px-5 pt-14 pb-24 max-w-6xl mx-auto">
          <Link
            href={`/c/${slug}/sessions`}
            className="flex items-center gap-2 mb-4 text-sm text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <h1 className="font-heading font-bold text-2xl text-foreground mb-4">Calendar</h1>

          <WeekCalendarGrid sessions={taggedSessions} linkPrefix={`/c/${slug}/sessions`} events={calendarEvents} attendeeData={attendeeDataMap} />
        </div>
      </div>
    </>
  )
}
