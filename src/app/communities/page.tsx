import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCommunities, getBrowseCommunities } from '@/lib/actions/communities'
import { CommunitiesPageClient } from './CommunitiesPageClient'

export default async function CommunitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [communitiesResult, browseResult] = await Promise.all([
    getUserCommunities(),
    getBrowseCommunities(),
  ])

  const allMemberships = communitiesResult.data ?? []

  // Fetch member counts for my communities
  const communityIds = allMemberships.map((m) => m.community.id)
  const countMap = new Map<string, number>()

  if (communityIds.length > 0) {
    const { data: counts } = await supabase
      .from('community_members')
      .select('community_id')
      .in('community_id', communityIds)

    for (const row of counts ?? []) {
      countMap.set(row.community_id, (countMap.get(row.community_id) ?? 0) + 1)
    }
  }

  // Approved memberships (community members)
  const myCommunities = allMemberships.map((item) => ({
    community: item.community,
    role: item.role as 'admin' | 'coach' | 'client',
    memberId: item.memberId,
    memberCount: countMap.get(item.community.id) ?? 0,
  }))

  // Fetch pending join requests (communities the user is waiting to join)
  const { data: pendingRequests } = await supabase
    .from('join_requests')
    .select('id, community_id, communities(id, name, description)')
    .eq('user_id', user.id)
    .eq('status', 'pending')

  const pendingCommunityIds = (pendingRequests ?? []).map((r) => r.community_id)

  // Fetch member counts for pending communities
  const pendingCountMap = new Map<string, number>()
  if (pendingCommunityIds.length > 0) {
    const { data: pendingCounts } = await supabase
      .from('community_members')
      .select('community_id')
      .in('community_id', pendingCommunityIds)

    for (const row of pendingCounts ?? []) {
      pendingCountMap.set(row.community_id, (pendingCountMap.get(row.community_id) ?? 0) + 1)
    }
  }

  const pendingCommunities = (pendingRequests ?? []).map((req) => {
    const community = req.communities as unknown as { id: string; name: string; description: string | null }
    return {
      id: community.id,
      name: community.name,
      description: community.description,
      memberCount: pendingCountMap.get(community.id) ?? 0,
      requestId: req.id,
    }
  })

  const browseCommunities = browseResult.data ?? []

  const isAdmin = myCommunities.some((c) => c.role === 'admin')

  return (
    <CommunitiesPageClient
      myCommunities={myCommunities}
      pendingCommunities={pendingCommunities}
      browseCommunities={browseCommunities}
      isAdmin={isAdmin}
    />
  )
}
