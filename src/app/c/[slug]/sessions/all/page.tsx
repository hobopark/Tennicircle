export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, ChevronLeft } from 'lucide-react'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'

function formatSessionDate(scheduledAt: string): string {
  const tz = 'Australia/Sydney'
  const date = new Date(scheduledAt)
  return date.toLocaleDateString('en-AU', {
    timeZone: tz, weekday: 'short', day: 'numeric', month: 'short',
  }) + ' · ' + date.toLocaleTimeString('en-AU', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default async function SessionsAllPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/auth')

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

  const now = new Date().toISOString()

  // Fetch all confirmed RSVPs for this member
  const { data: rsvpRows } = await supabase
    .from('session_rsvps')
    .select('session_id, rsvp_type')
    .eq('member_id', member.id)
    .is('cancelled_at', null)
    .eq('rsvp_type', 'confirmed')

  const sessionIds = (rsvpRows ?? []).map(r => r.session_id)

  const { data: allSessions } = sessionIds.length > 0
    ? await supabase
        .from('sessions')
        .select('id, scheduled_at, duration_minutes, venue, capacity, session_templates(title)')
        .in('id', sessionIds)
        .order('scheduled_at', { ascending: true })
    : { data: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const futureSessions = (allSessions ?? []).filter((s: any) => s.scheduled_at >= now)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pastSessions = (allSessions ?? []).filter((s: any) => s.scheduled_at < now).reverse()

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
          <Link
            href={`/c/${slug}/sessions`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="font-heading font-bold text-2xl text-foreground mb-6">Sessions</h1>

          {/* Future Lessons */}
          <div className="mb-8">
            <h2 className="font-heading font-bold text-base mb-3 text-primary">Upcoming Lessons</h2>
            {futureSessions.length > 0 ? (
              <div className="flex flex-col gap-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {futureSessions.map((s: any) => (
                  <Link
                    key={s.id}
                    href={`/c/${slug}/sessions/${s.id}`}
                    className="bg-primary/5 rounded-3xl border border-primary/20 p-4 active:scale-[0.98] transition-transform cursor-pointer block"
                  >
                    <h3 className="font-heading font-bold text-base mb-1">
                      {s.session_templates?.title ?? 'Session'}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>{formatSessionDate(s.scheduled_at)}</span>
                    </div>
                    {s.venue && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span>{s.venue}</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-3xl border border-border/50 p-6 text-center">
                <p className="text-sm text-muted-foreground">No upcoming lessons.</p>
              </div>
            )}
          </div>

          {/* Lesson History */}
          <div>
            <h2 className="font-heading font-bold text-base mb-3 text-muted-foreground">Lesson History</h2>
            {pastSessions.length > 0 ? (
              <div className="flex flex-col gap-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {pastSessions.map((s: any) => (
                  <Link
                    key={s.id}
                    href={`/c/${slug}/sessions/${s.id}`}
                    className="bg-card rounded-3xl border border-border/50 p-4 active:scale-[0.98] transition-transform cursor-pointer block opacity-80"
                  >
                    <h3 className="font-heading font-bold text-base mb-1">
                      {s.session_templates?.title ?? 'Session'}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>{formatSessionDate(s.scheduled_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-3xl border border-border/50 p-6 text-center">
                <p className="text-sm text-muted-foreground">No past lessons yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
