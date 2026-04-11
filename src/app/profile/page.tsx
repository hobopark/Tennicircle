import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  // Look up any community membership to get role (use first one for own profile)
  // Profile page is global (D-04) — shows own profile, community-agnostic display
  const { data: memberRow } = await supabase
    .from('community_members')
    .select('id, joined_at, display_name, role, community_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const communityId = memberRow?.community_id ?? null
  const userRole = (memberRow?.role as UserRole) ?? 'client'

  // Fetch player profile (community-specific if available, or global)
  const { data: profile } = communityId
    ? await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('community_id', communityId)
        .maybeSingle()
    : await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

  // Redirect to setup if no profile exists
  if (!profile) redirect('/profile/setup')

  // Fetch latest coach assessment if we have a member record
  let coachAssessment: CoachAssessment | null = null
  if (memberRow && communityId) {
    const { data: assessment } = await supabase
      .from('coach_assessments')
      .select('*')
      .eq('subject_member_id', memberRow.id)
      .eq('community_id', communityId)
      .order('assessed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    coachAssessment = assessment as CoachAssessment | null
  }

  const memberId = memberRow?.id ?? ''
  const isCoachOrAdmin = userRole === 'coach' || userRole === 'admin'

  // Fetch lesson history (requires communityId)
  const historyResult = memberRow && communityId
    ? await getLessonHistory(communityId, memberRow.id, 20, 0)
    : null

  const lessonEntries = historyResult?.data?.entries ?? []
  const lessonSummary = historyResult?.data?.summary

  // Format member since as "Apr 2026"
  const memberSince = memberRow?.joined_at
    ? new Intl.DateTimeFormat('en-AU', { month: 'short', year: 'numeric' }).format(
        new Date(memberRow.joined_at)
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
            communityId={communityId ?? ''}
            memberId={memberId}
            isCoachViewing={false}
            totalCount={lessonSummary?.total_sessions ?? 0}
          />
        </div>
      </div>
    </>
  )
}
