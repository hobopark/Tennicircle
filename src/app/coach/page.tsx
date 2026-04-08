import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { WeekCalendarGrid } from '@/components/calendar/WeekCalendarGrid'
import { AppNav } from '@/components/nav/AppNav'

export default async function CoachPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get member ID for this coach
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
      .select('session_id, rsvp_type, member:community_members(display_name, avatar_url)')
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
        avatar_url: a.member?.avatar_url ?? null,
      }))

      attendeeDataMap[id] = {
        confirmedCount,
        capacity: (session.capacity as number) ?? null,
        attendeePreview,
      }
    }
  }

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-5 pt-14 pb-24">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-heading font-bold text-2xl text-foreground">Schedule</h1>
            <Link
              href="/coach/sessions/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Create session
            </Link>
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <WeekCalendarGrid sessions={sessions as any} attendeeData={attendeeDataMap} />
        </div>
      </div>
    </>
  )
}
