'use server'

import { createClient, getUserRole } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types/auth'

// AUTH-04: Admin can update a community member's role
export async function updateMemberRole(
  communityId: string,
  communitySlug: string,
  memberId: string,
  newRole: Exclude<UserRole, 'pending'>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verify current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }
  if (membership.role !== 'admin') return { success: false, error: 'Only admins can update roles' }

  // communitySlug accepted for API consistency (callers may revalidate after)
  void communitySlug

  const { error } = await supabase
    .from('community_members')
    .update({ role: newRole })
    .eq('id', memberId)

  if (error) return { success: false, error: error.message }
  return { success: true }
  // IMPORTANT: After this action returns { success: true }, the CALLER (client component)
  // must call `supabase.auth.refreshSession()` to force a new JWT with updated claims
  // from the Custom Access Token Hook. Without this, the user's role in the JWT remains
  // stale until the next natural token refresh (up to 1 hour).
}

// Process invite token after email verification — called from /auth/confirm
// NOTE: Uses createClient (not getUserRole) because this runs during signup flow
// before the user has a community membership. No communityId param needed — the
// invite link carries its own community_id.
export async function processInviteSignup(
  userId: string,
  inviteToken: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Look up the invite link
  const { data: invite, error: lookupError } = await supabase
    .from('invite_links')
    .select('*')
    .eq('token', inviteToken)
    .is('revoked_at', null)
    .single()

  if (lookupError || !invite) {
    return { success: false, error: 'Invalid or revoked invite link' }
  }

  // Create community membership with the role from the invite
  const { error: insertError } = await supabase
    .from('community_members')
    .insert({
      community_id: invite.community_id,
      user_id: userId,
      role: invite.role,
      // If invite role is 'client' and created_by is a coach, set coach_id (D-07)
      coach_id: invite.role === 'client' ? invite.created_by : null,
    })

  if (insertError) {
    if (insertError.message.includes('duplicate')) {
      return { success: false, error: 'Already a member of this community' }
    }
    return { success: false, error: insertError.message }
  }

  return { success: true }
}

// Remove a member from the community (admin only)
export async function removeMember(
  communityId: string,
  communitySlug: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }
  if (membership.role !== 'admin') return { success: false, error: 'Only admins can remove members' }

  void communitySlug

  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('id', memberId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Assign a client to the current coach/admin
export async function assignCoachToClient(
  communityId: string,
  communitySlug: string,
  clientMemberId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }
  if (membership.role !== 'coach' && membership.role !== 'admin') {
    return { success: false, error: 'Only coaches and admins can assign clients' }
  }

  const { error } = await supabase
    .from('coach_client_assignments')
    .insert({
      community_id: communityId,
      coach_member_id: membership.memberId,
      client_member_id: clientMemberId,
    })

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return { success: false, error: 'Already assigned to you' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath(`/c/${communitySlug}/coach/clients`)
  return { success: true }
}

// Remove a client from the current coach/admin
export async function removeCoachFromClient(
  communityId: string,
  communitySlug: string,
  clientMemberId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }
  if (membership.role !== 'coach' && membership.role !== 'admin') {
    return { success: false, error: 'Only coaches and admins can unassign clients' }
  }

  const { error } = await supabase
    .from('coach_client_assignments')
    .delete()
    .eq('community_id', communityId)
    .eq('coach_member_id', membership.memberId)
    .eq('client_member_id', clientMemberId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/c/${communitySlug}/coach/clients`)
  return { success: true }
}

// Join a community as a client (open sign-up flow — no invite).
// CRITICAL: communityId must be passed explicitly — never queried with .limit(1) (multi-tenant safe).
export async function joinCommunityAsClient(
  communityId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error: insertError } = await supabase
    .from('community_members')
    .insert({
      community_id: communityId,
      user_id: user.id,
      role: 'client',
      coach_id: null,
    })

  if (insertError) {
    if (insertError.message.includes('duplicate') || insertError.code === '23505') {
      return { success: false, error: 'Already a member of this community' }
    }
    return { success: false, error: insertError.message }
  }

  return { success: true }
}
