'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

// Returns all communities the current user is a member of, with role and slug.
// Used by /communities page and community switcher.
export async function getUserCommunities(): Promise<{
  success: boolean
  data?: Array<{ community: { id: string; name: string; slug: string; description: string | null }; role: string; memberId: string }>
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('community_members')
    .select('id, role, communities(id, name, slug, description)')
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  const result = (data ?? []).map((row) => ({
    community: row.communities as unknown as { id: string; name: string; slug: string; description: string | null },
    role: row.role,
    memberId: row.id,
  }))

  return { success: true, data: result }
}

// Returns community data by slug. Used by /c/[slug]/layout.tsx.
export async function getCommunityBySlug(slug: string): Promise<{
  success: boolean
  data?: { id: string; name: string; slug: string; description: string | null; created_at: string }
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('communities')
    .select('id, name, slug, description, created_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!data) return { success: false, error: 'Community not found' }

  return { success: true, data }
}

// Admin-only: creates a new community and makes the creator the first admin member.
// Auto-generates slug from name; handles slug collisions by appending -2, -3, etc. (D-36)
export async function createCommunity(
  name: string,
  description?: string
): Promise<{ success: boolean; data?: { id: string; slug: string }; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Generate base slug
  let slug = generateSlug(name)
  if (!slug) return { success: false, error: 'Invalid community name' }

  // Handle slug collisions
  let attempt = 0
  let finalSlug = slug
  while (true) {
    const { data: existing } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle()

    if (!existing) break
    attempt++
    finalSlug = `${slug}-${attempt + 1}`
  }

  // Use service client — no INSERT policy on communities, and community_members
  // INSERT requires admin membership which doesn't exist yet for a new community
  const serviceClient = createServiceClient()

  const { data: community, error: communityError } = await serviceClient
    .from('communities')
    .insert({ name, slug: finalSlug, description: description ?? null })
    .select('id, slug')
    .single()

  if (communityError || !community) {
    return { success: false, error: communityError?.message ?? 'Failed to create community' }
  }

  // Creator becomes the first admin member (D-36)
  const { error: memberError } = await serviceClient
    .from('community_members')
    .insert({
      community_id: community.id,
      user_id: user.id,
      role: 'admin',
    })

  if (memberError) {
    return { success: false, error: memberError.message }
  }

  revalidatePath('/communities')
  return { success: true, data: { id: community.id, slug: community.slug } }
}

// Inserts a pending join request for the current user.
// Returns error if already a member or already has a pending request.
export async function requestToJoin(
  communityId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Check if already a member
  const { data: existing } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle()

  if (existing) return { success: false, error: 'Already a member of this community' }

  const { error } = await supabase
    .from('join_requests')
    .insert({ community_id: communityId, user_id: user.id, status: 'pending' })

  if (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return { success: false, error: 'You already have a pending request for this community' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/communities')
  return { success: true }
}

// Deletes the user's own pending join request.
export async function cancelJoinRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('join_requests')
    .delete()
    .eq('id', requestId)
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (error) return { success: false, error: error.message }

  revalidatePath('/communities')
  return { success: true }
}

// Approves a join request: checks caller is admin/coach, creates community_members row,
// auto-copies global profile to community-specific profile, sends join_approved notification.
export async function approveJoinRequest(
  requestId: string,
  communitySlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Fetch the request
  const { data: request, error: fetchError } = await supabase
    .from('join_requests')
    .select('id, community_id, user_id, status')
    .eq('id', requestId)
    .eq('status', 'pending')
    .maybeSingle()

  if (fetchError || !request) {
    return { success: false, error: 'Request not found or already resolved' }
  }

  // Verify caller is admin/coach in that community
  const { data: callerMember } = await supabase
    .from('community_members')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('community_id', request.community_id)
    .maybeSingle()

  if (!callerMember || !['admin', 'coach'].includes(callerMember.role)) {
    return { success: false, error: 'Only admins and coaches can approve join requests' }
  }

  const serviceClient = createServiceClient()
  const now = new Date().toISOString()

  // Update request status
  const { error: updateError } = await serviceClient
    .from('join_requests')
    .update({ status: 'approved', resolved_at: now, resolved_by: user.id })
    .eq('id', requestId)

  if (updateError) return { success: false, error: updateError.message }

  // Create community membership with client role (D-39: approved always get client role)
  const { data: newMember, error: memberError } = await serviceClient
    .from('community_members')
    .insert({
      community_id: request.community_id,
      user_id: request.user_id,
      role: 'client',
    })
    .select('id')
    .single()

  if (memberError) return { success: false, error: memberError.message }

  // Auto-copy global profile to community-specific profile (D-15 support)
  // Ensures the new member's name/avatar appear in the community roster immediately.
  const { data: globalProfile } = await serviceClient
    .from('player_profiles')
    .select('display_name, phone, bio, avatar_url, self_skill_level, utr, coaching_bio')
    .eq('user_id', request.user_id)
    .is('community_id', null)
    .maybeSingle()

  if (globalProfile) {
    await serviceClient.from('player_profiles').insert({
      community_id: request.community_id,
      user_id: request.user_id,
      ...globalProfile,
    })
  }

  // Send join_approved notification (D-44)
  await serviceClient.from('notifications').insert({
    community_id: request.community_id,
    member_id: newMember.id,
    notification_type: 'join_approved',
    title: 'Welcome to the community!',
    body: "You've been accepted! Tap to visit your new community.",
    metadata: { community_slug: communitySlug },
  })

  revalidatePath(`/c/${communitySlug}/coach/clients`)
  revalidatePath('/communities')
  return { success: true }
}

// Rejects a join request: checks caller is admin/coach, updates status, sends notification.
export async function rejectJoinRequest(
  requestId: string,
  communitySlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Fetch the request
  const { data: request, error: fetchError } = await supabase
    .from('join_requests')
    .select('id, community_id, user_id, status')
    .eq('id', requestId)
    .eq('status', 'pending')
    .maybeSingle()

  if (fetchError || !request) {
    return { success: false, error: 'Request not found or already resolved' }
  }

  // Verify caller is admin/coach
  const { data: callerMember } = await supabase
    .from('community_members')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('community_id', request.community_id)
    .maybeSingle()

  if (!callerMember || !['admin', 'coach'].includes(callerMember.role)) {
    return { success: false, error: 'Only admins and coaches can reject join requests' }
  }

  const serviceClient = createServiceClient()
  const now = new Date().toISOString()

  const { error: updateError } = await serviceClient
    .from('join_requests')
    .update({ status: 'rejected', resolved_at: now, resolved_by: user.id })
    .eq('id', requestId)

  if (updateError) return { success: false, error: updateError.message }

  // Find the rejected user's community member id IF they somehow have one (shouldn't, but safety)
  // For join_rejected notification we need to find if they have any membership — they don't yet.
  // So we look up their global profile or send a direct user-targeted notification.
  // Since notifications require a member_id, we can only send if a member row exists.
  // If no member row exists (correct state after rejection), skip the notification.
  const { data: rejectedMember } = await serviceClient
    .from('community_members')
    .select('id')
    .eq('user_id', request.user_id)
    .eq('community_id', request.community_id)
    .maybeSingle()

  if (rejectedMember) {
    // Edge case: they somehow have a member row — send notification
    await serviceClient.from('notifications').insert({
      community_id: request.community_id,
      member_id: rejectedMember.id,
      notification_type: 'join_rejected',
      title: 'Join request not approved',
      body: 'Your request to join was not approved.',
      metadata: {},
    })
  }

  revalidatePath(`/c/${communitySlug}/coach/clients`)
  revalidatePath('/communities')
  return { success: true }
}

// Returns pending join requests with user profile data. Used by coach/admin roster page.
export async function getPendingRequests(
  communityId: string
): Promise<{
  success: boolean
  data?: Array<{
    id: string
    user_id: string
    created_at: string
    display_name: string | null
    avatar_url: string | null
  }>
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('join_requests')
    .select('id, user_id, created_at')
    .eq('community_id', communityId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return { success: false, error: error.message }

  if (!data || data.length === 0) return { success: true, data: [] }

  // Fetch global profiles for the requestors (community_id IS NULL = global profile)
  const userIds = data.map((r) => r.user_id)
  const { data: profiles } = await supabase
    .from('player_profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', userIds)
    .is('community_id', null)

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]))

  const result = data.map((req) => {
    const profile = profileMap.get(req.user_id)
    return {
      id: req.id,
      user_id: req.user_id,
      created_at: req.created_at,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    }
  })

  return { success: true, data: result }
}

