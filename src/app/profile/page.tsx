import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { ProfileView } from '@/components/profile/ProfileView'
import { LessonHistory } from '@/components/profile/LessonHistory'
import { getLessonHistory } from '@/lib/actions/profiles'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'
import type { PlayerProfile, CoachAssessment } from '@/lib/types/profiles'
import type { UserRole } from '@/lib/types/auth'

export default async function ProfilePage() {
  const supabase = await createClient()

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const claims = await getJWTClaims(supabase)
  const communityId = claims.community_id
  if (!communityId) redirect('/auth')

  const userRole = (claims.user_role as UserRole) ?? 'pending'

  // Get community_members record for this user
  const { data: member } = await supabase
    .from('community_members')
    .select('id, joined_at, display_name')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle()

  // Fetch player profile
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle()

  // Redirect to setup if no profile exists
  if (!profile) redirect('/profile/setup')

  // Fetch latest coach assessment
  let coachAssessment: CoachAssessment | null = null
  if (member) {
    const { data: assessment } = await supabase
      .from('coach_assessments')
      .select('*')
      .eq('subject_member_id', member.id)
      .eq('community_id', communityId)
      .order('assessed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    coachAssessment = assessment as CoachAssessment | null
  }

  const memberId = member?.id ?? ''
  const isCoachOrAdmin = userRole === 'coach' || userRole === 'admin'

  // Fetch community players for coaches/admins
  // Join player_profiles via user_id to get display_name and avatar_url
  let communityPlayers: { id: string; display_name: string | null; avatar_url: string | null }[] = []
  if (isCoachOrAdmin) {
    const { data: members } = await supabase
      .from('community_members')
      .select('id, user_id, display_name, role')
      .eq('community_id', communityId)
      .neq('id', memberId)
      .in('role', ['client', 'member'])

    if (members && members.length > 0) {
      // Fetch player_profiles for these users to get their actual display names
      const userIds = members.map(m => m.user_id)
      const { data: profiles } = await supabase
        .from('player_profiles')
        .select('user_id, display_name, avatar_url')
        .eq('community_id', communityId)
        .in('user_id', userIds)

      const profileMap = new Map(
        (profiles ?? []).map(p => [p.user_id, p])
      )

      communityPlayers = members
        .map(m => {
          const profile = profileMap.get(m.user_id)
          return {
            id: m.id,
            display_name: profile?.display_name ?? m.display_name,
            avatar_url: profile?.avatar_url ?? null,
          }
        })
        .filter(p => p.display_name) // only show players who have set up profiles
        .sort((a, b) => (a.display_name ?? '').localeCompare(b.display_name ?? ''))
    }
  }

  // Fetch lesson history
  const historyResult = member
    ? await getLessonHistory(member.id, 20, 0)
    : null

  const lessonEntries = historyResult?.data?.entries ?? []
  const lessonSummary = historyResult?.data?.summary

  // Format member since as "Apr 2026"
  const memberSince = member?.joined_at
    ? new Intl.DateTimeFormat('en-AU', { month: 'short', year: 'numeric' }).format(
        new Date(member.joined_at)
      )
    : '—'

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <ProfileView
          profile={profile as PlayerProfile}
          coachAssessment={coachAssessment}
          isOwnProfile={true}
          viewerRole={userRole}
          profileRole={userRole}
          memberId={memberId}
          email={user.email ?? ''}
        />
        <div className="max-w-[640px] mx-auto px-5 pb-8">
          {/* Summary stats grid (players only — coaches see player count instead) */}
          {isCoachOrAdmin ? (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-card rounded-2xl border border-border/50 p-4 text-center">
                <p className="font-heading font-bold text-2xl text-foreground">
                  {communityPlayers.length}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Players
                </p>
              </div>
              <div className="bg-card rounded-2xl border border-border/50 p-4 text-center">
                <p className="font-heading font-bold text-2xl text-foreground">
                  {memberSince}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Member since
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-card rounded-2xl border border-border/50 p-4 text-center">
                <p className="font-heading font-bold text-2xl text-foreground">
                  {lessonSummary?.total_sessions ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Sessions attended
                </p>
              </div>
              <div className="bg-card rounded-2xl border border-border/50 p-4 text-center">
                <p className="font-heading font-bold text-2xl text-foreground">
                  {lessonSummary?.unique_coaches ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Coaches
                </p>
              </div>
              <div className="bg-card rounded-2xl border border-border/50 p-4 text-center">
                <p className="font-heading font-bold text-2xl text-foreground">
                  {memberSince}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Member since
                </p>
              </div>
            </div>
          )}

          {/* My Players section (coaches/admins only) */}
          {isCoachOrAdmin && communityPlayers.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
              <h2 className="font-heading font-bold text-base mb-3">
                My Players ({communityPlayers.length})
              </h2>
              <div className="flex flex-col gap-2">
                {communityPlayers.map(player => (
                  <Link
                    key={player.id}
                    href={`/profile/${player.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <InitialsAvatar name={player.display_name ?? 'Player'} size={36} />
                    <span className="text-sm font-medium text-foreground">
                      {player.display_name ?? 'Unnamed player'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <LessonHistory
            initialEntries={lessonEntries}
            memberId={memberId}
            isCoachViewing={false}
            totalCount={lessonSummary?.total_sessions ?? 0}
          />
        </div>
      </div>
    </>
  )
}
