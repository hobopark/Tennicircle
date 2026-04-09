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
  // Note: coach_id is deprecated (D-10) — use coach_client_assignments instead
  const { data: newMember, error: insertError } = await supabase
    .from('community_members')
    .insert({
      community_id: invite.community_id,
      user_id: userId,
      role: invite.role,
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.message.includes('duplicate')) {
      return { success: false, error: 'Already a member of this community' }
    }
    return { success: false, error: insertError.message }
  }

  // If invite role is 'client' and created_by is the inviting coach/admin,
  // create a coach-client assignment in the junction table (D-10)
  // RLS policy "users_insert_own_assignment" (from Plan 01 migration) allows
  // the new user to insert their own assignment where client_member_id = their member record
  if (invite.role === 'client' && newMember) {
    const { error: assignError } = await supabase
      .from('coach_client_assignments')
      .insert({
        community_id: invite.community_id,
        coach_member_id: invite.created_by,
        client_member_id: newMember.id,
      })

    if (assignError) {
      console.error('Failed to create coach-client assignment during invite sign-up:', assignError.message)
      // The membership itself was created successfully — log the assignment failure
      // but do not fail the overall sign-up. The coach can assign manually from the roster.
    }
  }

  return { success: true }
}

// MGMT-04: Auto-assign open sign-up users as client in the single community
export async function joinCommunityAsClient(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Check if already a community member
  const { data: existingMember } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingMember) return { success: false, error: 'Already a community member' }

  // MVP assumption: single community — fetch the one community
  const { data: community, error: communityError } = await supabase
    .from('communities')
    .select('id')
    .limit(1)
    .single()

  if (communityError || !community) {
    return { success: false, error: 'No community found' }
  }

  // Insert as client with no coach assignment
  // RLS policy "users_insert_own_membership" (from Plan 01 migration) allows self-insert
  const { error: insertError } = await supabase
    .from('community_members')
    .insert({
      community_id: community.id,
      user_id: user.id,
      role: 'client',
    })

  if (insertError) {
    if (insertError.message.includes('duplicate')) {
      return { success: false, error: 'Already a community member' }
    }
    return { success: false, error: insertError.message }
  }

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
