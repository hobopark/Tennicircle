export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, Plus, Calendar, MapPin } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { AnnouncementCard } from '@/components/events/AnnouncementCard'
import type { EventWithRsvpStatus, RawEventRow, RawAnnouncementRow } from '@/lib/types/events'
import type { SessionWithTemplate } from '@/lib/types/sessions'
import { formatSessionDateTime } from '@/lib/utils/dates'
import { EVENT_TYPE_BADGE } from '@/lib/constants/events'

export default async function CoachDashboardPage({
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

  const { data: member } = await supabase
    .from('community_members')
    .select('display_name')
    .eq('id', memberId)
    .single()

  const coachName = member?.display_name ?? user.email?.split('@')[0] ?? 'Coach'
  const firstName = coachName.split(' ')[0]
  const now = new Date().toISOString()

  // Fetch coach's templates and co-coached sessions
  const [{ data: templateIds }, { data: coCoachRows }] = await Promise.all([
    supabase.from('session_templates').select('id').eq('coach_id', memberId),
    supabase.from('session_coaches').select('session_id').eq('member_id', memberId),
  ])
  const coCoachSessionIds = (coCoachRows ?? []).map(r => r.session_id)

  const currentMonthStart = new Date()
  currentMonthStart.setDate(1)
  currentMonthStart.setHours(0, 0, 0, 0)
  const nextMonthStart = new Date(currentMonthStart)
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1)

  // Parallelize independent queries
  const [
    { data: ownedSessionsThisMonth },
    { data: coCoachSessionsThisMonth },
    { count: playerCount },
    { data: myEventRsvps },
    { data: rawSessionRows },
    { data: rawAnnouncements },
  ] = await Promise.all([
    templateIds && templateIds.length > 0
      ? supabase
          .from('sessions')
          .select('id')
          .in('template_id', templateIds.map(t => t.id))
          .gte('scheduled_at', currentMonthStart.toISOString())
          .lt('scheduled_at', nextMonthStart.toISOString())
          .is('cancelled_at', null)
      : Promise.resolve({ data: [], error: null }),
    coCoachSessionIds.length > 0
      ? supabase
          .from('sessions')
          .select('id')
          .in('id', coCoachSessionIds)
          .gte('scheduled_at', currentMonthStart.toISOString())
          .lt('scheduled_at', nextMonthStart.toISOString())
          .is('cancelled_at', null)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .in('role', ['client', 'member']),
    supabase
      .from('event_rsvps')
      .select('event_id')
      .eq('member_id', memberId)
      .eq('rsvp_type', 'confirmed')
      .is('cancelled_at', null),
    templateIds && templateIds.length > 0
      ? supabase
          .from('sessions')
          .select('id, scheduled_at, duration_minutes, venue, capacity, session_templates(title)')
          .in('template_id', templateIds.map(t => t.id))
          .gte('scheduled_at', now)
          .is('cancelled_at', null)
          .order('scheduled_at', { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('announcements')
      .select('*, author:community_members!created_by(display_name, user_id)')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  // Deduplicate owned + co-coached sessions this month
  const allSessionIdsThisMonth = new Set([
    ...(ownedSessionsThisMonth ?? []).map(s => s.id),
    ...(coCoachSessionsThisMonth ?? []).map(s => s.id),
  ])
  const sessionsThisMonth = allSessionIdsThisMonth.size

  // Fetch only events I've RSVP'd to
  const myEventIds = (myEventRsvps ?? []).map(r => r.event_id)
  const [{ count: upcomingEventCount }, { data: upcomingEvents }] = await Promise.all([
    myEventIds.length > 0
      ? supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .in('id', myEventIds)
          .is('cancelled_at', null)
          .gte('starts_at', now)
      : Promise.resolve({ count: 0, data: null, error: null }),
    myEventIds.length > 0
      ? supabase
          .from('events')
          .select('*, creator:community_members!created_by(display_name)')
          .in('id', myEventIds)
          .is('cancelled_at', null)
          .gte('starts_at', now)
          .order('starts_at', { ascending: true })
          .limit(3)
      : Promise.resolve({ data: [], error: null }),
  ])

  const upcomingSessionRows = (rawSessionRows ?? []) as unknown as SessionWithTemplate[]

  const annUserIds = (rawAnnouncements ?? []).map((a: RawAnnouncementRow) => a.author?.user_id).filter(Boolean)
  const { data: annProfiles } = annUserIds.length > 0
    ? await supabase.from('player_profiles').select('user_id, display_name').in('user_id', annUserIds)
    : { data: [] }
  const annNameMap = new Map((annProfiles ?? []).map(p => [p.user_id, p.display_name]))
  const announcements = (rawAnnouncements ?? []).map((a: RawAnnouncementRow) => ({
    ...a,
    author: { ...a.author, display_name: annNameMap.get(a.author?.user_id) ?? a.author?.display_name ?? null },
  }))

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
              href={`/c/${slug}/coach/sessions/new`}
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

          {/* Upcoming Sessions */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-bold text-base">Upcoming Sessions</h2>
              <Link href={`/c/${slug}/coach/schedule`} className="text-sm text-primary flex items-center gap-1">
                Schedule <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {upcomingSessionRows.length > 0 ? (
              <div className="flex flex-col gap-3">
                {upcomingSessionRows.map((s) => (
                  <Link
                    key={s.id}
                    href={`/c/${slug}/coach/sessions/${s.id}`}
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
              <Link href={`/c/${slug}/events`} className="text-sm text-primary flex items-center gap-1">
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {(upcomingEvents ?? []).length > 0 ? (
              <div className="flex flex-col gap-3">
                {(upcomingEvents ?? []).map((e: RawEventRow) => {
                  const badge = EVENT_TYPE_BADGE[e.event_type]
                  return (
                    <Link
                      key={e.id}
                      href={`/c/${slug}/events/${e.id}`}
                      className="bg-card rounded-3xl border border-border/50 p-4 active:scale-[0.98] transition-transform cursor-pointer block"
                    >
                      {badge && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${badge.className} inline-block mb-2`}>
                          {badge.label}
                        </span>
                      )}
                      <h3 className="font-heading font-bold text-base mb-1">{e.title}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>{formatSessionDateTime(e.starts_at)}</span>
                      </div>
                    </Link>
                  )
                })}
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
