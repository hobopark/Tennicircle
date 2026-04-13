export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, Plus, Calendar, MapPin, Users, UserPlus } from 'lucide-react'

import { createClient, getUserRole, getCachedUser, getCachedCommunityBySlug } from '@/lib/supabase/server'
import { AnimatedSection } from '@/components/dashboard/AnimatedSection'
import { AppNav } from '@/components/nav/AppNav'
import { AnnouncementCard } from '@/components/events/AnnouncementCard'
import { InviteButton } from '@/components/members/InviteButton'
import { getPendingRequests } from '@/lib/actions/communities'
import { AdminPendingRequests } from './AdminPendingRequests'
import type { RawEventRow, RawAnnouncementRow } from '@/lib/types/events'
import type { SessionWithTemplate } from '@/lib/types/sessions'
import { formatSessionDateTime } from '@/lib/utils/dates'
import { EVENT_TYPE_BADGE } from '@/lib/constants/events'

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/auth')

  const community = await getCachedCommunityBySlug(slug)
  if (!community) redirect('/communities')

  const membership = await getUserRole(supabase, community.id)
  if (!membership) redirect('/communities')
  const { role, memberId } = membership

  if (role !== 'admin') redirect(`/c/${slug}/coach`)

  // Get admin display name
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle()
  const firstName = (profile?.display_name ?? user.email?.split('@')[0] ?? 'Admin').split(' ')[0]

  const now = new Date().toISOString()
  const currentMonthStart = new Date()
  currentMonthStart.setDate(1)
  currentMonthStart.setHours(0, 0, 0, 0)
  const nextMonthStart = new Date(currentMonthStart)
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1)

  // Fetch pending requests
  const { data: pendingRequests } = await getPendingRequests(community.id)

  // Get admin's own templates + co-coached sessions for "My Sessions"
  const [{ data: myTemplateIds }, { data: myCoCoachRows }] = await Promise.all([
    supabase.from('session_templates').select('id').eq('coach_id', memberId),
    supabase.from('session_coaches').select('session_id').eq('member_id', memberId),
  ])
  const myCoCoachSessionIds = (myCoCoachRows ?? []).map(r => r.session_id)

  // Get admin's event RSVPs
  const { data: myEventRsvps } = await supabase
    .from('event_rsvps')
    .select('event_id')
    .eq('member_id', memberId)
    .eq('rsvp_type', 'confirmed')
    .is('cancelled_at', null)
  const myEventIds = (myEventRsvps ?? []).map(r => r.event_id)

  // Parallelize all stats + data queries
  const [
    { data: allMembers },
    { data: allSessionsThisMonth },
    { count: upcomingEventCount },
    { data: myOwnedSessions },
    { data: myCoCoachSessions },
    { data: upcomingEvents },
    { data: rawAnnouncements },
  ] = await Promise.all([
    supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', community.id),
    // Stats: ALL community sessions this month
    supabase
      .from('sessions')
      .select('id')
      .eq('community_id', community.id)
      .gte('scheduled_at', currentMonthStart.toISOString())
      .lt('scheduled_at', nextMonthStart.toISOString())
      .is('cancelled_at', null),
    // Stats: ALL upcoming events count
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .is('cancelled_at', null)
      .gte('starts_at', now),
    // My Sessions: from own templates
    myTemplateIds && myTemplateIds.length > 0
      ? supabase
          .from('sessions')
          .select('id, scheduled_at, duration_minutes, venue, capacity, session_templates(title)')
          .in('template_id', myTemplateIds.map(t => t.id))
          .gte('scheduled_at', now)
          .is('cancelled_at', null)
          .order('scheduled_at', { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
    // My Sessions: co-coached
    myCoCoachSessionIds.length > 0
      ? supabase
          .from('sessions')
          .select('id, scheduled_at, duration_minutes, venue, capacity, session_templates(title)')
          .in('id', myCoCoachSessionIds)
          .gte('scheduled_at', now)
          .is('cancelled_at', null)
          .order('scheduled_at', { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
    // My Events: only ones I've RSVP'd to
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
    supabase
      .from('announcements')
      .select('*, author:community_members!created_by(display_name, user_id)')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  // Role breakdown
  const members = allMembers ?? []
  const adminCount = members.filter(m => m.role === 'admin').length
  const coachCount = members.filter(m => m.role === 'coach').length
  const clientCount = members.filter(m => m.role === 'client').length
  const sessionsThisMonth = allSessionsThisMonth?.length ?? 0

  // Deduplicate owned + co-coached sessions
  const seenIds = new Set<string>()
  const myUpcomingSessions: SessionWithTemplate[] = []
  for (const s of [...(myOwnedSessions ?? []), ...(myCoCoachSessions ?? [])] as unknown as SessionWithTemplate[]) {
    if (!seenIds.has(s.id)) {
      seenIds.add(s.id)
      myUpcomingSessions.push(s)
    }
  }
  myUpcomingSessions.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  const upcomingSessionRows = myUpcomingSessions.slice(0, 5)
  const mySessionCount = myUpcomingSessions.length
  const myEventCount = myEventIds.length

  // Resolve announcement author names from player_profiles
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
          <AnimatedSection delay={0}>
            <p className="text-sm text-muted-foreground">G&apos;day, {firstName}</p>
            <div className="flex items-center justify-between mb-4">
              <h1 className="font-heading font-bold text-2xl text-foreground">Admin Dashboard</h1>
              <InviteButton userRole="admin" />
            </div>
          </AnimatedSection>

          {/* Community stats */}
          <AnimatedSection delay={0.06}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Community</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Link href={`/c/${slug}/coach/clients`} className="bg-primary/10 rounded-2xl border border-primary/20 p-3 text-center shadow-[var(--shadow-card)] hover:bg-primary/15 transition-colors">
                <p className="font-heading font-bold text-2xl text-primary">{members.length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Members</p>
                <p className="text-[8px] text-muted-foreground">{adminCount}A · {coachCount}C · {clientCount}P</p>
              </Link>
              <div className="bg-stat-2/10 rounded-2xl border border-stat-2/20 p-3 text-center shadow-[var(--shadow-card)]">
                <p className="font-heading font-bold text-2xl text-stat-2">{sessionsThisMonth}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Sessions</p>
                <p className="text-[8px] text-muted-foreground">this month</p>
              </div>
              <div className="bg-stat-3/10 rounded-2xl border border-stat-3/20 p-3 text-center shadow-[var(--shadow-card)]">
                <p className="font-heading font-bold text-2xl text-stat-3">{upcomingEventCount ?? 0}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Events</p>
                <p className="text-[8px] text-muted-foreground">upcoming</p>
              </div>
              <Link href={`/c/${slug}/coach/clients`} className="bg-stat-4/10 rounded-2xl border border-stat-4/20 p-3 text-center shadow-[var(--shadow-card)] hover:bg-[hsl(271,65%,58%)]/15 transition-colors">
                <p className="font-heading font-bold text-2xl text-stat-4">{pendingRequests?.length ?? 0}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Pending</p>
                <p className="text-[8px] text-muted-foreground">requests</p>
              </Link>
            </div>
          </AnimatedSection>

          {/* My stats */}
          <AnimatedSection delay={0.12}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">My coaching</p>
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-primary/5 rounded-2xl border border-primary/10 p-3 text-center shadow-[var(--shadow-card)]">
                <p className="font-heading font-bold text-2xl text-primary">{mySessionCount}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">My sessions</p>
                <p className="text-[8px] text-muted-foreground">upcoming</p>
              </div>
              <div className="bg-stat-3/5 rounded-2xl border border-stat-3/10 p-3 text-center shadow-[var(--shadow-card)]">
                <p className="font-heading font-bold text-2xl text-stat-3">{myEventCount}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">My events</p>
                <p className="text-[8px] text-muted-foreground">attending</p>
              </div>
              <Link href={`/c/${slug}/coach/schedule`} className="bg-muted/50 rounded-2xl border border-border/50 p-3 text-center shadow-[var(--shadow-card)] hover:bg-muted transition-colors">
                <Calendar className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Schedule</p>
              </Link>
            </div>
          </AnimatedSection>

          {/* Pending Join Requests */}
          {(pendingRequests ?? []).length > 0 && (
            <AnimatedSection delay={0.18}>
              <AdminPendingRequests requests={pendingRequests ?? []} communitySlug={slug} />
            </AnimatedSection>
          )}

          {/* Quick Actions */}
          <AnimatedSection delay={0.24}>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Link
                href={`/c/${slug}/coach/sessions/new`}
                className="flex items-center gap-2 bg-card rounded-2xl border border-border/50 p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Create Session</span>
              </Link>
              <Link
                href={`/c/${slug}/coach/clients`}
                className="flex items-center gap-2 bg-card rounded-2xl border border-border/50 p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <Users className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Manage Members</span>
              </Link>
            </div>
          </AnimatedSection>

          {/* Upcoming Sessions — admin sees ALL sessions */}
          <AnimatedSection delay={0.30}>
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
                      className="bg-card rounded-2xl border border-border/50 p-4 shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform cursor-pointer block"
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
                <div className="bg-card rounded-2xl border border-border/50 p-6 text-center shadow-[var(--shadow-card)]">
                  <p className="font-heading font-bold text-base mb-1">No upcoming sessions</p>
                  <p className="text-sm text-muted-foreground">Sessions from all coaches will appear here.</p>
                </div>
              )}
            </div>
          </AnimatedSection>

          {/* Upcoming Events */}
          <AnimatedSection delay={0.36}>
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
                        className="bg-card rounded-2xl border border-border/50 p-4 shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform cursor-pointer block"
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
                <div className="bg-card rounded-2xl border border-border/50 p-6 text-center shadow-[var(--shadow-card)]">
                  <p className="font-heading font-bold text-base mb-1">No upcoming events</p>
                  <p className="text-sm text-muted-foreground">Community events will appear here.</p>
                </div>
              )}
            </div>
          </AnimatedSection>

          {/* Announcements */}
          <AnimatedSection delay={0.42}>
            <div className="mb-6">
              <h2 className="font-heading font-bold text-base mb-3">Recent Announcements</h2>
              {(announcements ?? []).length > 0 ? (
                <div className="flex flex-col gap-3">
                  {(announcements ?? []).map((announcement) => (
                    <AnnouncementCard
                      key={announcement.id}
                      announcement={announcement}
                      canEdit={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-2xl border border-border/50 p-6 text-center shadow-[var(--shadow-card)]">
                  <p className="font-heading font-bold text-base mb-1">No announcements</p>
                  <p className="text-sm text-muted-foreground">Post an announcement from the events page.</p>
                </div>
              )}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </>
  )
}
