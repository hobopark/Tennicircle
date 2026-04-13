export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient, getUserRole, getCachedUser, getCachedCommunityBySlug } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { ProfileView } from '@/components/profile/ProfileView'
import { LessonHistory } from '@/components/profile/LessonHistory'
import { getLessonHistory } from '@/lib/actions/profiles'
import type { PlayerProfile, CoachAssessment } from '@/lib/types/profiles'

interface PageProps {
  params: Promise<{ slug: string; memberId: string }>
}

export default async function MemberProfilePage({ params }: PageProps) {
  const { slug, memberId } = await params
  const supabase = await createClient()

  // Auth guard
  const user = await getCachedUser()
  if (!user) redirect('/auth')

  const community = await getCachedCommunityBySlug(slug)
  if (!community) redirect('/communities')

  const membership = await getUserRole(supabase, community.id)
  if (!membership) redirect('/communities')
  const { role: viewerRole } = membership

  // Role check: only admin or coach can view other members' profiles
  if (viewerRole !== 'admin' && viewerRole !== 'coach') {
    redirect(`/c/${slug}/sessions`)
  }

  // Fetch the target community_members record
  const { data: targetMember } = await supabase
    .from('community_members')
    .select('id, user_id, joined_at, display_name')
    .eq('id', memberId)
    .eq('community_id', community.id)
    .maybeSingle()

  if (!targetMember) notFound()

  // Fetch player profile for target user
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('user_id', targetMember.user_id)
    .eq('community_id', community.id)
    .maybeSingle()

  if (!profile) notFound()

  // Fetch latest coach assessment
  const { data: assessment } = await supabase
    .from('coach_assessments')
    .select('*')
    .eq('subject_member_id', memberId)
    .eq('community_id', community.id)
    .order('assessed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const coachAssessment = assessment as CoachAssessment | null

  // Fetch lesson history
  const historyResult = await getLessonHistory(community.id, memberId, 20, 0)
  const lessonEntries = historyResult?.data?.entries ?? []
  const lessonSummary = historyResult?.data?.summary

  const memberSince = targetMember.joined_at
    ? new Intl.DateTimeFormat('en-AU', { month: 'short', year: 'numeric' }).format(
        new Date(targetMember.joined_at)
      )
    : '—'

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <ProfileView
          profile={profile as PlayerProfile}
          coachAssessment={coachAssessment}
          isOwnProfile={false}
          viewerRole={viewerRole}
          memberId={memberId}
          email=""
        />
        <div className="max-w-[640px] mx-auto px-5 pb-8">
          {/* Summary stats grid */}
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

          <LessonHistory
            initialEntries={lessonEntries}
            communityId={community.id}
            memberId={memberId}
            isCoachViewing={true}
            totalCount={lessonSummary?.total_sessions ?? 0}
          />
        </div>
      </div>
    </>
  )
}
