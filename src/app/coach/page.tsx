import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, Plus, Calendar, MapPin } from 'lucide-react'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { AnnouncementCard } from '@/components/events/AnnouncementCard'
import type { EventWithRsvpStatus } from '@/lib/types/events'

function formatSessionDateTime(scheduledAt: string): string {
  const date = new Date(scheduledAt)
  return date.toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  }) + ' · ' + date.toLocaleTimeString('en-AU', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default async function CoachDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const claims = await getJWTClaims(supabase)
  const communityId = claims.community_id
  const userRole = claims.user_role ?? 'pending'
  if (userRole !== 'coach' && userRole !== 'admin') redirect('/sessions')

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

  const coachName = member.display_name ?? user.email?.split('@')[0] ?? 'Coach'
  const firstName = coachName.split(' ')[0]
  const now = new Date().toISOString()

  // Stats: sessions this month
  const { data: templateIds } = await supabase
    .from('session_templates')
    .select('id')
    .eq('coach_id', member.id)

  const currentMonthStart = new Date()
  currentMonthStart.setDate(1)
  currentMonthStart.setHours(0, 0, 0, 0)
  const nextMonthStart = new Date(currentMonthStart)
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1)

  const { count: sessionsThisMonth } = templateIds && templateIds.length > 0
    ? await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .in('template_id', templateIds.map(t => t.id))
        .gte('scheduled_at', currentMonthStart.toISOString())
        .lt('scheduled_at', nextMonthStart.toISOString())
    : { count: 0 }

  // Stats: total players
  const { count: playerCount } = communityId
    ? await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .in('role', ['client', 'member'])
    : { count: 0 }

  // Stats: upcoming events
  const { count: upcomingEventCount } = communityId
    ? await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .is('cancelled_at', null)
        .gte('starts_at', now)
    : { count: 0 }

  // Upcoming sessions (next 5)
  const { data: upcomingSessionRows } = templateIds && templateIds.length > 0
    ? await supabase
        .from('sessions')
        .select('id, scheduled_at, duration_minutes, venue, capacity, session_templates(title)')
        .in('template_id', templateIds.map(t => t.id))
        .gte('scheduled_at', now)
        .is('cancelled_at', null)
        .order('scheduled_at', { ascending: true })
        .limit(5)
    : { data: [] }

  // Upcoming events (next 3)
  const { data: upcomingEvents } = communityId
    ? await supabase
        .from('events')
        .select('*, creator:community_members!created_by(display_name)')
        .eq('community_id', communityId)
        .is('cancelled_at', null)
        .gte('starts_at', now)
        .order('starts_at', { ascending: true })
        .limit(3)
    : { data: [] }

  // Announcements
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
        <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
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
              <p className="font-heading font-bold text-2xl text-primary">{sessionsThisMonth ?? 0}</p>
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

          {/* Upcoming Sessions */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-bold text-base">Upcoming Sessions</h2>
              <Link href="/coach/schedule" className="text-sm text-primary flex items-center gap-1">
                Schedule <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {(upcomingSessionRows ?? []).length > 0 ? (
              <div className="flex flex-col gap-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(upcomingSessionRows ?? []).map((s: any) => (
                  <Link
                    key={s.id}
                    href={`/coach/sessions/${s.id}`}
                    className="bg-card rounded-3xl border border-border/50 p-4 active:scale-[0.98] transition-transform cursor-pointer block"
                  >
                    <h3 className="font-heading font-bold text-base mb-1">
                      {s.session_templates?.title ?? 'Session'}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>{formatSessionDateTime(s.scheduled_at)}</span>
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
                <p className="font-heading font-bold text-base mb-1">No upcoming sessions</p>
                <p className="text-sm text-muted-foreground">Create a session to get started.</p>
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-bold text-base">Upcoming Events</h2>
              <Link href="/events" className="text-sm text-primary flex items-center gap-1">
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {(upcomingEvents ?? []).length > 0 ? (
              <div className="flex flex-col gap-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(upcomingEvents ?? []).map((e: any) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    className="bg-card rounded-3xl border border-border/50 p-4 active:scale-[0.98] transition-transform cursor-pointer block"
                  >
                    <h3 className="font-heading font-bold text-base">{e.title}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>{formatSessionDateTime(e.starts_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-3xl border border-border/50 p-6 text-center">
                <p className="font-heading font-bold text-base mb-1">Nothing coming up</p>
                <p className="text-sm text-muted-foreground">Events will appear here.</p>
              </div>
            )}
          </div>

          {/* Announcements */}
          {(announcements ?? []).length > 0 && (
            <div className="mb-6">
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
