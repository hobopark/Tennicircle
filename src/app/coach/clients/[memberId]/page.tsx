export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { ProfileView } from '@/components/profile/ProfileView'
import { LessonHistory } from '@/components/profile/LessonHistory'
import { getLessonHistory } from '@/lib/actions/profiles'
import type { PlayerProfile, CoachAssessment } from '@/lib/types/profiles'
import type { UserRole } from '@/lib/types/auth'

interface PageProps {
  params: Promise<{ memberId: string }>
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { memberId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const claims = await getJWTClaims(supabase)
  const communityId = claims.community_id
  if (!communityId) redirect('/auth')

  const viewerRole = (claims.user_role as UserRole) ?? 'pending'
  if (viewerRole !== 'admin' && viewerRole !== 'coach') redirect('/sessions')

  // Fetch target member
  const { data: targetMember } = await supabase
    .from('community_members')
    .select('id, user_id, joined_at, display_name')
    .eq('id', memberId)
    .eq('community_id', communityId)
    .maybeSingle()

  if (!targetMember) notFound()

  // Fetch player profile
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('user_id', targetMember.user_id)
    .eq('community_id', communityId)
    .maybeSingle()

  if (!profile) notFound()

  // Fetch latest coach assessment
  const { data: assessment } = await supabase
    .from('coach_assessments')
    .select('*')
    .eq('subject_member_id', memberId)
    .eq('community_id', communityId)
    .order('assessed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fetch lesson history
  const historyResult = await getLessonHistory(memberId, 20, 0)
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
        <div className="max-w-[640px] mx-auto px-5 pt-14">
          <Link
            href="/coach/clients"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Clients
          </Link>
        </div>

        <ProfileView
          profile={profile as PlayerProfile}
          coachAssessment={assessment as CoachAssessment | null}
          isOwnProfile={false}
          viewerRole={viewerRole}
          memberId={memberId}
          email=""
        />

        <div className="max-w-[640px] mx-auto px-5 pb-24">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-primary/10 rounded-2xl border border-primary/20 p-4 text-center">
              <p className="font-heading font-bold text-2xl text-primary">
                {lessonSummary?.total_sessions ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sessions attended</p>
            </div>
            <div className="bg-emerald-500/10 rounded-2xl border border-emerald-500/20 p-4 text-center">
              <p className="font-heading font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                {lessonSummary?.unique_coaches ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Coaches</p>
            </div>
            <div className="bg-amber-500/10 rounded-2xl border border-amber-500/20 p-4 text-center">
              <p className="font-heading font-bold text-2xl text-amber-600 dark:text-amber-400">
                {memberSince}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Member since</p>
            </div>
          </div>

          <LessonHistory
            initialEntries={lessonEntries}
            memberId={memberId}
            isCoachViewing={true}
            totalCount={lessonSummary?.total_sessions ?? 0}
          />
        </div>
      </div>
    </>
  )
}
