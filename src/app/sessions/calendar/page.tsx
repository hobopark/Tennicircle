import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { WeekCalendarGrid } from '@/components/calendar/WeekCalendarGrid'

export default async function SessionsCalendarPage() {
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

  const taggedSessions = (sessions ?? []).map((s: { id: string }) => ({
    ...s,
    _userConfirmed: confirmedSessionIds.has(s.id),
  }))

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
          {/* Back to Dashboard link */}
          <Link
            href="/sessions"
            className="flex items-center gap-2 mb-4 text-sm text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <h1 className="font-heading font-bold text-2xl text-foreground mb-4">Calendar</h1>

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <WeekCalendarGrid sessions={taggedSessions as any} linkPrefix="/sessions" />
        </div>
      </div>
    </>
  )
}
