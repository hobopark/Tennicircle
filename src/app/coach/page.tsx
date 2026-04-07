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

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-[28px] font-bold text-foreground">Schedule</h1>
            <Link
              href="/coach/sessions/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Create session
            </Link>
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <WeekCalendarGrid sessions={sessions as any} />
        </div>
      </div>
    </>
  )
}
