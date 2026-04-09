'use server'

import { createClient, getJWTClaims } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types/auth'

// AUTH-04: Admin can update a community member's role
export async function updateMemberRole(
  memberId: string,
  newRole: Exclude<UserRole, 'pending'>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verify current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  if (claims.user_role !== 'admin') return { success: false, error: 'Only admins can update roles' }

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

// MGMT-06 + D-09: Coach assigns a client to themselves
export async function assignClient(
  clientMemberId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  if (claims.user_role !== 'coach' && claims.user_role !== 'admin') {
    return { success: false, error: 'Only coaches and admins can assign clients' }
  }
  if (!claims.community_id) {
    return { success: false, error: 'No community associated with your account' }
  }

  // Get the current user's community_members record
  const { data: selfMember } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', claims.community_id)
    .single()

  if (!selfMember) return { success: false, error: 'Member record not found' }

  const { error } = await supabase
    .from('coach_client_assignments')
    .insert({
      community_id: claims.community_id,
      coach_member_id: selfMember.id,
      client_member_id: clientMemberId,
    })

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { success: false, error: 'Client is already assigned to you' }
    }
    return { success: false, error: error.message }
  }
  return { success: true }
}

// MGMT-06 + D-09: Coach removes a client from their own list
export async function removeClientAssignment(
  clientMemberId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  if (claims.user_role !== 'coach' && claims.user_role !== 'admin') {
    return { success: false, error: 'Only coaches and admins can remove client assignments' }
  }
  if (!claims.community_id) {
    return { success: false, error: 'No community associated with your account' }
  }

  // Get the current user's community_members record
  const { data: selfMember } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', claims.community_id)
    .single()

  if (!selfMember) return { success: false, error: 'Member record not found' }

  const { error } = await supabase
    .from('coach_client_assignments')
    .delete()
    .eq('coach_member_id', selfMember.id)
    .eq('client_member_id', clientMemberId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Remove a member from the community (admin only)
export async function removeMember(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const removeClaims = await getJWTClaims(supabase)
  if (removeClaims.user_role !== 'admin') return { success: false, error: 'Only admins can remove members' }

  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('id', memberId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