// Returns all communities the user has NOT joined and does NOT have a pending request for.
// Includes member count. Used by the Browse Communities section on /communities page.
export async function getBrowseCommunities(): Promise<{
  success: boolean
  data?: Array<{
    id: string
    name: string
    slug: string
    description: string | null
    member_count: number
  }>
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get communities the user is already a member of
  const { data: memberships } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', user.id)

  const joinedIds = (memberships ?? []).map((m) => m.community_id)

  // Get communities the user has a pending request for
  const { data: requests } = await supabase
    .from('join_requests')
    .select('community_id')
    .eq('user_id', user.id)
    .eq('status', 'pending')

  const pendingIds = (requests ?? []).map((r) => r.community_id)

  const excludedIds = [...new Set([...joinedIds, ...pendingIds])]

  // Fetch all communities not in the excluded list
  let query = supabase
    .from('communities')
    .select('id, name, slug, description')
    .order('name', { ascending: true })

  if (excludedIds.length > 0) {
    query = query.not('id', 'in', `(${excludedIds.join(',')})`)
  }

  const { data: communities, error } = await query

  if (error) return { success: false, error: error.message }
  if (!communities || communities.length === 0) return { success: true, data: [] }

  // Fetch member counts for each community
  const { data: counts } = await supabase
    .from('community_members')
    .select('community_id')
    .in('community_id', communities.map((c) => c.id))

  const countMap = new Map<string, number>()
  for (const row of counts ?? []) {
    countMap.set(row.community_id, (countMap.get(row.community_id) ?? 0) + 1)
  }

  const result = communities.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    member_count: countMap.get(c.id) ?? 0,
  }))

  return { success: true, data: result }
}
