import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import type { UserRole } from '@/lib/types/auth'
import { MemberCard } from '@/components/members/MemberCard'
import type { MemberCardData } from '@/components/members/MemberCard'
import { InviteButton } from '@/components/members/InviteButton'
import { RosterClientWrapper } from './RosterClientWrapper'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const params = await searchParams
  const viewMode = params.view === 'all-members' ? 'all-members' : 'my-clients'

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const claims = await getJWTClaims(supabase)
  const communityId = claims.community_id
  if (!communityId) redirect('/auth')

  const userRole = (claims.user_role as UserRole) ?? 'pending'
  if (userRole !== 'coach' && userRole !== 'admin') redirect('/sessions')

  // Get current user's member record
  const { data: selfMember } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle()

  // Fetch ALL community members (D-04: show all roles, not just clients)
  const { data: members } = await supabase
    .from('community_members')
    .select('id, user_id, display_name, role')
    .eq('community_id', communityId)
    .neq('id', selfMember?.id ?? '')

  // Fetch player profiles for display names and avatars
  const userIds = (members ?? []).map(m => m.user_id)
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('player_profiles')
        .select('user_id, display_name, avatar_url')
        .eq('community_id', communityId)
        .in('user_id', userIds)
    : { data: [] }

  const profileMap = new Map(
    (profiles ?? []).map(p => [p.user_id, p])
  )

  // Fetch all coach-client assignments in community (D-06: show coach names on cards)
  const { data: allAssignments } = await supabase
    .from('coach_client_assignments')
    .select('coach_member_id, client_member_id')
    .eq('community_id', communityId)

  // Build set of "my client" member IDs for the toggle filter
  const myClientIds = new Set(
    (allAssignments ?? [])
      .filter(a => a.coach_member_id === selfMember?.id)
      .map(a => a.client_member_id)
  )

  // Build map of client_member_id -> coach_member_ids for display
  const clientCoachMap = new Map<string, string[]>()
  for (const a of (allAssignments ?? [])) {
    const existing = clientCoachMap.get(a.client_member_id) ?? []
    existing.push(a.coach_member_id)
    clientCoachMap.set(a.client_member_id, existing)
  }

  // Get coach display names from members data
  const memberNameMap = new Map(
    (members ?? []).map(m => {
      const profile = profileMap.get(m.user_id)
      return [m.id, profile?.display_name ?? m.display_name ?? 'Unknown']
    })
  )
  // Add self to name map
  if (selfMember) {
    const selfProfileResult = await supabase
      .from('player_profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .maybeSingle()
    memberNameMap.set(selfMember.id, selfProfileResult.data?.display_name ?? 'You')
  }

  // Fetch attendance data (two-step RSVP pattern — established codebase pattern)
  const memberIds = (members ?? []).map(m => m.id)
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
  const lastSessionMap = new Map<string, string | null>()
  for (const rsvp of (rsvpData ?? [])) {
    const scheduledAt = sessionDateMap.get(rsvp.session_id)
    if (!scheduledAt || scheduledAt >= now) continue
    const existing = lastSessionMap.get(rsvp.member_id)
    if (!existing || scheduledAt > existing) {
      lastSessionMap.set(rsvp.member_id, scheduledAt)
    }
  }

  // Build member card data — NO .filter(p => p.hasProfile) (D-05/MGMT-07)
  const allMemberCards: MemberCardData[] = (members ?? [])
    .map(m => {
      const profile = profileMap.get(m.user_id)
      const coachMemberIds = clientCoachMap.get(m.id) ?? []
      const coachNames = coachMemberIds.map(cid => memberNameMap.get(cid) ?? 'Unknown')
      return {
        id: m.id,
        displayName: profile?.display_name ?? m.display_name ?? 'Unnamed',
        avatarUrl: profile?.avatar_url ?? null,
        role: m.role as Exclude<UserRole, 'pending'>,
        hasProfile: !!profile,
        lastSession: lastSessionMap.get(m.id) ?? null,
        assignedCoachNames: coachNames,
        isAssignedToMe: myClientIds.has(m.id),
      }
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  // Filter based on view mode for coaches
  const displayMembers = viewMode === 'my-clients' && (userRole === 'coach' || userRole === 'admin')
    ? allMemberCards.filter(m => m.isAssignedToMe)
    : allMemberCards

  const showToggle = userRole === 'coach' || userRole === 'admin'

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
          {/* Header with invite button */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-heading font-bold text-2xl text-foreground">
              Members ({displayMembers.length})
            </h1>
            <InviteButton userRole={userRole as Exclude<UserRole, 'pending'>} />
          </div>

          {/* Toggle for My clients / All members */}
          {showToggle && (
            <div className="mb-4">
              <RosterClientWrapper viewMode={viewMode as 'my-clients' | 'all-members'} />
            </div>
          )}

          {/* Member list */}
          {displayMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-8 h-8 text-muted mb-3" />
              <p className="font-heading font-bold text-base mb-1">
                {viewMode === 'my-clients' ? 'No clients assigned' : 'No members yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                {viewMode === 'my-clients'
                  ? 'Switch to "All members" to find and assign clients.'
                  : 'Members will appear here once they join the community.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {displayMembers.map(member => (
                <MemberCard
                  key={member.id}
                  member={member}
                  viewerRole={userRole as Exclude<UserRole, 'pending'>}
                  isSelf={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
