import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Users } from 'lucide-react'
import { createClient, getUserRole } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'
import { formatAttendanceDate } from '@/lib/utils/dates'

export default async function ClientsPage({
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

  // Fetch community members who are clients
  // Coaches see only their assigned clients; admins see all
  let membersQuery = supabase
    .from('community_members')
    .select('id, user_id, display_name, role')
    .eq('community_id', community.id)
    .in('role', ['client', 'member'])
    .neq('id', memberId)

  if (role === 'coach') {
    membersQuery = membersQuery.eq('coach_id', memberId)
  }

  const { data: members } = await membersQuery

  // Get player profiles for display names and avatars
  const userIds = (members ?? []).map(m => m.user_id)
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('player_profiles')
        .select('user_id, display_name, avatar_url, self_skill_level')
        .eq('community_id', community.id)
        .in('user_id', userIds)
    : { data: [] }

  const profileMap = new Map(
    (profiles ?? []).map(p => [p.user_id, p])
  )

  // Get latest coach assessments for each member
  const memberIds = (members ?? []).map(m => m.id)
  const { data: assessments } = memberIds.length > 0
    ? await supabase
        .from('coach_assessments')
        .select('subject_member_id, skill_level, assessed_at')
        .eq('community_id', community.id)
        .in('subject_member_id', memberIds)
        .order('assessed_at', { ascending: false })
    : { data: [] }

  // Keep only the latest assessment per member
  const assessmentMap = new Map<string, { skill_level: string; assessed_at: string }>()
  for (const a of (assessments ?? [])) {
    if (!assessmentMap.has(a.subject_member_id)) {
      assessmentMap.set(a.subject_member_id, a)
    }
  }

  // Fetch attendance data: two-step approach
  const { data: rsvpData } = memberIds.length > 0
    ? await supabase
        .from('session_rsvps')
        .select('member_id, session_id')
        .in('member_id', memberIds)
        .eq('rsvp_type', 'confirmed')
        .is('cancelled_at', null)
    : { data: [] }

  const rsvpSessionIds = [...new Set((rsvpData ?? []).map(r => r.session_id))]
  const { data: sessionDates } = rsvpSessionIds.length > 0
    ? await supabase
        .from('sessions')
        .select('id, scheduled_at')
        .in('id', rsvpSessionIds)
    : { data: [] }

  const sessionDateMap = new Map((sessionDates ?? []).map(s => [s.id, s.scheduled_at]))

  const now = new Date().toISOString()
  const attendanceMap = new Map<string, { firstLesson: string | null; lastSession: string | null; nextSession: string | null }>()
  for (const rsvp of (rsvpData ?? [])) {
    const scheduledAt = sessionDateMap.get(rsvp.session_id)
    if (!scheduledAt) continue

    const existing = attendanceMap.get(rsvp.member_id)
    if (!existing) {
      attendanceMap.set(rsvp.member_id, {
        firstLesson: scheduledAt,
        lastSession: scheduledAt < now ? scheduledAt : null,
        nextSession: scheduledAt >= now ? scheduledAt : null,
      })
    } else {
      if (scheduledAt < existing.firstLesson!) existing.firstLesson = scheduledAt
      if (scheduledAt < now && (!existing.lastSession || scheduledAt > existing.lastSession)) existing.lastSession = scheduledAt
      if (scheduledAt >= now && (!existing.nextSession || scheduledAt < existing.nextSession)) {
        existing.nextSession = scheduledAt
      }
    }
  }

  const players = (members ?? [])
    .map(m => {
      const profile = profileMap.get(m.user_id)
      const assessment = assessmentMap.get(m.id)
      const attendance = attendanceMap.get(m.id)
      return {
        id: m.id,
        displayName: profile?.display_name ?? m.display_name ?? 'Unnamed',
        avatarUrl: profile?.avatar_url ?? null,
        selfLevel: profile?.self_skill_level ?? null,
        coachLevel: assessment?.skill_level ?? null,
        hasProfile: !!profile,
        firstLesson: attendance?.firstLesson ?? null,
        lastSession: attendance?.lastSession ?? null,
        nextSession: attendance?.nextSession ?? null,
      }
    })
    .filter(p => p.hasProfile)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
          <h1 className="font-heading font-bold text-2xl text-foreground mb-4">
            Players ({players.length})
          </h1>

          {players.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-8 h-8 text-muted mb-3" />
              <p className="font-heading font-bold text-base mb-1">No players yet</p>
              <p className="text-sm text-muted-foreground">
                Players will appear here once they&apos;ve set up their profiles.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {players.map(player => (
                <Link
                  key={player.id}
                  href={`/c/${slug}/members/${player.id}`}
                  className="bg-card rounded-2xl border border-border/50 p-4 active:scale-[0.98] transition-colors flex items-center gap-3"
                >
                  {/* Avatar */}
                  {player.avatarUrl ? (
                    <Image
                      src={player.avatarUrl}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                      alt={`${player.displayName}'s avatar`}
                      unoptimized
                    />
                  ) : (
                    <div className="flex-shrink-0">
                      <InitialsAvatar name={player.displayName} size={40} className="rounded-xl" />
                    </div>
                  )}

                  {/* Name + attendance */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {player.displayName}
                    </p>
                    {player.lastSession || player.nextSession ? (
                      <div className="flex flex-col mt-0.5">
                        {player.nextSession && (
                          <span className="text-[10px] font-bold text-primary">
                            Next session: {formatAttendanceDate(player.nextSession)}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          Last session: {player.lastSession ? formatAttendanceDate(player.lastSession) : 'None'}
                        </span>
                        {player.firstLesson && (
                          <span className="text-[10px] text-muted-foreground">
                            First lesson: {formatAttendanceDate(player.firstLesson)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">No sessions yet</span>
                    )}
                  </div>

                  {/* Navigation affordance */}
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
