export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, getUserRole } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import type { MemberCardData } from '@/components/members/MemberCard'
import { InviteButton } from '@/components/members/InviteButton'
import { getPendingRequests } from '@/lib/actions/communities'
import { RosterClientWrapper } from '@/app/c/[slug]/coach/clients/RosterClientWrapper'

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

  // Fetch pending join requests for coaches/admins
  const { data: pendingRequests } = await getPendingRequests(community.id)

  // Fetch ALL community members (admins see everyone, coaches see everyone too for roster)
  const { data: members } = await supabase
    .from('community_members')
    .select('id, user_id, display_name, role')
    .eq('community_id', community.id)

  // Get player profiles for display names and avatars
  const userIds = (members ?? []).map(m => m.user_id)
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('player_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds)
    : { data: [] }

  const profileMap = new Map(
    (profiles ?? []).map(p => [p.user_id, p])
  )

  // Fetch coach assignments to show "Coach: X" on client cards
  const { data: assignments } = await supabase
    .from('coach_client_assignments')
    .select('coach_member_id, client_member_id')
    .eq('community_id', community.id)

  // Build coach name lookup
  const coachMemberIds = [...new Set((assignments ?? []).map(a => a.coach_member_id))]
  const coachNameMap = new Map<string, string>()
  for (const m of (members ?? [])) {
    if (coachMemberIds.includes(m.id)) {
      const profile = profileMap.get(m.user_id)
      coachNameMap.set(m.id, profile?.display_name ?? m.display_name ?? 'Coach')
    }
  }

  // Build per-member assigned coach names + isAssignedToMe
  const memberCoachMap = new Map<string, { names: string[]; assignedToMe: boolean }>()
  for (const a of (assignments ?? [])) {
    const existing = memberCoachMap.get(a.client_member_id) ?? { names: [], assignedToMe: false }
    const coachName = coachNameMap.get(a.coach_member_id) ?? 'Coach'
    existing.names.push(coachName)
    if (a.coach_member_id === memberId) existing.assignedToMe = true
    memberCoachMap.set(a.client_member_id, existing)
  }

  // Fetch last session attendance per member
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

  // Build MemberCardData array
  const memberCards: MemberCardData[] = (members ?? [])
    .map(m => {
      const profile = profileMap.get(m.user_id)
      const coachInfo = memberCoachMap.get(m.id)
      return {
        id: m.id,
        displayName: profile?.display_name ?? m.display_name ?? 'Unnamed',
        avatarUrl: profile?.avatar_url ?? null,
        role: m.role as Exclude<typeof m.role, 'pending'>,
        hasProfile: !!profile,
        lastSession: lastSessionMap.get(m.id) ?? null,
        assignedCoachNames: coachInfo?.names ?? [],
        isAssignedToMe: coachInfo?.assignedToMe ?? false,
      }
    })
    .sort((a, b) => {
      // Sort: admins first, then coaches, then clients
      const roleOrder = { admin: 0, coach: 1, client: 2 }
      const ra = roleOrder[a.role] ?? 3
      const rb = roleOrder[b.role] ?? 3
      if (ra !== rb) return ra - rb
      return a.displayName.localeCompare(b.displayName)
    })

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-heading font-bold text-2xl text-foreground">
              Members ({memberCards.length})
            </h1>
            <InviteButton userRole={role} />
          </div>

          <RosterClientWrapper
            pendingRequests={pendingRequests ?? []}
            communitySlug={slug}
            allMembers={memberCards}
            currentMemberId={memberId}
          />
        </div>
      </div>
    </>
  )
}
