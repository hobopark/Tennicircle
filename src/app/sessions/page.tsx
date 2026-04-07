import { createClient } from '@/lib/supabase/server'
import { WeekCalendarGrid } from '@/components/calendar/WeekCalendarGrid'
import { AppNav } from '@/components/nav/AppNav'

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <>
        <AppNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Please sign in to view your sessions.</p>
        </div>
      </>
    )
  }

  // Fetch sessions visible to this client (RLS + invitation filtering)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*, session_rsvps(count), session_templates(title)')
    .order('scheduled_at', { ascending: true })

  // Get member ID for RSVP lookup
  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

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

  // Tag each session with rsvp status
  const taggedSessions = (sessions ?? []).map((s: { id: string }) => ({
    ...s,
    _userConfirmed: confirmedSessionIds.has(s.id),
  }))

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="font-display text-[28px] font-bold text-foreground mb-6">Your Sessions</h1>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <WeekCalendarGrid sessions={taggedSessions as any} linkPrefix="/sessions" />
        </div>
      </div>
    </>
  )
}
