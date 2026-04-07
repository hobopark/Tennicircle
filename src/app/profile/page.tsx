import { redirect } from 'next/navigation'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { ProfileView } from '@/components/profile/ProfileView'
import { LessonHistory } from '@/components/profile/LessonHistory'
import { getLessonHistory } from '@/lib/actions/profiles'
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
          {/* Summary stats grid */}
          {isCoachOrAdmin ? (
            <div className="grid grid-cols-1 gap-3 mb-6">
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
